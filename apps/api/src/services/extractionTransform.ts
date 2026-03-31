/**
 * Transforms extraction_v2 output format into Easy Intake ExtractedEntities.
 *
 * V2 returns: { updates: [{ field, value, confidence }] }
 * Easy Intake expects: { firstName?: string, dateOfBirth?: string, ... }
 */

import { EntityFieldName } from "../config/fieldStages";

export interface V2Update {
  field: string;
  value: string | number | boolean;
  confidence?: number;
}

export interface V2ExtractionResult {
  updates?: V2Update[];
}

/** Maps V2 snake_case field names to Easy Intake camelCase EntityFieldName. */
export const V2_TO_EASY_INTAKE_FIELD: Record<string, EntityFieldName> = {
  first_name: "firstName",
  last_name: "lastName",
  dob: "dateOfBirth",
  gender: "gender",
  home_address: "address",
  city: "city",
  state: "state",
  zip: "zip",
  mobile_phone: "phone",
  home_phone: "phone",
  work_phone: "phone",
  email: "email",
  preferred_contact_method: "preferredContactMethod",
  face_amount: "coverageAmountDesired",
  term_length: "termLengthDesired",
  inforce_face_amount: "existingCoverageAmount",
  tobacco_use: "tobaccoUse",
  planned_premium: "budgetMonthly",
  product_name: "productTypeInterest",
  coverage_type: "productTypeInterest",
  has_inforce_insurance: "existingCoverage",
  primary_beneficiary_name: "beneficiaryName",
  primary_beneficiary_relationship: "beneficiaryRelation",
  height: "heightFeet", // may need special handling for feet+inches
  weight: "weightLbs",
};

/** Easy Intake → V2 prompt keys (one entity field may map to multiple V2 keys). */
export const EASY_INTAKE_TO_V2_KEYS: Partial<Record<EntityFieldName, string[]>> = (() => {
  const out: Partial<Record<EntityFieldName, string[]>> = {};
  for (const [v2, ei] of Object.entries(V2_TO_EASY_INTAKE_FIELD) as [string, EntityFieldName][]) {
    const arr = out[ei] ?? [];
    if (!arr.includes(v2)) arr.push(v2);
    out[ei] = arr;
  }
  return out;
})();

/**
 * V2 schema keys to prioritize for extraction given a set of entity fields (product / stage scope).
 */
export function getV2KeysForEntityFields(fields: EntityFieldName[]): string[] {
  const s = new Set<string>();
  for (const f of fields) {
    const keys = EASY_INTAKE_TO_V2_KEYS[f];
    if (keys) keys.forEach((k) => s.add(k));
  }
  return [...s];
}

export type EntityFieldValueSource = "ai" | "agent_confirmed" | "agent_edited";

/**
 * Builds `currentState` for the extraction user prompt: only agent-locked V2 keys.
 */
export function buildV2CurrentStateForPrompt(args: {
  entity: Partial<Record<EntityFieldName, unknown>>;
  sources: Partial<Record<EntityFieldName, EntityFieldValueSource>>;
}): Record<string, { value: string; source: string }> {
  const { entity, sources } = args;
  const out: Record<string, { value: string; source: string }> = {};
  for (const field of Object.keys(entity) as EntityFieldName[]) {
    const src = sources[field];
    if (src !== "agent_confirmed" && src !== "agent_edited") continue;
    const val = entity[field];
    if (val === null || val === undefined) continue;
    const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
    const v2keys = EASY_INTAKE_TO_V2_KEYS[field] ?? [];
    for (const v2k of v2keys) {
      out[v2k] = { value: strVal, source: src };
    }
  }
  return out;
}

/**
 * Normalizes a value for Easy Intake schema.
 * - gender: "M"|"F" -> "MALE"|"FEMALE"
 * - tobacco_use: "yes"|"no" -> boolean
 * - has_inforce_insurance: "yes"|"no" -> boolean
 * - Numeric strings -> number where appropriate
 */
