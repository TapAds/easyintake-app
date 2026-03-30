import { prisma } from "../db/prisma";
import { callEvents } from "../lib/callEvents";
import {
  getEntityCache,
  clearEntityCache,
  type EntityState,
} from "./stageManager";
import { computeCompletenessScore, computeN400CompletenessScore } from "./scoring";
import { buildEntityPayload, mergeDbEntityWithCache } from "./entityPayload";
import { syncIntakeSessionAfterCallEnd } from "./intakeSessionSync";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BufferedUtterance {
  speaker: string;
  text: string;
  offsetMs: number;
  languageCode: string;
  confidence?: number;
}

// ─── In-memory transcript buffer ──────────────────────────────────────────────
//
// Accumulates utterances per call during a live session.
// Flushed to TranscriptSegment rows on call end.
// Keyed by callSid (not callId) because callSid is available immediately.

const transcriptBuffer = new Map<string, BufferedUtterance[]>();

/**
 * Buffers an utterance for later DB write.
 * Called by the utterance listener on callEvents.
 */
function bufferUtterance(callSid: string, utterance: BufferedUtterance): void {
  const buffer = transcriptBuffer.get(callSid) ?? [];
  buffer.push(utterance);
  transcriptBuffer.set(callSid, buffer);
}

// Subscribe to utterances emitted by deepgram.ts
callEvents.on(
  "utterance",
  (event: {
    callSid: string;
    speaker: string;
    text: string;
    offsetMs: number;
    languageCode: string;
    confidence?: number;
  }) => {
    bufferUtterance(event.callSid, {
      speaker: event.speaker,
      text: event.text,
      offsetMs: event.offsetMs,
      languageCode: event.languageCode,
      confidence: event.confidence,
    });
  }
);

// ─── Main orchestration ───────────────────────────────────────────────────────

export interface CallEndPayload {
  callSid: string;
  callStatus: "completed" | "failed" | "no-answer" | "busy" | "canceled";
  durationSeconds?: number;
}

/**
 * Orchestrates all end-of-call persistence and downstream actions.
 *
 * Execution order:
 *   1. Resolve Call.id from callSid
 *   2. Flush entity cache → upsert LifeInsuranceEntity
 *   3. Flush transcript buffer → createMany TranscriptSegment
 *   4. Compute completeness score
 *   5. Update Call (status, endedAt, durationSeconds, completenessScore)
 *   6. Schedule FollowUpJob if eligible (consent + score ≥ 0.40)
 *   7. Trigger GHL sync (non-blocking — errors logged, not thrown)
 *   8. Clean up in-memory state
 *
 * Idempotent: safe to call more than once for the same callSid.
 * All steps after (1) are individually try-caught so a partial failure
 * does not prevent the remaining steps from running.
 */
