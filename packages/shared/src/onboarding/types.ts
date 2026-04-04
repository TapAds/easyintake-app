/**
 * Shared types for org/user onboarding flow (web + API).
 */

export type OnboardingStepId =
  | "welcome"
  | "agency_profile"
  | "crm_connect"
  | "phone_setup"
  | "invite_team"
  | "first_call";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  required: boolean;
};

export type OnboardingState = {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  data: Record<string, unknown>;
  completedAt: string | null;
};

/** Default persisted shape when `AgencyConfig.onboarding` is null or invalid. */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
  completedAt: null,
};
