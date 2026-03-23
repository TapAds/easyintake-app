/**
 * Represents a carrier and product selected by the agent and applicant.
 * Populated when Call.flowStage transitions to PRODUCT_SELECTED.
 *
 * Phase 1: set manually by the agent via the UI.
 * Phase 2: populated from a quote engine API response.
 */
export interface ProductConfig {
  carrierId: string;
  carrierName: string;
  productType: "term" | "whole" | "universal" | "final_expense";
  termLengthYears?: number;  // only relevant for term products
  estimatedMonthlyPremium?: number; // populated by quote engine in Phase 2
}
