import type { OnboardingStep, OnboardingStepId } from "./types";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "welcome",
    label: "Welcome",
    required: true,
  },
  {
    id: "agency_profile",
    label: "Agency profile",
    required: true,
  },
  {
    id: "crm_connect",
    label: "Connect CRM",
    required: false,
  },
  {
    id: "phone_setup",
    label: "Phone setup",
    required: true,
  },
  {
    id: "invite_team",
    label: "Invite team",
    required: false,
  },
  {
    id: "first_call",
    label: "First call",
    required: true,
  },
];

const STEP_ID_SET = new Set<OnboardingStepId>(
  ONBOARDING_STEPS.map((s) => s.id)
);

export function isOnboardingStepId(v: unknown): v is OnboardingStepId {
  return typeof v === "string" && STEP_ID_SET.has(v as OnboardingStepId);
}

export function getStepById(id: OnboardingStepId): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.id === id);
}
