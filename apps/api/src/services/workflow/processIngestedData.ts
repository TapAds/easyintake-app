import {
  computeDocumentEvidenceCompletenessScore,
  mergeEvidenceRequirements,
  runN400RuleEngine,
  type N400RuleEngineOutput,
} from "@easy-intake/shared";
import { prisma } from "../../db/prisma";

const ESCALATION_PHASES = new Set([
  "ESCALATED_LEGAL_REVIEW",
  "ESCALATED_CONFLICT",
  "ESCALATED",
]);

function parseDateOnly(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveNextWorkflowPhase(
  currentPhase: string,
  engine: N400RuleEngineOutput
): string {
  if (ESCALATION_PHASES.has(currentPhase)) {
    return currentPhase;
  }
  if (currentPhase === "CLOSED" || currentPhase === "AUDIT_READY") {
    return currentPhase;
  }
  if (engine.moralCharacter.requiresLegalReview) {
    return "ESCALATED_LEGAL_REVIEW";
  }
  if (engine.earlyFiling.preEligibleCollection) {
    return "PRE_ELIGIBLE_COLLECTION";
  }
  if (currentPhase === "PRE_ELIGIBLE_COLLECTION") {
    return "INITIAL_INTAKE";
  }
  return currentPhase;
}

async function appendWorkflowEvents(args: {
  workflowInstanceId: string;
  prevPhase: string;
  nextPhase: string;
  engine: N400RuleEngineOutput;
}): Promise<void> {
  const rows: { workflowInstanceId: string; type: string; payload: object }[] = [];

  if (args.prevPhase !== args.nextPhase) {
    rows.push({
      workflowInstanceId: args.workflowInstanceId,
      type: "PHASE_CHANGE",
      payload: { from: args.prevPhase, to: args.nextPhase },
    });
  }

  for (const t of args.engine.suggestedWorkflowEventTypes) {
    const payload =
      t === "ELIGIBILITY_GATES_UPDATED"
        ? {
            targetSubmissionDate: args.engine.earlyFiling.targetSubmissionDate,
            collectionAllowed: args.engine.earlyFiling.collectionAllowed,
            submitToUscisAllowed: args.engine.earlyFiling.submitToUscisAllowed,
          }
        : {};
    rows.push({
      workflowInstanceId: args.workflowInstanceId,
      type: t,
      payload,
    });
  }

  if (rows.length === 0) return;

  await prisma.workflowEvent.createMany({ data: rows });
}

/**
 * Channel-agnostic workflow pass for `uscis-n400`: rules engine, merged `requirementsJson`,
 * phase (incl. `PRE_ELIGIBLE_COLLECTION`), dates on `WorkflowInstance`, evidence score on session.
 * Does not downgrade `ESCALATED_*` phases.
 */
export async function processIngestedData(params: {
  intakeSessionId: string;
  configPackageId: string;
  sourceChannel?: string;
}): Promise<void> {
  if (params.configPackageId !== "uscis-n400") return;

  const session = await prisma.intakeSession.findUnique({
    where: { id: params.intakeSessionId },
    select: {
      fieldValues: true,
      workflowInstance: {
        select: {
          id: true,
          phase: true,
          requirementsJson: true,
        },
      },
    },
  });

  if (!session) return;

  const fv =
    session.fieldValues && typeof session.fieldValues === "object" && !Array.isArray(session.fieldValues)
      ? (session.fieldValues as Record<string, unknown>)
      : {};

  const engine = runN400RuleEngine(fv);
  const generated = [...engine.eligibilityGates, ...engine.evidenceRequired];
  const prevReq = session.workflowInstance?.requirementsJson ?? [];
  const merged = mergeEvidenceRequirements(prevReq, generated);

  const evidenceScore = computeDocumentEvidenceCompletenessScore(merged);

  const prevPhase = session.workflowInstance?.phase ?? "INITIAL_INTAKE";
  const nextPhase = resolveNextWorkflowPhase(prevPhase, engine);

  const targetDate = parseDateOnly(engine.earlyFiling.targetSubmissionDate);
  const residenceCompleteDate = parseDateOnly(engine.earlyFiling.continuousResidenceCompleteDate);

  const wf = await prisma.workflowInstance.upsert({
    where: { intakeSessionId: params.intakeSessionId },
    create: {
      intakeSessionId: params.intakeSessionId,
      phase: nextPhase,
      requirementsJson: merged as object,
      targetSubmissionDate: targetDate,
      continuousResidenceCompleteDate: residenceCompleteDate,
      lastIngestionAt: new Date(),
      lastChannel: params.sourceChannel ?? null,
      ...(engine.moralCharacter.requiresLegalReview
        ? {
            escalationReason: engine.moralCharacter.escalationReason,
            escalatedAt: new Date(),
          }
        : {}),
    },
    update: {
      phase: nextPhase,
      requirementsJson: merged as object,
      targetSubmissionDate: targetDate,
      continuousResidenceCompleteDate: residenceCompleteDate,
      lastIngestionAt: new Date(),
      lastChannel: params.sourceChannel ?? null,
      ...(engine.moralCharacter.requiresLegalReview
        ? {
            escalationReason: engine.moralCharacter.escalationReason,
            escalatedAt: new Date(),
          }
        : {}),
    },
  });

  await appendWorkflowEvents({
    workflowInstanceId: wf.id,
    prevPhase,
    nextPhase,
    engine,
  });

  await prisma.intakeSession.update({
    where: { id: params.intakeSessionId },
    data: { evidenceCompletenessScore: evidenceScore },
  });
}
