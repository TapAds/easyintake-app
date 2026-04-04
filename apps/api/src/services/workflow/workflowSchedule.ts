import type { NbaKind } from "@easy-intake/shared";
import { prisma } from "../../db/prisma";

const CONTACT_COOLDOWN_MS = 18 * 60 * 60 * 1000;

const BLOCKED_PHASES = new Set([
  "ESCALATED_CONFLICT",
  "ESCALATED_LEGAL_REVIEW",
  "ESCALATED",
  "CLOSED",
]);

function outreachChannelFromPreferred(
  pref: string | null | undefined
): "SMS" | "WHATSAPP" {
  const p = (pref ?? "").toLowerCase();
  if (p === "whatsapp") return "WHATSAPP";
  return "SMS";
}

/**
 * Schedules a WORKFLOW_NUDGE or WEB_ABANDON_RESUME when dual-scoring NBA says so and cool-down allows.
 */
export async function scheduleWorkflowFollowUpIfEligible(args: {
  intakeSessionId: string;
  workflowInstanceId: string;
  phase: string;
  fieldCompletion: number;
  evidenceCompletion: number;
  moralCharacterHeavy: boolean;
  preferredChannel: string | null;
  nba: NbaKind;
}): Promise<void> {
  if (BLOCKED_PHASES.has(args.phase)) return;
  if (args.nba === "none" || args.nba === "channel_shift") return;

  const kind =
    args.nba === "evidence_focus"
      ? "WORKFLOW_NUDGE"
      : args.nba === "field_focus"
        ? "WEB_ABANDON_RESUME"
        : null;
  if (!kind) return;

  const recent = await prisma.followUpJob.findFirst({
    where: {
      intakeSessionId: args.intakeSessionId,
      status: "SENT",
      sentAt: { gte: new Date(Date.now() - CONTACT_COOLDOWN_MS) },
    },
    orderBy: { sentAt: "desc" },
    select: { id: true },
  });
  if (recent) return;

  const pending = await prisma.followUpJob.findFirst({
    where: {
      intakeSessionId: args.intakeSessionId,
      status: { in: ["PENDING", "SENDING"] },
    },
    select: { id: true },
  });
  if (pending) return;

  const scheduledFor = new Date(Date.now() + 90_000);
  const outreachChannel = outreachChannelFromPreferred(args.preferredChannel);

  await prisma.followUpJob.create({
    data: {
      intakeSessionId: args.intakeSessionId,
      workflowInstanceId: args.workflowInstanceId,
      kind,
      chaserFieldKey: null,
      workflowTargetKey:
        args.nba === "evidence_focus" ? "evidence_reminder" : "web_resume",
      status: "PENDING",
      scheduledFor,
      outreachChannel,
    },
  });
}
