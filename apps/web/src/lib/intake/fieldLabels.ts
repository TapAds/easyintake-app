import type { VerticalConfig } from "@easy-intake/shared";
import { INSURANCE_VERTICAL_CONFIG } from "@easy-intake/shared";

function configForPackage(configPackageId: string): VerticalConfig | null {
  if (configPackageId === INSURANCE_VERTICAL_CONFIG.configPackageId) {
    return INSURANCE_VERTICAL_CONFIG;
  }
  return null;
}

/** Resolve display label for a field key using vertical config when available. */
export function fieldLabelForLocale(
  fieldKey: string,
  locale: string,
  configPackageId: string
): string {
  const cfg = configForPackage(configPackageId);
  if (!cfg) return fieldKey;
  const def = cfg.fields.find((f) => f.key === fieldKey);
  if (!def) return fieldKey;
  return locale === "es" ? def.labels.es : def.labels.en;
}
