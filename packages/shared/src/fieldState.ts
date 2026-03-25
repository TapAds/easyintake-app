/**
 * Generic field identity and runtime value maps for vertical-agnostic intake.
 * Vertical-specific catalogs live in VerticalConfig / per-vertical packages.
 */

/** Stable string identity for a field in config and runtime state (was insurance-only enum). */
export type FieldKey = string;

/** Extracted or collected field values keyed by field id. */
export type FieldValueMap = Partial<Record<FieldKey, unknown>>;

/**
 * Legacy name for per-call entity cache shape.
 * Prefer FieldValueMap in new code.
 */
export type EntityState = FieldValueMap;
