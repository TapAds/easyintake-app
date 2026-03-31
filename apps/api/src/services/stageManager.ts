import { FlowStage } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { EntityFieldValueSource } from "./extractionTransform";
import {
  EntityFieldName,
  QUOTE_FIELDS,
  APPLICATION_FIELDS,
  REQUIRED_QUOTE_FIELDS,
} from "../config/fieldStages";
import {
  ProductType,
  PRODUCT_REQUIRED_FIELDS,
  isKnownProductType,
} from "../config/productRequirements";
import { ProductConfig } from "../types/product";
import { callEvents } from "../lib/callEvents";

export type EntityState = Partial<Record<EntityFieldName, unknown>>;

// ─── In-memory entity accumulator ────────────────────────────────────────────
//
// Accumulates extracted entity fields per callSid during a live call.
// Avoids a DB read/write on every utterance.
//
// Lifecycle:
//   - Initialised by initEntityCache() when a call starts
//   - Merged into on each utterance extraction
//   - Read by evaluateStageTransition() after each merge
//   - Flushed to DB by the call orchestrator on call end
//   - Cleared by clearEntityCache() after flush

const callEntityCache = new Map<string, EntityState>();

/** Per-field provenance for agent locks and prompt wiring (parallel to callEntityCache). */
const callFieldSourceCache = new Map<
  string,
  Partial<Record<string, EntityFieldValueSource>>
>();

/** Per-field combined AI+STT confidence in [0, 1] for agent UIs. */
const callFieldConfidenceCache = new Map<string, Record<string, number>>();

export function initEntityCache(callSid: string): void {
  if (!callEntityCache.has(callSid)) {
    callEntityCache.set(callSid, {});
  }
  if (!callFieldSourceCache.has(callSid)) {
    callFieldSourceCache.set(callSid, {});
  }
  if (!callFieldConfidenceCache.has(callSid)) {
    callFieldConfidenceCache.set(callSid, {});
  }
}

export function getFieldConfidenceCache(callSid: string): Record<string, number> {
  return { ...(callFieldConfidenceCache.get(callSid) ?? {}) };
}

function scaleStt(confidence: number | null | undefined): number {
  if (confidence == null || Number.isNaN(confidence)) return 1;
  if (confidence < 0) return 0;
  if (confidence > 1) return 1;
  return confidence;
}

/**
 * Per-field source map for the active call (ai vs agent-confirmed / agent-edited).
 */
export function getEntityFieldSources(
  callSid: string
): Partial<Record<string, EntityFieldValueSource>> {
  return { ...(callFieldSourceCache.get(callSid) ?? {}) };
}

/**
 * Merges newly extracted fields into the in-memory entity cache for a call.
 * Does not overwrite agent_confirmed / agent_edited fields.
 * Optionally updates per-field confidence (model × STT utterance confidence).
 */
export function mergeIntoEntityCache(
  callSid: string,
  extracted: EntityState,
  options?: {
    fieldConfidences?: Partial<Record<string, number>>;
    /** Deepgram / STT confidence for the triggering utterance, typically [0, 1]. */
    sttConfidence?: number | null;
  }
): EntityState {
  const current = callEntityCache.get(callSid) ?? {};
  const sources = callFieldSourceCache.get(callSid) ?? {};
  const confCache = { ...(callFieldConfidenceCache.get(callSid) ?? {}) };
  const stt = scaleStt(options?.sttConfidence);
  const fcIn = options?.fieldConfidences ?? {};

  console.log(`[extraction] mergeIntoEntityCache ${callSid} — incoming:`, JSON.stringify(extracted, null, 2));

  for (const [key, value] of Object.entries(extracted)) {
    if (value === null || value === undefined) continue;
    const src = sources[key];
    if (src === "agent_confirmed" || src === "agent_edited") continue;
    (current as Record<string, unknown>)[key] = value;
    sources[key] = "ai";
    const aiC = fcIn[key];
    if (typeof aiC === "number" && Number.isFinite(aiC)) {
      confCache[key] = Math.min(1, Math.max(0, aiC * stt));
    }
  }

  callFieldConfidenceCache.set(callSid, confCache);
  callFieldSourceCache.set(callSid, sources);
  callEntityCache.set(callSid, current);
  console.log(`[extraction] mergeIntoEntityCache ${callSid} — after merge:`, JSON.stringify(current, null, 2));
  return current;
}

