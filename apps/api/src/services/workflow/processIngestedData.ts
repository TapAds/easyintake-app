import {
  computeDocumentEvidenceCompletenessScore,
  mergeEvidenceRequirements,
  nextBestActionKind,
  runN400RuleEngine,
  type N400RuleEngineOutput,
} from "@easy-intake/shared";
import { prisma } from "../../db/prisma";
import { computeN400FieldAndEvidenceReadiness } from "../scoring";
import { syncSilenceNurtureTagForSession } from "../ghlSilenceTag";
import { scheduleWorkflowFollowUpIfEligible } from "./workflowSchedule";

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
  engine: N400RuleEngineOutput,
  hitlConflicts: boolean
): string {
  if (ESCALATION_PHASES.has(currentPhase)) {
    return currentPhase;
  }
  if (hitlConflicts) {
    return "ESCALATED_CONFLICT";
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
 * phase, dates, evidence score, optional idempotency, interaction anchor, silence tag, follow-up scheduling.
 */
export async function processIngestedData(params: {
  intakeSessionId: string;
  configPackageId: string;
  sourceChannel?: string;
  idempotencyKey?: string;
  callId?: string;
  externalRef?: string;
}): Promise<void> {
  if (params.configPackageId !== "uscis-n400") return;

  const idem = params.idempotencyKey?.trim();
  if (idem) {
    const existing = await prisma.workflowIngestionDedupe.findUnique({
      where: {
        intakeSessionId_idempotencyKey: {
          intakeSessionId: params.intakeSessionId,
          idempotencyKey: idem,
        },
      },
      select: { id: true },
    });
    if (existing) return;
  }

  const session = await prisma.intakeSession.findUnique({
    where: { id: params.intakeSessionId },
    select: {
      fieldValues: true,
      hitl: true,
      workflowInstance: {
        select: {
          id: true,
          phase: true,
          requirementsJson: true,
          preferredChannel: true,
        },
      },
    },
  });

  if (!session) return;

  const fv =
    session.fieldValues && typeof session.fieldValues === "object" && !Array.isArray(session.fieldValues)
      ? (session.fieldValues as Record<string, unknown>)
      : {};

  const hitlRaw = session.hitl as Record<string, unknown> | null | undefined;
  const conflicts = hitlRaw?.conflicts;
  const hitlConflicts =
    Array.isArray(conflicts) &&
    conflicts.some((c) => c && typeof c === "object" && Object.keys(c as object).length > 0);

  const engine = runN400RuleEngine(fv);
  const generated = [...engine.eligibilityGates, ...engine.evidenceRequired];
  const prevReq = session.workflowInstance?.requirementsJson ?? [];
  const merged = mergeEvidenceRequirements(prevReq, generated);

  const evidenceScore = computeDocumentEvidenceCompletenessScore(merged);
  const dual = computeN400FieldAndEvidenceReadiness(fv, evidenceScore);
  const nba = nextBestActionKind({
    fieldCompletion: dual.fieldCompletion,
    evidenceCompletion: dual.evidenceCompletion,
    moralCharacterHeavy: engine.moralCharacter.requiresLegalReview,
  });

  const prevPhase = session.workflowInstance?.phase ?? "INITIAL_INTAKE";
  const nextPhase = resolveNextWorkflowPhase(prevPhase, engine, Boolean(hitlConflicts));

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
      preferredChannel: params.sourceChannel?.trim() || null,
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
      ...(params.sourceChannel
        ? {
            preferredChannel: params.sourceChannel,
          }
        : {}),
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
    data: {
      evidenceCompletenessScore: evidenceScore,
      completenessScore: dual.fieldCompletion,
    },
  });

  await prisma.intakeInteraction.create({
    data: {
      intakeSessionId: params.intakeSessionId,
      channel: params.sourceChannel ?? "unknown",
      externalRef: params.externalRef ?? null,
      callId: params.callId ?? null,
      payloadSummary: {
        orchestrator: "processIngestedData",
        phase: nextPhase,
      },
    },
  });

  if (idem) {
    await prisma.workflowIngestionDedupe.create({
      data: {
        intakeSessionId: params.intakeSessionId,
        idempotencyKey: idem,
      },
    });
  }

  await syncSilenceNurtureTagForSession({
    intakeSessionId: params.intakeSessionId,
    activeCase: nextPhase !== "CLOSED",
  });

  await scheduleWorkflowFollowUpIfEligible({
    intakeSessionId: params.intakeSessionId,
    workflowInstanceId: wf.id,
    phase: nextPhase,
    fieldCompletion: dual.fieldCompletion,
    evidenceCompletion: dual.evidenceCompletion,
    moralCharacterHeavy: engine.moralCharacter.requiresLegalReview,
    preferredChannel: wf.preferredChannel,
    nba,
  });
}
