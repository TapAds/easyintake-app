import { prisma } from "../db/prisma";
import { analyzeQuoteFieldGaps } from "./gapAnalysis";

const TERMINAL = new Set(["submitted", "synced", "cancelled", "failed"]);

/** Default 20 minutes; override with SMART_CHASER_DELAY_MS (milliseconds). */
function chaserDelayMs(): number {
  const raw = process.env.SMART_CHASER_DELAY_MS;
  if (raw && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return 20 * 60 * 1000;
}

/** Skip new jobs if a pending/send is already queued recently (per session). */
const DEDUPE_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Smart Chaser — after GHL inbound processing, schedule one templated nudge for the
 * highest-priority missing quote field (see REQUIRED_QUOTE_FIELDS order).
 */
export async function scheduleGapChaserIfNeeded(params: {
  intakeSessionId: string;
}): Promise<void> {
  const session = await prisma.intakeSession.findUnique({
    where: { id: params.intakeSessionId },
    select: {
      id: true,
      status: true,
      fieldValues: true,
      completenessScore: true,
      externalIds: true,
    },
  });

  if (!session) return;
  if (TERMINAL.has(session.status)) return;
  if (session.completenessScore >= 0.85) return;

  const ext = session.externalIds;
  const extObj =
    ext && typeof ext === "object" && !Array.isArray(ext) ? (ext as Record<string, unknown>) : {};
  if (typeof extObj.ghlContactId !== "string" || typeof extObj.ghlLocationId !== "string") {
    return;
  }

  const fv = (session.fieldValues as Record<string, unknown>) ?? {};
  const { missingKeys } = analyzeQuoteFieldGaps(fv);
  if (missingKeys.length === 0) return;

  const dup = await prisma.followUpJob.findFirst({
    where: {
      intakeSessionId: session.id,
      status: { in: ["PENDING", "SENDING"] },
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (dup) {
    console.log(`[smart-chaser] dedupe skip session=${session.id} pendingJob=${dup.id}`);
    return;
  }

  const firstKey = missingKeys[0];
  const scheduledFor = new Date(Date.now() + chaserDelayMs());

  await prisma.followUpJob.create({
    data: {
      kind: "GAP_CHASER",
      callId: null,
      intakeSessionId: session.id,
      chaserFieldKey: firstKey,
      status: "PENDING",
      scheduledFor,
    },
  });

  console.log(
    `[smart-chaser] scheduled session=${session.id} field=${firstKey} at=${scheduledFor.toISOString()}`
  );
}
