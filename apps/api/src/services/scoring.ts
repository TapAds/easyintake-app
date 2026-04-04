import {
  EntityFieldName,
  FIELD_CONFIG,
  QUOTE_FIELDS,
  APPLICATION_FIELDS,
} from "../config/fieldStages";
import { filterApplicableFields, USCIS_N400_VERTICAL_CONFIG } from "@easy-intake/shared";
import { EntityState } from "./stageManager";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreTier = "incomplete" | "partial" | "qualified";

export interface StageScore {
  score: number;       // 0–1 fraction of weighted fields collected
  collected: number;   // sum of weights for non-null fields
  total: number;       // sum of all possible weights for this stage
}

export interface CompletenessScore {
  /** Fraction of quote-stage weighted fields collected (0–1). */
  quoteReadiness: StageScore;

  /** Fraction of application-stage weighted fields collected (0–1). */
  applicationReadiness: StageScore;

  /**
   * Combined score for thresholding GHL sync and SMS follow-up.
   * Weighted average: quote fields count for 60%, application fields for 40%.
   * Rationale: quote data is the minimum viable lead; application data is
   * required for underwriting but not for initial quoting.
   */
  overall: number;

  /** Tier label derived from overall score. */
  tier: ScoreTier;
}

// ─── Weights ──────────────────────────────────────────────────────────────────

const OVERALL_QUOTE_WEIGHT = 0.6;
const OVERALL_APPLICATION_WEIGHT = 0.4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreStage(
  entity: EntityState,
  fields: EntityFieldName[]
): StageScore {
  let collected = 0;
  let total = 0;

  for (const field of fields) {
    const weight = FIELD_CONFIG[field].weight;
    total += weight;
    if (entity[field] !== null && entity[field] !== undefined) {
      collected += weight;
    }
  }

  return {
    score: total === 0 ? 0 : collected / total,
    collected,
    total,
  };
}

function tierFromScore(overall: number): ScoreTier {
  if (overall >= 0.7) return "qualified";
  if (overall >= 0.4) return "partial";
  return "incomplete";
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Computes a stage-aware completeness score from the current entity state.
 *
 * - `quoteReadiness`  — how complete the quote-stage fields are
 * - `applicationReadiness` — how complete the application-stage fields are
 * - `overall` — weighted combination (60% quote, 40% application)
 * - `tier` — "incomplete" | "partial" | "qualified" per plan thresholds
 *
 * Pure function — no DB access, no side effects.
 */
export function computeCompletenessScore(entity: EntityState): CompletenessScore {
  const quoteReadiness = scoreStage(entity, QUOTE_FIELDS);
  const applicationReadiness = scoreStage(entity, APPLICATION_FIELDS);

  const overall =
    quoteReadiness.score * OVERALL_QUOTE_WEIGHT +
    applicationReadiness.score * OVERALL_APPLICATION_WEIGHT;

  return {
    quoteReadiness,
    applicationReadiness,
    overall,
    tier: tierFromScore(overall),
  };
}

/**
 * Weight-sum completeness over applicable (visibility-respecting) N-400 catalog fields.
 */
export function computeN400CompletenessScore(entity: Record<string, unknown>): {
  overall: number;
  tier: ScoreTier;
} {
  const fields = filterApplicableFields(USCIS_N400_VERTICAL_CONFIG.fields, entity);
  let collected = 0;
  let total = 0;
  for (const f of fields) {
    const w = f.weight ?? 1;
    total += w;
    const v = entity[f.key];
    if (
      v !== null &&
      v !== undefined &&
      !(typeof v === "string" && String(v).trim() === "")
    ) {
      collected += w;
    }
  }
  const overall = total === 0 ? 0 : collected / total;
  return { overall, tier: tierFromScore(overall) };
}

/**
 * Dual readiness for N-400: catalog field fill vs evidence checklist (orchestrator / NBA).
 */
export function computeN400FieldAndEvidenceReadiness(
  entity: Record<string, unknown>,
  evidenceCompletion01: number
): { fieldCompletion: number; evidenceCompletion: number; tier: ScoreTier } {
  const { overall } = computeN400CompletenessScore(entity);
  const ec = Math.max(0, Math.min(1, evidenceCompletion01));
  const blended = overall * 0.55 + ec * 0.45;
  return {
    fieldCompletion: overall,
    evidenceCompletion: ec,
    tier: tierFromScore(blended),
  };
}
