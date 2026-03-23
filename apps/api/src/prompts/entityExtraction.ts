import Anthropic from "@anthropic-ai/sdk";
import { QUOTE_FIELDS, APPLICATION_FIELDS, FIELD_CONFIG, EntityFieldName } from "../config/fieldStages";

/**
 * System prompt for life insurance entity extraction.
 *
 * Constraints:
 * - You are an internal tool — never address the applicant directly.
 * - Extract only what was explicitly stated. Do not infer or hallucinate.
 * - Return null for any field not clearly mentioned.
 */
export const ENTITY_EXTRACTION_SYSTEM = `You are an internal data extraction tool for an insurance agency.
You listen to transcripts of calls between an insurance agent and a life insurance applicant.
Your job is to extract structured data from the transcript.

Rules:
- Only extract information that was explicitly stated in the transcript.
- Do not infer, guess, or fill in fields that were not clearly mentioned.
- If a field was not discussed, return null for that field.
- Dates of birth must be returned as ISO-8601 strings (YYYY-MM-DD). If only partial info is given (e.g. "born in 1980"), return null.
- Dollar amounts should be returned as integers (e.g. "$500,000" → 500000).
- State should be a 2-character US code (e.g. "Florida" → "FL").
- Gender must be one of: MALE, FEMALE, NON_BINARY, UNKNOWN.
- tobaccoLastUsed must be one of: "never", "<1yr", "1-3yr", "3+yr".
- productTypeInterest must be one of: "term", "whole", "universal", "final_expense".
- The transcript may contain English and Spanish. Extract from both languages.
- You are an internal system. Never produce output addressed to the applicant.`;

// Full property definitions for every field — the tool schema is assembled
// per-stage by selecting only the relevant subset.
const ALL_FIELD_PROPERTIES: Record<EntityFieldName, object> = {
  // Quote fields
  dateOfBirth:            { type: ["string", "null"], description: "Date of birth as YYYY-MM-DD" },
  state:                  { type: ["string", "null"], description: "2-char US state code" },
  gender:                 { type: ["string", "null"], enum: ["MALE", "FEMALE", "NON_BINARY", "UNKNOWN", null] },
  tobaccoUse:             { type: ["boolean", "null"], description: "Whether applicant uses tobacco" },
  heightFeet:             { type: ["integer", "null"], description: "Height in feet" },
  heightInches:           { type: ["integer", "null"], description: "Additional inches beyond feet" },
  weightLbs:              { type: ["integer", "null"], description: "Weight in pounds" },
  coverageAmountDesired:  { type: ["integer", "null"], description: "Desired face value in dollars" },
  productTypeInterest:    { type: ["string", "null"], enum: ["term", "whole", "universal", "final_expense", null] },
  termLengthDesired:      { type: ["integer", "null"], description: "Desired term length in years" },
  budgetMonthly:          { type: ["integer", "null"], description: "Max monthly premium in dollars" },
  // Application fields
  firstName:              { type: ["string", "null"], description: "Applicant first name" },
  lastName:               { type: ["string", "null"], description: "Applicant last name" },
  phone:                  { type: ["string", "null"], description: "Phone number" },
  email:                  { type: ["string", "null"], description: "Email address" },
  address:                { type: ["string", "null"], description: "Street address" },
  city:                   { type: ["string", "null"], description: "City" },
  zip:                    { type: ["string", "null"], description: "ZIP code" },
  tobaccoLastUsed:        { type: ["string", "null"], enum: ["never", "<1yr", "1-3yr", "3+yr", null] },
  existingCoverage:       { type: ["boolean", "null"], description: "Whether applicant has existing life coverage" },
  existingCoverageAmount: { type: ["integer", "null"], description: "Existing death benefit in dollars" },
  beneficiaryName:        { type: ["string", "null"], description: "Primary beneficiary full name" },
  beneficiaryRelation:    { type: ["string", "null"], description: "Beneficiary relationship to applicant" },
};

/**
 * Builds a stage-scoped Claude tool definition for entity extraction.
 * In QUOTE_COLLECTION only quote fields are included.
 * In FULL_APPLICATION all fields are included.
 */
export function buildExtractionTool(
  stage: "quote" | "application" | "all"
): Anthropic.Tool {
  let fields: EntityFieldName[];

  if (stage === "quote") {
    fields = QUOTE_FIELDS;
  } else if (stage === "application") {
    fields = APPLICATION_FIELDS;
  } else {
    fields = [...QUOTE_FIELDS, ...APPLICATION_FIELDS];
  }

  const properties = Object.fromEntries(
    fields.map((f) => [f, ALL_FIELD_PROPERTIES[f]])
  );

  const stageLabel =
    stage === "quote"
      ? "quoting"
      : stage === "application"
      ? "full application underwriting"
      : "all stages";

  return {
    name: "extract_life_insurance_entities",
    description: `Extract life insurance fields needed for ${stageLabel} from a call transcript. Return null for any field not explicitly mentioned.`,
    input_schema: {
      type: "object" as const,
      properties,
      required: [],
    },
  };
}

/**
 * Builds the user message for entity extraction from a transcript window.
 */
export function buildExtractionUserMessage(
  utterances: { speaker: string; text: string; languageCode: string }[],
  stage: "quote" | "application" | "all"
): string {
  const stageLabel =
    stage === "quote"
      ? "quoting data only"
      : stage === "application"
      ? "full application underwriting data"
      : "all available fields";

  const lines = utterances
    .map((u) => `[${u.speaker}] (${u.languageCode}): ${u.text}`)
    .join("\n");

  return `Extract life insurance entities (${stageLabel}) from the following call transcript:\n\n${lines}`;
}
