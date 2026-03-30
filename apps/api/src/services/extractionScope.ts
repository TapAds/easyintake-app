import {
  EntityFieldName,
  QUOTE_FIELDS,
  APPLICATION_FIELDS,
} from "../config/fieldStages";
import {
  ProductType,
  PRODUCT_REQUIRED_FIELDS,
  isKnownProductType,
} from "../config/productRequirements";
import { getV2KeysForEntityFields } from "./extractionTransform";

/**
 * Entity fields in scope for this extraction pass (drives prompt priority list).
 */
export function entityFieldsForExtractionScope(
  scope: "quote" | "application" | "all",
  selectedProduct: string | null | undefined
): EntityFieldName[] | null {
  if (scope === "all") return null;

  if (scope === "quote") {
    let fields = [...QUOTE_FIELDS];
    if (selectedProduct && isKnownProductType(selectedProduct)) {
      const required = PRODUCT_REQUIRED_FIELDS[selectedProduct as ProductType];
      fields = [...new Set([...fields, ...required])];
    }
    return fields;
  }

  return [...QUOTE_FIELDS, ...APPLICATION_FIELDS];
}

/**
 * Short hint appended to the system prompt listing priority V2 keys.
 */
export function extractionScopeHint(
  scope: "quote" | "application" | "all",
  selectedProduct: string | null | undefined
): string {
  const ef = entityFieldsForExtractionScope(scope, selectedProduct);
  if (!ef) {
    return "SCOPE: Full application schema — any valid field may appear in updates.";
  }
  const v2 = getV2KeysForEntityFields(ef);
  return `SCOPE (prioritize these when the dialogue supports it): ${v2.sort().join(", ")}`;
}