/** Agent confirms the current cached value (locks against AI overwrites). */
export function applyAgentFieldConfirm(
  callSid: string,
  field: string
): EntityState {
  const current = callEntityCache.get(callSid) ?? {};
  const flat = current as Record<string, unknown>;
  if (flat[field] === null || flat[field] === undefined) return current;
  const sources = { ...(callFieldSourceCache.get(callSid) ?? {}) };
  sources[field] = "agent_confirmed";
  callFieldSourceCache.set(callSid, sources);
  const confCache = { ...(callFieldConfidenceCache.get(callSid) ?? {}) };
  confCache[field] = 1;
  callFieldConfidenceCache.set(callSid, confCache);
  return current;
}

/** Agent manually sets a value (locks as agent_edited). */
export function applyAgentFieldEdit(
  callSid: string,
  field: string,
  value: unknown
): EntityState {
  const current = { ...(callEntityCache.get(callSid) ?? {}) };
  const sources = { ...(callFieldSourceCache.get(callSid) ?? {}) };
  (current as Record<string, unknown>)[field] = value;
  sources[field] = "agent_edited";
  callEntityCache.set(callSid, current);
  callFieldSourceCache.set(callSid, sources);
  const confCache = { ...(callFieldConfidenceCache.get(callSid) ?? {}) };
  confCache[field] = 1;
  callFieldConfidenceCache.set(callSid, confCache);
  return current;
}

export function getEntityCache(callSid: string): EntityState {
  return callEntityCache.get(callSid) ?? {};
}

export function clearEntityCache(callSid: string): void {
  callEntityCache.delete(callSid);
  callFieldSourceCache.delete(callSid);
  callFieldConfidenceCache.delete(callSid);
}

// ─── Missing fields ───────────────────────────────────────────────────────────

/**
 * Returns field names that are null/undefined for the given stage.
 * Pure function — no DB access.
 */
export function getMissingFieldsByStage(
  entity: EntityState,
  stage: "quote" | "application"
): EntityFieldName[] {
  const fields = stage === "quote" ? QUOTE_FIELDS : APPLICATION_FIELDS;
  return fields.filter(
    (f) => entity[f] === null || entity[f] === undefined
  );
}

/**
 * Returns the canonical "quote" or "application" label for a Prisma FlowStage.
 * Used to scope extraction and guidance prompts.
 */
export function stageToScope(stage: FlowStage): "quote" | "application" {
  switch (stage) {
    case FlowStage.QUOTE_COLLECTION:
    case FlowStage.QUOTE_READY:
      return "quote";
    case FlowStage.PRODUCT_SELECTED:
    case FlowStage.FULL_APPLICATION:
      return "application";
  }
}

// ─── Transition conditions ────────────────────────────────────────────────────

/**
 * Returns true when all REQUIRED_QUOTE_FIELDS are non-null.
 * Sufficient condition to transition QUOTE_COLLECTION → QUOTE_READY.
 */
export function isQuoteReady(entity: EntityState): boolean {
  return REQUIRED_QUOTE_FIELDS.every(
    (f) => entity[f] !== null && entity[f] !== undefined
  );
}

/**
 * Returns the missing required fields for a known product type.
 * Used in the product-first flow to determine what to collect next.
 * Pure function — no DB access.
 */
export function getMissingFieldsForProduct(
  entity: EntityState,
  productType: ProductType
): EntityFieldName[] {
  return PRODUCT_REQUIRED_FIELDS[productType].filter(
    (f) => entity[f] === null || entity[f] === undefined
  );
}

/**
 * Returns true when all required fields for a specific product type are non-null.
 * Sufficient condition to transition QUOTE_COLLECTION → FULL_APPLICATION
 * in the product-first flow (skipping QUOTE_READY).
 */
export function isProductQuoteReady(
  entity: EntityState,
  productType: ProductType
): boolean {
  return PRODUCT_REQUIRED_FIELDS[productType].every(
    (f) => entity[f] !== null && entity[f] !== undefined
  );
}

// ─── Stage transition ─────────────────────────────────────────────────────────

