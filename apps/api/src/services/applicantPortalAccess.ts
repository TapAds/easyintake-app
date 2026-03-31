import { createHash, randomBytes } from "crypto";
import { prisma } from "../db/prisma";

const DEFAULT_TTL_DAYS = 30;

export function hashPortalToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateRawPortalToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createApplicantPortalAccess(
  intakeSessionId: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRawPortalToken();
  const tokenHash = hashPortalToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + Math.max(1, Math.min(ttlDays, 365)));

  await prisma.applicantPortalAccess.create({
    data: {
      intakeSessionId,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function resolvePortalToken(
  rawToken: string
): Promise<{ intakeSessionId: string; accessId: string } | null> {
  const tokenHash = hashPortalToken(rawToken);
  const row = await prisma.applicantPortalAccess.findUnique({
    where: { tokenHash },
  });
  if (!row || row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return { intakeSessionId: row.intakeSessionId, accessId: row.id };
}

export async function touchPortalAccessLastUsed(accessId: string): Promise<void> {
  await prisma.applicantPortalAccess.update({
    where: { id: accessId },
    data: { lastUsedAt: new Date() },
  });
}

export async function getActivePortalAccessSummary(
  intakeSessionId: string
): Promise<{ hasActiveToken: boolean; expiresAt?: string }> {
  const row = await prisma.applicantPortalAccess.findFirst({
    where: {
      intakeSessionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
  });
  if (!row) return { hasActiveToken: false };
  return { hasActiveToken: true, expiresAt: row.expiresAt.toISOString() };
}
