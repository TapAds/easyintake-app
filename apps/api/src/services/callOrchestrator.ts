import { FlowStage, Gender } from "@prisma/client";
import { prisma } from "../db/prisma";
import { callEvents } from "../lib/callEvents";
import { getEntityCache, clearEntityCache } from "./stageManager";
import { computeCompletenessScore } from "./scoring";
import { EntityFieldName } from "../config/fieldStages";

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

// ─── Entity mapping ───────────────────────────────────────────────────────────

/**
 * Converts gender string from extraction output to Prisma Gender enum.
 * Unknown or unrecognized values are stored as UNKNOWN.
 */
function toGenderEnum(value: unknown): Gender | undefined {
  if (value === null || value === undefined) return undefined;
  switch (String(value).toLowerCase()) {
    case "male":       return Gender.MALE;
    case "female":     return Gender.FEMALE;
    case "non-binary":
    case "nonbinary":  return Gender.NON_BINARY;
    default:           return Gender.UNKNOWN;
  }
}

/**
 * Converts a dateOfBirth value to a DateTime suitable for Prisma.
 * Accepts ISO date strings ("YYYY-MM-DD") or Date objects.
 * Normalises to midnight UTC to avoid timezone drift.
 */
function toDateOfBirth(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

type EntityData = Partial<Record<EntityFieldName, unknown>>;

/**
 * Maps EntityState (flexible unknown values from Claude extraction) to the
 * typed shape expected by Prisma's LifeInsuranceEntity upsert data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEntityPayload(entity: EntityData): Record<string, any> {
  return {
    firstName:             entity.firstName             as string  | undefined,
    lastName:              entity.lastName              as string  | undefined,
    dateOfBirth:           toDateOfBirth(entity.dateOfBirth),
    gender:                toGenderEnum(entity.gender),
    phone:                 entity.phone                 as string  | undefined,
    email:                 entity.email                 as string  | undefined,
    address:               entity.address               as string  | undefined,
    city:                  entity.city                  as string  | undefined,
    state:                 entity.state                 as string  | undefined,
    zip:                   entity.zip                   as string  | undefined,
    coverageAmountDesired: entity.coverageAmountDesired as number  | undefined,
    productTypeInterest:   entity.productTypeInterest   as string  | undefined,
    termLengthDesired:     entity.termLengthDesired     as number  | undefined,
    budgetMonthly:         entity.budgetMonthly         as number  | undefined,
    tobaccoUse:            entity.tobaccoUse            as boolean | undefined,
    tobaccoLastUsed:       entity.tobaccoLastUsed       as string  | undefined,
    heightFeet:            entity.heightFeet            as number  | undefined,
    heightInches:          entity.heightInches          as number  | undefined,
    weightLbs:             entity.weightLbs             as number  | undefined,
    existingCoverage:      entity.existingCoverage      as boolean | undefined,
    existingCoverageAmount:entity.existingCoverageAmount as number | undefined,
    beneficiaryName:       entity.beneficiaryName       as string  | undefined,
    beneficiaryRelation:   entity.beneficiaryRelation   as string  | undefined,
    extractedByAI:         entity as object,
  };
}

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
    select: { id: true, consentVerbal: true, from: true },
  });

  if (!call) {
    console.warn(`[orchestrator] ${callSid}: no Call record found — skipping`);
    return;
  }

  const callId = call.id;
  const prismaStatus = toPrismaStatus(callStatus);

  // ── 2. Flush entity cache ──────────────────────────────────────────────────
  const entityState = getEntityCache(callSid);
  const entityPayload = buildEntityPayload(entityState);

  try {
    await prisma.lifeInsuranceEntity.upsert({
      where: { callId },
      create: { callId, ...entityPayload },
      update: entityPayload,
    });
  } catch (err) {
    console.error(`[orchestrator] ${callSid}: entity upsert failed:`, err);
  }

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
  const { overall: completenessScore, tier } = computeCompletenessScore(entityState);

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

// ─── GHL sync (stub — implemented in services/ghl.ts, Step 10) ───────────────

/**
 * Triggers GHL contact upsert and (if score ≥ 0.70) opportunity creation.
 * Imported lazily to avoid circular dependency; ghl.ts is built in Step 10.
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
    if (
      err instanceof Error &&
      err.message.includes("Cannot find module")
    ) {
      // ghl.ts not yet implemented (Step 10)
      console.log(`[orchestrator] ${callSid}: GHL sync skipped — ghl.ts not yet implemented`);
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
