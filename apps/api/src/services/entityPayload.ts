import { Gender, type LifeInsuranceEntity } from "@prisma/client";
import { EntityFieldName } from "../config/fieldStages";
import type { EntityState } from "./stageManager";

export type EntityData = Partial<Record<EntityFieldName, unknown>>;

export function toGenderEnum(value: unknown): Gender | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).toLowerCase();
  switch (s) {
    case "male":
      return Gender.MALE;
    case "female":
      return Gender.FEMALE;
    case "non-binary":
    case "nonbinary":
      return Gender.NON_BINARY;
    default:
      return Gender.UNKNOWN;
  }
}

export function toDateOfBirth(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    );
  }
  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEntityPayload(
  entity: EntityData,
  opts?: { fieldConfidences?: Record<string, number> }
): Record<string, any> {
  const extractedByAI: Record<string, unknown> = {
    ...(entity as Record<string, unknown>),
  };
  const fc = opts?.fieldConfidences;
  if (fc && Object.keys(fc).length > 0) {
    extractedByAI.fieldConfidences = fc;
  }
  return {
    firstName: entity.firstName as string | undefined,
    lastName: entity.lastName as string | undefined,
    dateOfBirth: toDateOfBirth(entity.dateOfBirth),
    gender: toGenderEnum(entity.gender),
    phone: entity.phone as string | undefined,
    email: entity.email as string | undefined,
    address: entity.address as string | undefined,
    city: entity.city as string | undefined,
    state: entity.state as string | undefined,
    zip: entity.zip as string | undefined,
    coverageAmountDesired: entity.coverageAmountDesired as number | undefined,
    productTypeInterest: entity.productTypeInterest as string | undefined,
    termLengthDesired: entity.termLengthDesired as number | undefined,
    budgetMonthly: entity.budgetMonthly as number | undefined,
    tobaccoUse: entity.tobaccoUse as boolean | undefined,
    tobaccoLastUsed: entity.tobaccoLastUsed as string | undefined,
    heightFeet: entity.heightFeet as number | undefined,
    heightInches: entity.heightInches as number | undefined,
    weightLbs: entity.weightLbs as number | undefined,
    existingCoverage: entity.existingCoverage as boolean | undefined,
    existingCoverageAmount: entity.existingCoverageAmount as number | undefined,
    beneficiaryName: entity.beneficiaryName as string | undefined,
    beneficiaryRelation: entity.beneficiaryRelation as string | undefined,
    extractedByAI,
  };
}

const ENTITY_ROW_SKIP = new Set([
  "id",
  "callId",
  "createdAt",
  "updatedAt",
  "extractedByAI",
  "rawExtractedText",
  "agentCorrected",
  "lastCorrectedAt",
  "originalLanguages",
]);

/**
 * Reconstructs a merge-friendly entity map from a DB row (typed columns + extractedByAI).
 * Cache / live extractions overlay on top of this in handleCallEnd.
 */
/** Reads per-field confidence map stored under extractedByAI.fieldConfidences. */
export function fieldConfidencesFromEntityRow(
  row: LifeInsuranceEntity | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  const ai = row?.extractedByAI;
  if (ai && typeof ai === "object" && !Array.isArray(ai)) {
    const fc = (ai as Record<string, unknown>).fieldConfidences;
    if (fc && typeof fc === "object" && !Array.isArray(fc)) {
      for (const [k, v] of Object.entries(fc)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          out[k] = Math.min(1, Math.max(0, v));
        }
      }
    }
  }
  return out;
}

export function entityRowToFlatState(row: LifeInsuranceEntity): EntityState {
  const out: EntityState = {};
  const ai = row.extractedByAI;
  if (ai && typeof ai === "object" && !Array.isArray(ai)) {
    const blob = ai as Record<string, unknown>;
    const { fieldConfidences: _fc, ...restBlob } = blob;
    Object.assign(out, restBlob);
  }
  for (const [k, v] of Object.entries(row)) {
    if (ENTITY_ROW_SKIP.has(k) || v === null || v === undefined) continue;
    if (k === "dateOfBirth" && v instanceof Date) {
      out.dateOfBirth = v.toISOString().slice(0, 10);
      continue;
    }
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function mergeDbEntityWithCache(
  existing: LifeInsuranceEntity | null,
  cached: EntityState
): EntityData {
  const fromDb = existing ? entityRowToFlatState(existing) : {};
  return { ...fromDb, ...cached } as EntityData;
}
