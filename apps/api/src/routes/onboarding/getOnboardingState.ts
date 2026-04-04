import type { Request, Response } from "express";
import {
  DEFAULT_ONBOARDING_STATE,
  isOnboardingStepId,
  type OnboardingState,
  type OnboardingStepId,
} from "@easy-intake/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

function readJwtRecord(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== "object" || Array.isArray(user)) return null;
  return user as Record<string, unknown>;
}

/**
 * Clerk org id from JWT `org_id`, or first id from operator scope (same order as
 * `resolveOrganizationIdsForClerkOrg`: clerk id first).
 */
export function resolveClerkOrgId(req: Request): string | null {
  const decoded = readJwtRecord((req as Request & { user?: unknown }).user);
  if (!decoded) return null;
  const fromJwt =
    typeof decoded.org_id === "string" ? decoded.org_id.trim() : "";
  if (fromJwt) return fromJwt;
  const scope = req.operatorScope;
  if (scope?.mode === "orgs" && scope.organizationIds.length > 0) {
    return scope.organizationIds[0]!.trim();
  }
  return null;
}

function parseOnboardingJson(raw: unknown): OnboardingState | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!isOnboardingStepId(o.currentStep)) return null;
  if (!Array.isArray(o.completedSteps)) return null;
  const steps: OnboardingStepId[] = [];
  for (const s of o.completedSteps) {
    if (!isOnboardingStepId(s)) return null;
    steps.push(s);
  }
  if (o.data !== undefined && o.data !== null) {
    if (typeof o.data !== "object" || Array.isArray(o.data)) return null;
  }
  const data =
    o.data !== undefined && o.data !== null
      ? { ...(o.data as Record<string, unknown>) }
      : {};
  if (o.completedAt !== null && o.completedAt !== undefined) {
    if (typeof o.completedAt !== "string") return null;
  }
  return {
    currentStep: o.currentStep,
    completedSteps: steps,
    data,
    completedAt:
      o.completedAt === undefined || o.completedAt === null
        ? null
        : o.completedAt,
  };
}

export function stateFromAgencyOnboardingField(
  raw: Prisma.JsonValue | null | undefined
): OnboardingState {
  const parsed = parseOnboardingJson(raw);
  return parsed ?? DEFAULT_ONBOARDING_STATE;
}

/**
 * GET / (mounted at /api/onboarding/state)
 */
export async function getOnboardingState(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const clerkOrgId = resolveClerkOrgId(req);
    if (!clerkOrgId) {
      res.status(403).json({
        error: "Active organization required",
        code: "NO_ORG",
      });
      return;
    }

    const agency = await prisma.agencyConfig.findFirst({
      where: { clerkOrganizationId: clerkOrgId },
      orderBy: { updatedAt: "desc" },
      select: { onboarding: true },
    });

    if (!agency) {
      res.status(404).json({ error: "Agency not found for organization" });
      return;
    }

    res.json(stateFromAgencyOnboardingField(agency.onboarding));
  } catch (err) {
    console.error("[onboarding] get state:", err);
    res.status(500).json({ error: "Could not load onboarding state" });
  }
}
