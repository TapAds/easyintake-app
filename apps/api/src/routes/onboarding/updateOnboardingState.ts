import type { Request, Response } from "express";
import {
  isOnboardingStepId,
  type OnboardingState,
  type OnboardingStepId,
} from "@easy-intake/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import {
  resolveClerkOrgId,
  stateFromAgencyOnboardingField,
} from "./getOnboardingState";

function mergeOnboardingState(
  current: OnboardingState,
  patch: Partial<OnboardingState>
): OnboardingState {
  const next: OnboardingState = { ...current };
  if (patch.currentStep !== undefined) {
    if (!isOnboardingStepId(patch.currentStep)) {
      throw new Error("INVALID_CURRENT_STEP");
    }
    next.currentStep = patch.currentStep;
  }
  if (patch.completedSteps !== undefined) {
    if (!Array.isArray(patch.completedSteps)) {
      throw new Error("INVALID_COMPLETED_STEPS");
    }
    const steps: OnboardingStepId[] = [];
    for (const s of patch.completedSteps) {
      if (!isOnboardingStepId(s)) throw new Error("INVALID_COMPLETED_STEPS");
      steps.push(s);
    }
    next.completedSteps = steps;
  }
  if (patch.data !== undefined) {
    if (
      patch.data === null ||
      typeof patch.data !== "object" ||
      Array.isArray(patch.data)
    ) {
      throw new Error("INVALID_DATA");
    }
    next.data = { ...current.data, ...patch.data };
  }
  if (patch.completedAt !== undefined) {
    if (patch.completedAt !== null && typeof patch.completedAt !== "string") {
      throw new Error("INVALID_COMPLETED_AT");
    }
    next.completedAt = patch.completedAt;
  }
  return next;
}

/**
 * POST / (mounted at /api/onboarding/state)
 */
export async function updateOnboardingState(
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
      select: { id: true, onboarding: true },
    });

    if (!agency) {
      res.status(404).json({ error: "Agency not found for organization" });
      return;
    }

    const current = stateFromAgencyOnboardingField(agency.onboarding);
    let merged: OnboardingState;
    try {
      merged = mergeOnboardingState(
        current,
        req.body as Partial<OnboardingState>
      );
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (
        code === "INVALID_CURRENT_STEP" ||
        code === "INVALID_COMPLETED_STEPS" ||
        code === "INVALID_DATA" ||
        code === "INVALID_COMPLETED_AT"
      ) {
        res.status(400).json({ error: "Invalid onboarding payload" });
        return;
      }
      throw e;
    }

    await prisma.agencyConfig.update({
      where: { id: agency.id },
      data: { onboarding: merged as Prisma.InputJsonValue },
    });

    res.json(merged);
  } catch (err) {
    console.error("[onboarding] update state:", err);
    res.status(500).json({ error: "Could not update onboarding state" });
  }
}
