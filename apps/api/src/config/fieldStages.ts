/**
 * Authoritative classification of LifeInsuranceEntity fields by flow stage.
 *
 * QUOTE_FIELDS   — minimum required to generate a life insurance quote.
 *                  Collected during QUOTE_COLLECTION stage.
 *
 * APPLICATION_FIELDS — full underwriting and application data.
 *                      Collected during FULL_APPLICATION stage (after product selected).
 *
 * This config is the single source of truth for:
 *   - services/scoring.ts   (stage-aware completeness score)
 *   - prompts/entityExtraction.ts  (which fields to extract per stage)
 *   - prompts/agentGuidance.ts     (which fields to prompt for per stage)
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
  | "preferredContactMethod"
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
  weight: number; // for completeness scoring within its stage
  label: string;  // human-readable label for agent UI and guidance prompts
}

export const FIELD_CONFIG: Record<EntityFieldName, FieldMeta> = {
  // ── Quote fields (QUOTE_COLLECTION stage) ────────────────────────────────
  dateOfBirth:           { stage: "quote", weight: 3, label: "Date of birth" },
  state:                 { stage: "quote", weight: 3, label: "State of residence" },
  gender:                { stage: "quote", weight: 3, label: "Gender" },
  tobaccoUse:            { stage: "quote", weight: 3, label: "Tobacco use" },
  heightFeet:            { stage: "quote", weight: 2, label: "Height (feet)" },
  heightInches:          { stage: "quote", weight: 2, label: "Height (inches)" },
  weightLbs:             { stage: "quote", weight: 2, label: "Weight" },
  coverageAmountDesired: { stage: "quote", weight: 3, label: "Coverage amount desired" },
  productTypeInterest:   { stage: "quote", weight: 2, label: "Product type (term, whole, etc.)" },
  termLengthDesired:     { stage: "quote", weight: 1, label: "Term length desired" },
  budgetMonthly:         { stage: "quote", weight: 2, label: "Monthly budget" },
  preferredContactMethod:{ stage: "quote", weight: 2, label: "Preferred contact method" },

  // ── Application fields (FULL_APPLICATION stage) ─────────────────────────
  firstName:             { stage: "application", weight: 3, label: "First name" },
  lastName:              { stage: "application", weight: 3, label: "Last name" },
  phone:                 { stage: "application", weight: 3, label: "Phone number" },
  email:                 { stage: "application", weight: 2, label: "Email address" },
  address:               { stage: "application", weight: 2, label: "Street address" },
  city:                  { stage: "application", weight: 2, label: "City" },
  zip:                   { stage: "application", weight: 2, label: "ZIP code" },
  tobaccoLastUsed:       { stage: "application", weight: 2, label: "Last tobacco use" },
  existingCoverage:      { stage: "application", weight: 2, label: "Existing life coverage" },
  existingCoverageAmount:{ stage: "application", weight: 1, label: "Existing coverage amount" },
  beneficiaryName:       { stage: "application", weight: 2, label: "Beneficiary name" },
  beneficiaryRelation:   { stage: "application", weight: 2, label: "Beneficiary relationship" },
};

export const QUOTE_FIELDS = (Object.keys(FIELD_CONFIG) as EntityFieldName[]).filter(
  (k) => FIELD_CONFIG[k].stage === "quote"
);

export const APPLICATION_FIELDS = (Object.keys(FIELD_CONFIG) as EntityFieldName[]).filter(
  (k) => FIELD_CONFIG[k].stage === "application"
);

/**
 * The minimum quote fields that must all be non-null before the call can
 * transition from QUOTE_COLLECTION → QUOTE_READY.
 *
 * These are the weight-3 quote fields — the absolute minimum a life insurance
 * quoting engine needs. Weight-2/1 fields improve quote accuracy but do not
 * block the transition.
 */
export const REQUIRED_QUOTE_FIELDS: EntityFieldName[] = (
  Object.keys(FIELD_CONFIG) as EntityFieldName[]
).filter((k) => FIELD_CONFIG[k].stage === "quote" && FIELD_CONFIG[k].weight === 3);
