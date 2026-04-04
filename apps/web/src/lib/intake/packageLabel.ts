import { LIVE_DEMO_PRESETS } from "@easy-intake/shared";

/** Human-readable product label for a `configPackageId`, when known from demo presets. */
export function intakePackageLabel(configPackageId: string, locale: string): string {
  const preset = LIVE_DEMO_PRESETS.find((p) => p.configPackageId === configPackageId);
  if (!preset) return configPackageId;
  return locale === "es" ? preset.labels.es : preset.labels.en;
}