function normalizeValue(
  v2Field: string,
  value: string | number | boolean
): unknown {
  const str = String(value).trim().toLowerCase();

  // Gender: M/F -> MALE/FEMALE
  if (v2Field === "gender") {
    if (str === "m" || str === "male" || str === "masculino") return "MALE";
    if (str === "f" || str === "female" || str === "femenino") return "FEMALE";
    return undefined;
  }

  // Yes/no -> boolean for tobacco, existing coverage
  if (v2Field === "tobacco_use") {
    if (str === "yes" || str === "true") return true;
    if (str === "no" || str === "false") return false;
    return undefined;
  }
  if (v2Field === "has_inforce_insurance") {
    if (str === "yes" || str === "true") return true;
    if (str === "no" || str === "false") return false;
    return undefined;
  }

  // Numeric fields
  if (
    v2Field === "face_amount" ||
    v2Field === "planned_premium" ||
    v2Field === "weight" ||
    v2Field === "annual_income" ||
    v2Field === "term_length" ||
    v2Field === "inforce_face_amount"
  ) {
    const num = Number(String(value).replace(/[^0-9.-]/g, ""));
    return isNaN(num) ? undefined : num;
  }

  // State: full name -> 2-char US code (for quote engines)
  if (v2Field === "state") {
    const stateMap: Record<string, string> = {
      alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
      colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
      hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
      kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
      massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
      missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
      "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
      "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
      "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN",
      texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
      "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
    };
    const code = stateMap[str];
    return code ?? (str.length === 2 ? str.toUpperCase() : String(value));
  }

  if (v2Field === "preferred_contact_method") {
    const allowed = new Set(["sms", "whatsapp", "email", "phone"]);
    if (allowed.has(str)) return str;
    if (
      str === "text" ||
      str.includes("text message") ||
      (str.includes("message") && str.includes("text"))
    )
      return "sms";
    if (str.includes("whatsapp") || str.includes("what's app")) return "whatsapp";
    if (
      str.includes("email") ||
      str.includes("e-mail") ||
      str.includes("correo") ||
      str.includes("mail")
    )
      return "email";
    if (
      str.includes("phone") ||
      str.includes("call") ||
      str.includes("teléfono") ||
      str.includes("telefono") ||
      str.includes("llamada")
    )
      return "phone";
    return undefined;
  }

  // Height: "5'10" or "5 feet 10 inches" -> heightFeet + heightInches
  if (v2Field === "height") {
    const val = String(value);
    const ftInMatch = val.match(/(\d+)\s*'?\s*(\d+)?\s*"?/);
    if (ftInMatch) {
      const feet = parseInt(ftInMatch[1], 10);
      const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
      return { heightFeet: feet, heightInches: inches };
    }
    const cmMatch = val.match(/(\d+)\s*cm/);
    if (cmMatch) {
      const cm = parseInt(cmMatch[1], 10);
      const totalInches = Math.round(cm / 2.54);
      return { heightFeet: Math.floor(totalInches / 12), heightInches: totalInches % 12 };
    }
    return undefined;
  }

  return value;
}

export type V2ExtractionEntitiesAndConfidence = {
  entities: Partial<Record<EntityFieldName, unknown>>;
  /** Per Easy Intake field key, model-reported confidence in [0, 1]. */
  fieldConfidences: Partial<Record<EntityFieldName, number>>;
};

/**
 * Converts extraction_v2 updates array into Easy Intake ExtractedEntities
 * and parallel confidence scores (max confidence when multiple V2 keys map
 * to one entity field).
 */
export function transformV2ToExtractedEntitiesWithConfidence(
  result: V2ExtractionResult
): V2ExtractionEntitiesAndConfidence {
  const entities: Partial<Record<EntityFieldName, unknown>> = {};
  const fieldConfidences: Partial<Record<EntityFieldName, number>> = {};
  const updates = result.updates ?? [];

  for (const { field, value, confidence = 0 } of updates) {
    if (confidence < 0.75) continue;

    const easyIntakeField = V2_TO_EASY_INTAKE_FIELD[field];
    if (!easyIntakeField) continue;

    const normalized = normalizeValue(field, value);

    if (field === "height" && typeof normalized === "object" && normalized !== null && "heightFeet" in normalized) {
      const h = normalized as { heightFeet: number; heightInches: number };
      entities.heightFeet = h.heightFeet;
      entities.heightInches = h.heightInches;
      const c = Math.max(fieldConfidences.heightFeet ?? 0, confidence);
      fieldConfidences.heightFeet = c;
      fieldConfidences.heightInches = c;
    } else if (normalized !== undefined && normalized !== null) {
      (entities as Record<string, unknown>)[easyIntakeField] = normalized;
      const prev = fieldConfidences[easyIntakeField] ?? 0;
      fieldConfidences[easyIntakeField] = Math.max(prev, confidence);
    }
  }

  return { entities, fieldConfidences };
}

/**
 * Converts extraction_v2 updates array into Easy Intake ExtractedEntities.
 * Filters by confidence >= 0.75, maps field names, normalizes values.
 */
export function transformV2ToExtractedEntities(
  result: V2ExtractionResult
): Partial<Record<EntityFieldName, unknown>> {
  return transformV2ToExtractedEntitiesWithConfidence(result).entities;
}
