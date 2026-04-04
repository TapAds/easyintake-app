import type { OrgPipelineConfig } from "@easy-intake/shared";
import { parseOrgPipelineConfig } from "@easy-intake/shared";
import {
  ORG_PUBLIC_ONBOARDING_COMPLETE,
  ORG_PUBLIC_PIPELINE_CONFIG,
} from "@/lib/settings/orgProfile";

export function readOrgPipelineAndOnboarding(pm: Record<string, unknown>): {
  pipelineConfig: OrgPipelineConfig | null;
  onboardingComplete: boolean;
} {
  const rawPipeline = pm[ORG_PUBLIC_PIPELINE_CONFIG];
  const pipelineConfig =
    rawPipeline !== undefined && rawPipeline !== null
      ? parseOrgPipelineConfig(rawPipeline)
      : null;
  const oc = pm[ORG_PUBLIC_ONBOARDING_COMPLETE];
  const onboardingComplete = oc === true;
  return { pipelineConfig, onboardingComplete };
}
