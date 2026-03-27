import type { VerticalConfig } from "@easy-intake/shared";
import {
  INSURANCE_VERTICAL_CONFIG,
  USCIS_N400_VERTICAL_CONFIG,
} from "@easy-intake/shared";

/** Resolve loaded vertical config for a package id (demo + field labels). */
export function getVerticalConfigForPackage(
  configPackageId: string
): VerticalConfig | null {
  if (configPackageId === INSURANCE_VERTICAL_CONFIG.configPackageId) {
    return INSURANCE_VERTICAL_CONFIG;
  }
  if (configPackageId === USCIS_N400_VERTICAL_CONFIG.configPackageId) {
    return USCIS_N400_VERTICAL_CONFIG;
  }
  return null;
}

/** Resolve display label for a field key using vertical config when available. */
export function fieldLabelForLocale(
  fieldKey: string,
  locale: string,
  configPackageId: string
): string {
  const cfg = getVerticalConfigForPackage(configPackageId);
  if (!cfg) return fieldKey;
  const def = cfg.fields.find((f) => f.key === fieldKey);
  if (!def) return fieldKey;
  return locale === "es" ? def.labels.es : def.labels.en;
}
