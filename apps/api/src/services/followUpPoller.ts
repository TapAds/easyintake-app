import { prisma } from "../db/prisma";
import { sendFollowUpSms, SmsTemplateId } from "./sms";

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const BATCH_SIZE = 10;              // max jobs per poll cycle

// ─── Poller ───────────────────────────────────────────────────────────────────

/**
 * Processes a single FollowUpJob row: sends the SMS, marks SENT or FAILED.
 *
 * The status is set to SENDING before the SMS call to provide a soft lock
 * against double-processing if the poller ever runs concurrently (e.g. during
 * a restart). This is not a hard transactional lock — Phase 2 will add one
 * if horizontal scaling is introduced.
 */
async function processJob(jobId: string): Promise<void> {
  // Claim the job atomically (status PENDING → SENDING)
  const job = await prisma.followUpJob.update({
    where: { id: jobId },
    data: { status: "SENDING" },
    include: {
      call: {
        select: {
          from:             true,
          completenessScore: true,
          entity: {
            select: { firstName: true },
          },
        },
      },
    },
  });

  const phone = job.call.from;
  const firstName = job.call.entity?.firstName ?? "";
  const score = job.call.completenessScore;
  const templateId: SmsTemplateId = score >= 0.7 ? "qualified" : "partial";

  try {
    const result = await sendFollowUpSms(phone, templateId, firstName);

    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    console.log(
      `[followUpPoller] job ${jobId}: SMS sent sid=${result.sid} ` +
      `template=${templateId} phone=${phone}`
    );
  } catch (err) {
    const failReason = err instanceof Error ? err.message : String(err);

    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        failReason: failReason.slice(0, 500), // cap length
      },
    });

    console.error(`[followUpPoller] job ${jobId}: SMS failed — ${failReason}`);
  }
}

/**
 * Runs one poll cycle: finds PENDING jobs past their scheduledFor time
 * and processes them sequentially (to respect Twilio rate limits).
 */
async function pollOnce(): Promise<void> {
  const jobs = await prisma.followUpJob.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: new Date() },
    },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  });

  if (jobs.length === 0) return;

  console.log(`[followUpPoller] found ${jobs.length} job(s) to process`);

  for (const job of jobs) {
    await processJob(job.id).catch((err) => {
      // processJob already logs + updates status; this catches unexpected errors
      console.error(`[followUpPoller] unexpected error for job ${job.id}:`, err);
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the follow-up SMS poller.
 * Safe to call multiple times — only one interval will run.
 */
export function startFollowUpPoller(): void {
  if (timer) return;
  timer = setInterval(() => {
    pollOnce().catch((err) => {
      console.error("[followUpPoller] poll cycle error:", err);
    });
  }, POLL_INTERVAL_MS);

  console.log(
    `[followUpPoller] started — checking every ${POLL_INTERVAL_MS / 1000}s`
  );
}

/**
 * Stops the poller. Used in tests and graceful shutdown.
 */
export function stopFollowUpPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[followUpPoller] stopped");
  }
}
