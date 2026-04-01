import type { CallStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { processIngestedData } from "./workflow/processIngestedData";

const DEFAULT_ORG = process.env.DEFAULT_ORGANIZATION_ID ?? "org_local_dev";
const DEFAULT_VERTICAL = process.env.DEFAULT_VERTICAL_ID ?? "insurance";
const DEFAULT_PACKAGE = process.env.DEFAULT_CONFIG_PACKAGE_ID ?? "insurance";

function immigrationInboundSet(): Set<string> {
  const raw = process.env.IMMIGRATION_VOICE_NUMBERS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().replace(/\s/g, ""))
      .filter(Boolean)
  );
}

/**
 * Ensures a voice call has a linked IntakeSession (created on first inbound leg).
 * When `toNumber` matches `IMMIGRATION_VOICE_NUMBERS`, binds `uscis-n400`.
 *
 * @param organizationId When provided (e.g. `ghl:{locationId}` from AgencyConfig), scopes the session to that org; otherwise `DEFAULT_ORGANIZATION_ID`.
 */
export async function ensureIntakeSessionForCall(
  callId: string,
  callSid: string,
  startedAt: Date,
  toNumber?: string,
  organizationId?: string
): Promise<void> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { intakeSessionId: true },
  });
  if (call?.intakeSessionId) return;

  const imm = immigrationInboundSet();
  const to = toNumber?.trim().replace(/\s/g, "") ?? "";
  const useImmigration = to.length > 0 && imm.has(to);
  const verticalId = useImmigration ? "immigration" : DEFAULT_VERTICAL;
  const configPackageId = useImmigration ? "uscis-n400" : DEFAULT_PACKAGE;
  const orgId = organizationId?.trim() || DEFAULT_ORG;

  const session = await prisma.intakeSession.create({
    data: {
      organizationId: orgId,
      verticalId,
      configPackageId,
      status: "collecting",
      completenessScore: 0,
      fieldValues: {},
      channels: [
        {
          channel: "voice",
          externalRef: callSid,
          startedAt: startedAt.toISOString(),
        },
      ],
      hitl: {},
      externalIds: { callSid },
    },
  });

  await prisma.call.update({
    where: { id: callId },
    data: { intakeSessionId: session.id },
  });
}

/** Build session `fieldValues` cells from a flat engine entity map (voice / re-extract). */
export function flatStateToFieldValues(
  flat: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(flat)) {
    if (v === undefined || v === null) continue;
    out[k] = {
      value: v,
      provenance: { source: "ai", channel: "voice", updatedAt: now },
    };
  }
  return out;
}

/**
 * Merges a voice end snapshot into existing session.fieldValues without wiping
 * messaging-acquired data. Agent-sourced keys are never overwritten by voice AI.
 */
function mergeFieldValuesVoiceSnapshot(
  existingFv: Record<string, unknown>,
  voiceFields: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existingFv };
  for (const [k, wrap] of Object.entries(voiceFields)) {
    if (!wrap || typeof wrap !== "object" || !("value" in wrap)) continue;
    const v = (wrap as { value: unknown }).value;
    if (v === undefined || v === null) continue;

    const prev = out[k];
    const prevIsObj =
      prev && typeof prev === "object" && prev !== null && "value" in prev;
    const prevVal = prevIsObj ? (prev as { value: unknown }).value : undefined;
    const prevSource = prevIsObj
      ? (prev as { provenance?: { source?: string } }).provenance?.source
      : undefined;
    const prevEmpty =
      prevVal === undefined ||
      prevVal === null ||
      (typeof prevVal === "string" && String(prevVal).trim() === "");

    if (prevEmpty) {
      out[k] = wrap;
      continue;
    }
    if (prevSource === "agent") continue;
    out[k] = wrap;
  }
  return out;
}

function engineStatusFromCall(callStatus: CallStatus, score: number): string {
  if (callStatus === "FAILED") return "failed";
  if (callStatus === "NO_ANSWER") return "cancelled";
  if (callStatus === "ACTIVE") return "collecting";
  if (score >= 0.7) return "ready_to_submit";
  if (score >= 0.4) return "awaiting_hitl";
  return "collecting";
}

/**
 * Updates IntakeSession after orchestrator finishes (field snapshot, score, status).
 */
export async function syncIntakeSessionAfterCallEnd(args: {
  callId: string;
  callSid: string;
  callStatus: CallStatus;
  completenessScore: number;
  flatEntity: Record<string, unknown>;
  endedAt: Date;
}): Promise<void> {
  const {
    callId,
    callSid,
    callStatus,
    completenessScore,
    flatEntity,
    endedAt,
  } = args;

  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { intakeSessionId: true, startedAt: true },
  });
  if (!call) return;

  if (!call.intakeSessionId) {
    await ensureIntakeSessionForCall(
      callId,
      callSid,
      call.startedAt ?? endedAt
    );
  }

  const updated = await prisma.call.findUnique({
    where: { id: callId },
    select: { intakeSessionId: true, startedAt: true },
  });
  const sessionId = updated?.intakeSessionId;
  if (!sessionId) return;

  const startedRef = updated?.startedAt ?? call.startedAt ?? endedAt;

  const sessionRow = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { channels: true, externalIds: true, fieldValues: true },
  });
  const prevChannels = Array.isArray(sessionRow?.channels)
    ? [...(sessionRow.channels as unknown[])]
    : [];
  const voiceIdx = prevChannels.findIndex(
    (c) =>
      typeof c === "object" &&
      c !== null &&
      (c as { channel?: string }).channel === "voice"
  );
  const voicePatch = {
    channel: "voice",
    externalRef: callSid,
    startedAt: startedRef.toISOString(),
    endedAt: endedAt.toISOString(),
  };
  if (voiceIdx >= 0) {
    prevChannels[voiceIdx] = {
      ...(typeof prevChannels[voiceIdx] === "object" &&
      prevChannels[voiceIdx] !== null
        ? (prevChannels[voiceIdx] as object)
        : {}),
      ...voicePatch,
    };
  } else {
    prevChannels.push(voicePatch);
  }

  const existingFv =
    sessionRow?.fieldValues &&
    typeof sessionRow.fieldValues === "object" &&
    !Array.isArray(sessionRow.fieldValues)
      ? { ...(sessionRow.fieldValues as Record<string, unknown>) }
      : {};

  const voiceSnapshot = flatStateToFieldValues(flatEntity);
  const fv = mergeFieldValuesVoiceSnapshot(existingFv, voiceSnapshot);
  const status = engineStatusFromCall(callStatus, completenessScore);
  const hitl = {
    pendingAgentReview: completenessScore < 0.85 && completenessScore > 0,
    pendingDocumentApproval: false,
    pendingFinalSignOff: false,
    pendingApplicantSignature: false,
  };

  const prevExt =
    sessionRow?.externalIds && typeof sessionRow.externalIds === "object" && !Array.isArray(sessionRow.externalIds)
      ? { ...(sessionRow.externalIds as Record<string, unknown>) }
      : {};

  await prisma.intakeSession.update({
    where: { id: sessionId },
    data: {
      status,
      completenessScore,
      fieldValues: fv as object,
      hitl: hitl as object,
      channels: prevChannels as object,
      externalIds: { ...prevExt, callSid } as object,
    },
  });

  const pkgRow = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { configPackageId: true },
  });
  if (pkgRow?.configPackageId === "uscis-n400") {
    void processIngestedData({
      intakeSessionId: sessionId,
      configPackageId: "uscis-n400",
      sourceChannel: "voice",
    }).catch((err) => console.error("[workflow] processIngestedData:", err));
  }
}
