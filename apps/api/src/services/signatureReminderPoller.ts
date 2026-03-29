import { prisma } from "../db/prisma";
import { sendOneSignatureReminder } from "./ghlSignature";

const POLL_INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 15;

async function pollOnce(): Promise<void> {
  const now = new Date();
  const rows = await prisma.signatureRequest.findMany({
    where: {
      status: "sent",
      nextReminderAt: { lte: now },
    },
    orderBy: { nextReminderAt: "asc" },
    take: BATCH_SIZE,
    select: {
      id: true,
      ghlLocationId: true,
      ghlContactId: true,
      reminderCount: true,
      maxReminders: true,
      intakeSessionId: true,
    },
  });

  for (const row of rows) {
    if (row.reminderCount >= row.maxReminders) {
      await prisma.signatureRequest.update({
        where: { id: row.id },
        data: { nextReminderAt: null },
      });
      continue;
    }

    await sendOneSignatureReminder(row).catch((err) => {
      console.error(`[signatureReminderPoller] reminder failed id=${row.id}:`, err);
    });
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startSignatureReminderPoller(): void {
  if (timer) return;
  timer = setInterval(() => {
    pollOnce().catch((err) => console.error("[signatureReminderPoller] poll error:", err));
  }, POLL_INTERVAL_MS);
  console.log(`[signatureReminderPoller] started — every ${POLL_INTERVAL_MS / 1000}s`);
}

export function stopSignatureReminderPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[signatureReminderPoller] stopped");
  }
}