export async function handleCallEnd(payload: CallEndPayload): Promise<void> {
  const { callSid, callStatus, durationSeconds } = payload;

  // ── 1. Resolve Call ────────────────────────────────────────────────────────
  const call = await prisma.call.findUnique({
    where: { callSid },
    select: {
      id: true,
      consentVerbal: true,
      from: true,
      intakeSession: { select: { configPackageId: true } },
    },
  });

  if (!call) {
    console.warn(`[orchestrator] ${callSid}: no Call record found — skipping`);
    return;
  }

  const callId = call.id;
  const prismaStatus = toPrismaStatus(callStatus);

  // ── 2. Flush entity cache (merge with any mid-call DB snapshots) ───────────
  const existingEntity = await prisma.lifeInsuranceEntity.findUnique({
    where: { callId },
  });
  const cached = getEntityCache(callSid);
  const mergedEntityState = mergeDbEntityWithCache(existingEntity, cached);
  const entityPayload = buildEntityPayload(mergedEntityState);

  try {
    await prisma.lifeInsuranceEntity.upsert({
      where: { callId },
      create: { callId, ...entityPayload },
      update: entityPayload,
    });
  } catch (err) {
    console.error(`[orchestrator] ${callSid}: entity upsert failed:`, err);
  }

  const entityState = mergedEntityState;

  // ── 3. Flush transcript buffer ─────────────────────────────────────────────
  const segments = transcriptBuffer.get(callSid) ?? [];
  if (segments.length > 0) {
    try {
      await prisma.transcriptSegment.createMany({
        data: segments.map((s) => ({
          callId,
          speaker:      s.speaker,
          text:         s.text,
          offsetMs:     s.offsetMs,
          languageCode: s.languageCode,
          confidence:   s.confidence,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      console.error(`[orchestrator] ${callSid}: transcript flush failed:`, err);
    }
  }

  // ── 4. Compute score ───────────────────────────────────────────────────────
  const pkg = call.intakeSession?.configPackageId ?? null;
  const { overall: completenessScore, tier } =
    pkg === "uscis-n400"
      ? computeN400CompletenessScore(entityState as Record<string, unknown>)
      : computeCompletenessScore(entityState as EntityState);

  // ── 5. Update Call ─────────────────────────────────────────────────────────
  try {
    await prisma.call.update({
      where: { id: callId },
      data: {
        status: prismaStatus,
        endedAt: new Date(),
        durationSeconds: durationSeconds ?? null,
        completenessScore,
      },
    });
  } catch (err) {
    console.error(`[orchestrator] ${callSid}: call update failed:`, err);
  }

  try {
    await syncIntakeSessionAfterCallEnd({
      callId,
      callSid,
      callStatus: prismaStatus,
      completenessScore,
      flatEntity: { ...(mergedEntityState as Record<string, unknown>) },
      endedAt: new Date(),
    });
  } catch (err) {
    console.error(`[orchestrator] ${callSid}: intake session sync failed:`, err);
  }

  console.log(
    `[orchestrator] ${callSid}: status=${prismaStatus} ` +
    `score=${completenessScore.toFixed(3)} tier=${tier} ` +
    `segments=${segments.length}`
  );

  // ── 6. Schedule follow-up SMS ──────────────────────────────────────────────
  const smsEligible =
    prismaStatus === "COMPLETED" &&
    call.consentVerbal &&
    completenessScore >= 0.4 &&
    Boolean(call.from);

  if (smsEligible) {
    const scheduledFor = new Date(Date.now() + 30 * 60 * 1000); // +30 min
    try {
      await prisma.followUpJob.create({
        data: {
          callId,
          status: "PENDING",
          scheduledFor,
        },
      });
      console.log(`[orchestrator] ${callSid}: FollowUpJob scheduled for ${scheduledFor.toISOString()}`);
    } catch (err) {
      console.error(`[orchestrator] ${callSid}: FollowUpJob creation failed:`, err);
    }
  }

  // ── 7. GHL sync (non-blocking) ─────────────────────────────────────────────
  if (prismaStatus === "COMPLETED" && completenessScore >= 0.4) {
    syncToGhl(callId, callSid, completenessScore).catch((err) => {
      console.error(`[orchestrator] ${callSid}: GHL sync error:`, err);
    });
  }

  // ── 8. Cleanup ─────────────────────────────────────────────────────────────
  clearEntityCache(callSid);
  transcriptBuffer.delete(callSid);
}

// ─── GHL sync (services/ghl.ts — location resolved from Call.to → AgencyConfig) ─

/**
 * Triggers GHL contact upsert and (if score ≥ 0.70) opportunity creation.
 * Imported lazily to avoid circular dependency.
 */
async function syncToGhl(
  callId: string,
  callSid: string,
  score: number
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { syncCallToGhl } = require("./ghl") as {
      syncCallToGhl: (callId: string, score: number) => Promise<void>;
    };
    await syncCallToGhl(callId, score);
    console.log(`[orchestrator] ${callSid}: GHL sync complete`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Cannot find module")) {
      console.log(`[orchestrator] ${callSid}: GHL sync skipped — ghl module missing`);
    } else {
      throw err;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPrismaStatus(
  twilioStatus: CallEndPayload["callStatus"]
): "COMPLETED" | "FAILED" | "NO_ANSWER" {
  switch (twilioStatus) {
    case "completed": return "COMPLETED";
    case "no-answer":
    case "busy":
    case "canceled":  return "NO_ANSWER";
    default:          return "FAILED";
  }
}
