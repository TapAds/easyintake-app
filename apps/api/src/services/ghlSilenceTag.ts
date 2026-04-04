import { prisma } from "../db/prisma";
import { mergeGhlContactTag } from "./ghlContactTags";

const ENV_TAG = process.env.GHL_SILENCE_NURTURE_TAG_NAME?.trim() ?? "";

/**
 * Pause sub-account nurture while Easy Intake is actively working a case (V1).
 * Uses AgencyConfig.silenceNurtureTagName or GHL_SILENCE_NURTURE_TAG_NAME.
 */
export async function syncSilenceNurtureTagForSession(args: {
  intakeSessionId: string;
  /** When true, ensure tag is present; when false, remove if configured. */
  activeCase: boolean;
}): Promise<void> {
  const session = await prisma.intakeSession.findUnique({
    where: { id: args.intakeSessionId },
    select: {
      externalIds: true,
      organizationId: true,
    },
  });
  if (!session) return;

  const ext = session.externalIds as Record<string, unknown> | null;
  const ghlLocationId = typeof ext?.ghlLocationId === "string" ? ext.ghlLocationId : "";
  const ghlContactId = typeof ext?.ghlContactId === "string" ? ext.ghlContactId : "";
  if (!ghlLocationId || !ghlContactId) return;

  const agency = await prisma.agencyConfig.findUnique({
    where: { ghlLocationId },
    select: { silenceNurtureTagName: true },
  });
  const tag = (agency?.silenceNurtureTagName?.trim() || ENV_TAG) || "";
  if (!tag) return;

  try {
    await mergeGhlContactTag(
      ghlLocationId,
      ghlContactId,
      tag,
      args.activeCase ? "add" : "remove"
    );
  } catch (err) {
    console.warn(
      `[ghlSilenceTag] ${args.intakeSessionId}:`,
      err instanceof Error ? err.message : err
    );
  }
}
