import { prisma } from "../db/prisma";
import { resolveGhlLocationIdFromTwilioTo } from "./ghl";
import { deliverFollowUpSms } from "./followUpSend";
import { SmsTemplateId } from "./sms";

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const BATCH_SIZE = 10;              // max jobs per poll cycle

// ─── Poller ───────────────────────────────────────────────────────────────────

async function processJob(jobId: string): Promise<void> {
  const job = await prisma.followUpJob.update({
    where: { id: jobId },
    data: { status: "SENDING" },
    include: {
      call: {
        select: {
          from: true,
          to: true,
          completenessScore: true,
          ghlContactId: true,
          intakeSession: {
            select: { externalIds: true },
          },
          entity: {
            select: { firstName: true, email: true },
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
    const ghlLocationId = await resolveGhlLocationIdFromTwilioTo(job.call.to);
    const ext = job.call.intakeSession?.externalIds;
    const extObj =
      ext && typeof ext === "object" && !Array.isArray(ext) ? (ext as Record<string, unknown>) : {};
    const stickyRaw = extObj.lastInboundChannel;
    const stickyChannel =
      stickyRaw === "sms" ||
      stickyRaw === "email" ||
      stickyRaw === "whatsapp" ||
      stickyRaw === "live_chat" ||
      stickyRaw === "other"
        ? stickyRaw
        : null;

    const { provider, externalMessageId } = await deliverFollowUpSms({
      ghlLocationId,
      phone,
      ghlContactId: job.call.ghlContactId,
      templateId,
      firstName,
      stickyChannel,
      applicantEmail: job.call.entity?.email ?? null,
    });

    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        externalMessageId,
        outreachProvider: provider,
      },
    });

    console.log(
      `[followUpPoller] job ${jobId}: SMS via ${provider} id=${externalMessageId} ` +
        `template=${templateId} phone=${phone}`
    );
  } catch (err) {
    const failReason = err instanceof Error ? err.message : String(err);

    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        failReason: failReason.slice(0, 500),
      },
    });

    console.error(`[followUpPoller] job ${jobId}: SMS failed — ${failReason}`);
  }
}

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
      console.error(`[followUpPoller] unexpected error for job ${job.id}:`, err);
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

let timer: ReturnType<typeof setInterval> | null = null;

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

export function stopFollowUpPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[followUpPoller] stopped");
  }
}