/**
 * Evaluates whether the current stage should advance and, if so, writes the
 * new stage to the database and emits a "stage:transition" event.
 *
 * Automatic transitions:
 *
 *   Product-first flow (selectedProduct is a known ProductType):
 *     QUOTE_COLLECTION → FULL_APPLICATION
 *       when all product-specific required fields are non-null.
 *       QUOTE_READY is skipped — a product is already chosen.
 *
 *   Quote-first flow (selectedProduct is null/unknown):
 *     QUOTE_COLLECTION → QUOTE_READY
 *       when all generic REQUIRED_QUOTE_FIELDS are non-null.
 *
 * Manual transitions (not handled here — use selectProduct()):
 *   QUOTE_READY → FULL_APPLICATION
 *
 * @param selectedProduct — Call.selectedProduct value; drives flow detection.
 * @returns the stage after evaluation (may be unchanged)
 */
export async function evaluateStageTransition(
  callId: string,
  callSid: string,
  currentStage: FlowStage,
  entity: EntityState,
  selectedProduct?: string | null
): Promise<FlowStage> {
  if (currentStage !== FlowStage.QUOTE_COLLECTION) {
    return currentStage; // only auto-transitions apply in QUOTE_COLLECTION
  }

  const productType = isKnownProductType(selectedProduct) ? selectedProduct : null;

  // ── Product-first flow ────────────────────────────────────────────────────
  // Product is already known → skip QUOTE_READY, go directly to FULL_APPLICATION
  if (productType && isProductQuoteReady(entity, productType)) {
    await prisma.call.update({
      where: { id: callId },
      data: { flowStage: FlowStage.FULL_APPLICATION },
    });

    console.log(
      `[stageManager] ${callSid}: QUOTE_COLLECTION → FULL_APPLICATION ` +
      `(product-first, product=${productType})`
    );

    callEvents.emit("stage:transition", {
      callSid,
      from: FlowStage.QUOTE_COLLECTION,
      to: FlowStage.FULL_APPLICATION,
      flow: "product-first",
      productType,
    });

    return FlowStage.FULL_APPLICATION;
  }

  // ── Quote-first flow ──────────────────────────────────────────────────────
  // No product selected yet → advance to QUOTE_READY for quoting
  if (!productType && isQuoteReady(entity)) {
    await prisma.call.update({
      where: { id: callId },
      data: { flowStage: FlowStage.QUOTE_READY },
    });

    console.log(`[stageManager] ${callSid}: QUOTE_COLLECTION → QUOTE_READY (quote-first)`);

    callEvents.emit("stage:transition", {
      callSid,
      from: FlowStage.QUOTE_COLLECTION,
      to: FlowStage.QUOTE_READY,
      flow: "quote-first",
    });

    return FlowStage.QUOTE_READY;
  }

  return currentStage;
}

// ─── Manual transitions ───────────────────────────────────────────────────────

/**
 * QUOTE_READY → FULL_APPLICATION (via PRODUCT_SELECTED).
 *
 * Records the selected carrier and product on the Call, then immediately
 * advances to FULL_APPLICATION. PRODUCT_SELECTED is a point-in-time event,
 * not a resting state — the carrier/product fields capture the selection.
 *
 * Phase 2: this will be called with a real quote engine response.
 * Phase 1: called manually when the agent records a verbal product selection.
 */
export async function selectProduct(
  callId: string,
  callSid: string,
  product: ProductConfig
): Promise<void> {
  await prisma.call.update({
    where: { id: callId },
    data: {
      selectedCarrier: product.carrierName,
      selectedProduct: product.productType,
      flowStage: FlowStage.FULL_APPLICATION,
      agentDecisionMade: true,
    },
  });

  console.log(
    `[stageManager] ${callSid}: PRODUCT_SELECTED → FULL_APPLICATION ` +
    `(${product.carrierName} / ${product.productType})`
  );

  callEvents.emit("stage:transition", {
    callSid,
    from: FlowStage.PRODUCT_SELECTED,
    to: FlowStage.FULL_APPLICATION,
    product,
  });
}

/**
 * Reads the current flowStage and selectedProduct for a call from the database.
 * Returns both so callers can determine the active flow without a second query.
 * Always the authoritative source — never use cached stage for routing decisions.
 */
export async function getCurrentStage(
  callId: string
): Promise<{ flowStage: FlowStage; selectedProduct: string | null }> {
  const call = await prisma.call.findUniqueOrThrow({
    where: { id: callId },
    select: { flowStage: true, selectedProduct: true },
  });
  return { flowStage: call.flowStage, selectedProduct: call.selectedProduct };
}
