import type { CallStatus } from "@prisma/client";
import { prisma } from "../db/prisma";

const DEFAULT_ORG = process.env.DEFAULT_ORGANIZATION_ID ?? "org_local_dev";
const DEFAULT_VERTICAL = process.env.DEFAULT_VERTICAL_ID ?? "insurance";
const DEFAULT_PACKAGE = process.env.DEFAULT_CONFIG_PACKAGE_ID ?? "insurance";

/**
 * Ensures a voice call has a linked IntakeSession (created on first inbound leg).
 */
export async function ensureIntakeSessionForCall(
  callId: string,
  callSid: string,
  startedAt: Date
): Promise<void> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { intakeSessionId: true },
  });
  if (call?.intakeSessionId) return;

  const session = await prisma.intakeSession.create({
    data: {
      organizationId: DEFAULT_ORG,
      verticalId: DEFAULT_VERTICAL,
      configPackageId: DEFAULT_PACKAGE,
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

function flatStateToFieldValues(
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
    select: { channels: true, externalIds: true },
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

  const fv = flatStateToFieldValues(flatEntity);
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
}
