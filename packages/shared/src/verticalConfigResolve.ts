import type { VerticalConfig } from "./verticalConfig";
import { INSURANCE_VERTICAL_CONFIG } from "./verticals/insurance";
import { USCIS_N400_VERTICAL_CONFIG } from "./verticals/uscisN400";

/** Resolve packaged vertical config by session `configPackageId`. */
export function getVerticalConfigForPackageId(
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
