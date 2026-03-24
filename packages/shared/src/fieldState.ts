/**
 * Field state types for the agent UI.
 * Aligned with API fieldStages and stageManager entity cache.
 */

export type EntityFieldName =
  | "dateOfBirth"
  | "state"
  | "gender"
  | "tobaccoUse"
  | "heightFeet"
  | "heightInches"
  | "weightLbs"
  | "coverageAmountDesired"
  | "productTypeInterest"
  | "termLengthDesired"
  | "budgetMonthly"
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "zip"
  | "tobaccoLastUsed"
  | "existingCoverage"
  | "existingCoverageAmount"
  | "beneficiaryName"
  | "beneficiaryRelation";

export interface FieldMeta {
  stage: "quote" | "application";
  weight: number;
  label: string;
}

/** Partial record of extracted entity fields (per-call entity cache shape). */
export type EntityState = Partial<Record<EntityFieldName, unknown>>;
