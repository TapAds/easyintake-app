import { EntityFieldName } from "./fieldStages";

/**
 * Life insurance product types supported in Phase 1.
 * Matches the values stored in Call.selectedProduct.
 */
export type ProductType = "term" | "whole" | "universal" | "final_expense";

/**
 * Per-product required fields to be considered quote-ready.
 *
 * These are the fields that must be non-null before the system can usefully
 * collect data for a specific product. Used only in the product-first flow
 * (when the applicant has already indicated a product type).
 *
 * Key differences from generic REQUIRED_QUOTE_FIELDS:
 *
 *   term         — requires termLengthDesired (quote engines need the term)
 *   whole        — no term length; permanent coverage assumed
 *   universal    — requires budgetMonthly (UL is premium-driven, not face-value-driven)
 *   final_expense— no tobaccoUse (simplified-issue: no medical underwriting)
 *                  no height/weight (guaranteed-issue eligible)
 *                  smaller coverage amounts, age + state sufficient to quote
 */
export const PRODUCT_REQUIRED_FIELDS: Record<ProductType, EntityFieldName[]> = {
  term: [
    "dateOfBirth",
    "state",
    "gender",
    "tobaccoUse",
    "coverageAmountDesired",
    "termLengthDesired", // term-specific: quote engines require term length
  ],
  whole: [
    "dateOfBirth",
    "state",
    "gender",
    "tobaccoUse",
    "coverageAmountDesired",
  ],
  universal: [
    "dateOfBirth",
    "state",
    "gender",
    "tobaccoUse",
    "coverageAmountDesired",
    "budgetMonthly", // UL pricing is premium-first, not face-value-first
  ],
  final_expense: [
    "dateOfBirth",
    "state",
    "gender",
    "coverageAmountDesired",
    // tobaccoUse excluded: most final expense products are simplified-issue
    // height/weight excluded: guaranteed-issue products don't require BMI
  ],
};

/**
 * Returns true if the given string is a known ProductType.
 */
export function isKnownProductType(value: string | null | undefined): value is ProductType {
  return (
    value === "term" ||
    value === "whole" ||
    value === "universal" ||
    value === "final_expense"
  );
}
