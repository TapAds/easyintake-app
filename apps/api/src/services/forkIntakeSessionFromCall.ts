import { getVerticalConfigForPackageId } from "@easy-intake/shared";
import { prisma } from "../db/prisma";
import { flatStateToFieldValues } from "./intakeSessionSync";
import { runTranscriptExtractToFlatForPackage } from "./transcriptExtract";

const DEFAULT_ORG = process.env.DEFAULT_ORGANIZATION_ID ?? "org_local_dev";

function verticalIdForPackage(configPackageId: string): string {
  const cfg = getVerticalConfigForPackageId(configPackageId);
  return cfg?.vertical ?? process.env.DEFAULT_VERTICAL_ID ?? "insurance";
}

function mergeProvenanceConfidence(
  fv: Record<string, unknown>,
  fieldConfidences: Record<string, number>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const now = new Date().toISOString();
  for (const [k, wrap] of Object.entries(fv)) {
    if (!wrap || typeof wrap !== "object" || !("value" in wrap)) {
      out[k] = wrap;
      continue;
    }
    const cell = { ...(wrap as object) } as Record<string, unknown>;
    const prov =
      cell.provenance && typeof cell.provenance === "object"
        ? { ...(cell.provenance as object) }
        : { source: "ai", channel: "voice", updatedAt: now };
    const c = fieldConfidences[k];
    if (typeof c === "number" && Number.isFinite(c)) {
      (prov as Record<string, unknown>).confidence = c;
    }
    cell.provenance = prov;
    out[k] = cell;
  }
  return out;
}

/**
 * Creates a new intake session from an existing call's stored transcript,
 * extracting for the chosen product package. Does not change the call's primary session.
 */
export async function forkIntakeSessionFromCallTranscript(args: {
  callSid: string;
  configPackageId: string;
}): Promise<{ sessionId: string } | { error: string; status: number }> {
  const callSid = args.callSid?.trim();
  const configPackageId = args.configPackageId?.trim();
  if (!callSid || !configPackageId) {
    return { error: "callSid and configPackageId required", status: 400 };
  }
  if (!getVerticalConfigForPackageId(configPackageId)) {
    return { error: "Unknown configPackageId", status: 400 };
  }

  const call = await prisma.call.findUnique({
    where: { callSid },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      intakeSessionId: true,
      intakeSession: {
        select: { organizationId: true, externalIds: true },
      },
      transcriptSegments: { take: 1, select: { id: true } },
    },
  });

  if (!call) {
    return { error: "Call not found", status: 404 };
  }
  if (call.transcriptSegments.length === 0) {
    return { error: "No stored transcript for this call yet", status: 400 };
  }

  const extract = await runTranscriptExtractToFlatForPackage(callSid, configPackageId);
  if ("error" in extract) {
    return extract;
  }

  const orgId =
    call.intakeSession?.organizationId?.trim() || DEFAULT_ORG;
  const verticalId = verticalIdForPackage(configPackageId);
  const rawFv = flatStateToFieldValues(extract.entities as Record<string, unknown>);
  const fieldValues = mergeProvenanceConfidence(rawFv, extract.fieldConfidences);

  const prevExt =
    call.intakeSession?.externalIds &&
    typeof call.intakeSession.externalIds === "object" &&
    !Array.isArray(call.intakeSession.externalIds)
      ? { ...(call.intakeSession.externalIds as Record<string, unknown>) }
      : {};

  const hitl = {
    pendingAgentReview:
      extract.completenessScore < 0.85 && extract.completenessScore > 0,
    pendingDocumentApproval: false,
    pendingFinalSignOff: false,
    pendingApplicantSignature: false,
  };

  const startedAt = call.startedAt.toISOString();
  const endedAt = call.endedAt?.toISOString();

  const session = await prisma.intakeSession.create({
    data: {
      organizationId: orgId,
      verticalId,
      configPackageId,
      status: "collecting",
      completenessScore: extract.completenessScore,
      fieldValues: fieldValues as object,
      channels: [
        {
          channel: "voice",
          externalRef: callSid,
          startedAt,
          ...(endedAt ? { endedAt } : {}),
          metadata: { derivedFromTranscript: true },
        },
      ],
      hitl: hitl as object,
      externalIds: {
        ...prevExt,
        callSid,
        forkedFromCallSid: callSid,
        forkedAt: new Date().toISOString(),
      } as object,
      sourceCallId: call.id,
    },
  });

  return { sessionId: session.id };
}
