import type { OnboardingStepId } from "@easy-intake/shared";

/**
 * Linear agency onboarding flow; `"pipeline"` means continue to dashboard pipeline chat.
 */
export function getNextStep(
  currentStep: OnboardingStepId,
  _data: Record<string, unknown>
): OnboardingStepId | "pipeline" {
  switch (currentStep) {
    case "welcome":
      return "agency_profile";
    case "agency_profile":
      return "crm_connect";
    case "crm_connect":
      return "phone_setup";
    case "phone_setup":
      return "invite_team";
    case "invite_team":
      return "first_call";
    case "first_call":
      return "pipeline";
    default:
      return currentStep;
  }
}
