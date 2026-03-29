import { type EntityFieldName, REQUIRED_QUOTE_FIELDS } from "../config/fieldStages";

function isCellFilled(fieldValues: Record<string, unknown>, key: string): boolean {
  const cell = fieldValues[key];
  if (!cell || typeof cell !== "object" || !("value" in cell)) {
    return false;
  }
  const v = (cell as { value: unknown }).value;
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

/**
 * GapAnalyzer (Phase 5) — compares session fieldValues to insurance quote minimums
 * from `fieldStages` (same basis as quote readiness elsewhere). Vertical-agnostic
 * layering can swap this for VerticalConfig.requiredFieldKeys later.
 */
export function analyzeQuoteFieldGaps(fieldValues: Record<string, unknown>): {
  missingKeys: EntityFieldName[];
} {
  const missingKeys: EntityFieldName[] = [];
  for (const key of REQUIRED_QUOTE_FIELDS) {
    if (!isCellFilled(fieldValues, key)) {
      missingKeys.push(key);
    }
  }
  return { missingKeys };
}
