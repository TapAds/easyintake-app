import type { EntityFieldName } from "../config/fieldStages";
import { FIELD_CONFIG } from "../config/fieldStages";
import { prisma } from "../db/prisma";
import {
  getGhlContactPrimaryPhone,
  resolveGhlLocationIdFromTwilioTo,
  sendGhlConversationSms,
  sendGhlConversationWhatsApp,
} from "./ghl";
import { deliverFollowUpSms } from "./followUpSend";
import type { SmsTemplateId } from "./sms";

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const BATCH_SIZE = 10; // max jobs per poll cycle

const WORKFLOW_BLOCK_PHASES = new Set([
  "ESCALATED_CONFLICT",
  "ESCALATED_LEGAL_REVIEW",
  "ESCALATED",
]);

function plainField(fv: Record<string, unknown>, key: string): string | null {
  const cell = fv[key];
  if (!cell || typeof cell !== "object" || !("value" in cell)) return null;
  const v = (cell as { value: unknown }).value;
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

// ─── Poller ───────────────────────────────────────────────────────────────────

async function processCallFollowUpJob(
  jobId: string,
  job: {
    call: {
      from: string;
      to: string;
      completenessScore: number;
      ghlContactId: string | null;
      intakeSession: { externalIds: unknown } | null;
      entity: { firstName: string | null; email: string | null } | null;
    };
  }
): Promise<void> {
  const phone = job.call.from;
  const firstName = job.call.entity?.firstName ?? "";
  const score = job.call.completenessScore;
  const templateId: SmsTemplateId = score >= 0.7 ? "qualified" : "partial";

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
}

async function processIntakeSessionFollowUpJob(
  jobId: string,
  job: {
    kind: string;
    outreachChannel: string;
    chaserFieldKey: string | null;
    intakeSession: {
      fieldValues: unknown;
      externalIds: unknown;
    };
  }
): Promise<void> {
  const fv = (job.intakeSession.fieldValues as Record<string, unknown>) ?? {};
  const ext = job.intakeSession.externalIds;
  const extObj =
    ext && typeof ext === "object" && !Array.isArray(ext) ? (ext as Record<string, unknown>) : {};
  const ghlLocationId = typeof extObj.ghlLocationId === "string" ? extObj.ghlLocationId : "";
  const ghlContactId = typeof extObj.ghlContactId === "string" ? extObj.ghlContactId : "";
  if (!ghlLocationId || !ghlContactId) {
    throw new Error("[followUpPoller] intake session job missing ghlLocationId or ghlContactId");
  }

  const firstName = plainField(fv, "firstName") ?? "";
  let phone = plainField(fv, "phone");
  if (!phone) {
    phone = await getGhlContactPrimaryPhone(ghlLocationId, ghlContactId);
  }
  if (!phone) {
    throw new Error("[followUpPoller] intake session job: no phone on session or GHL contact");
  }

  const stickyRaw = extObj.lastInboundChannel;
  const stickyChannel =
    stickyRaw === "sms" ||
    stickyRaw === "email" ||
    stickyRaw === "whatsapp" ||
    stickyRaw === "live_chat" ||
    stickyRaw === "other"
      ? stickyRaw
      : null;

  if (job.kind === "WORKFLOW_NUDGE" || job.kind === "WEB_ABANDON_RESUME") {
    const body =
      job.kind === "WEB_ABANDON_RESUME"
        ? `Hi ${firstName || "there"}, you started your application online. Reply here to continue or finish in the applicant portal.`
        : `Hi ${firstName || "there"}, please upload any remaining documents for your application. Reply if you need help.`;
    const wantWa = job.outreachChannel === "WHATSAPP" || stickyChannel === "whatsapp";
    const result = wantWa
      ? await sendGhlConversationWhatsApp(ghlLocationId, {
          contactId: ghlContactId,
          phone,
          message: body,
        })
      : await sendGhlConversationSms(ghlLocationId, {
          contactId: ghlContactId,
          phone,
          message: body,
        });
    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        externalMessageId: result.messageId ?? "unknown",
        outreachProvider: "ghl",
      },
    });
    console.log(
      `[followUpPoller] job ${jobId}: workflow kind=${job.kind} via ghl id=${result.messageId}`
    );
    return;
  }

  const key = job.chaserFieldKey;
  const isKnownKey = Boolean(key && key in FIELD_CONFIG);
  const templateId: SmsTemplateId = isKnownKey ? "gap_reminder" : "partial";
  const gapFieldLabel = isKnownKey
    ? FIELD_CONFIG[key as EntityFieldName].label
    : undefined;

  const { provider, externalMessageId } = await deliverFollowUpSms({
    ghlLocationId,
    phone,
    ghlContactId,
    templateId,
    firstName,
    stickyChannel,
    applicantEmail: plainField(fv, "email"),
    gapFieldLabel,
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
    `[followUpPoller] job ${jobId}: session chaser via ${provider} id=${externalMessageId} ` +
      `template=${templateId} fieldKey=${key ?? "—"}`
  );
}

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
      intakeSession: {
        select: {
          fieldValues: true,
          externalIds: true,
        },
      },
    },
  });

  try {
    if (job.callId && job.call) {
      await processCallFollowUpJob(jobId, job as typeof job & { call: NonNullable<typeof job.call> });
      return;
    }
    if (job.intakeSessionId && job.intakeSession) {
      const wf = await prisma.workflowInstance.findUnique({
        where: { intakeSessionId: job.intakeSessionId },
        select: { phase: true },
      });
      if (wf && WORKFLOW_BLOCK_PHASES.has(wf.phase)) {
        await prisma.followUpJob.update({
          where: { id: jobId },
          data: {
            status: "CANCELLED",
            failReason: "workflow_escalated",
          },
        });
        console.log(`[followUpPoller] job ${jobId}: cancelled — workflow phase ${wf.phase}`);
        return;
      }

      await processIntakeSessionFollowUpJob(jobId, {
        kind: job.kind,
        outreachChannel: job.outreachChannel,
        chaserFieldKey: job.chaserFieldKey,
        intakeSession: job.intakeSession,
      });
      return;
    }

    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        failReason: "FollowUpJob has neither callId nor intakeSessionId",
      },
    });
  } catch (err) {
    const failReason = err instanceof Error ? err.message : String(err);

    await prisma.followUpJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        failReason: failReason.slice(0, 500),
      },
    });

    console.error(`[followUpPoller] job ${jobId}: failed — ${failReason}`);
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
