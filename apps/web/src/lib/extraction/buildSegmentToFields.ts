/**
 * Maps extraction events to field keys.
 * Vertical-agnostic: field mapping is config-driven.
 */

export interface ExtractionEvent {
  field: string;
  value: unknown;
  confidence?: number;
}

export interface SegmentToFieldsConfig {
  /** Maps raw extraction field names to canonical field keys */
  fieldMap?: Record<string, string>;
  /** Minimum confidence to include (0-1) */
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.75;

/**
 * Builds a record of fields from extraction events.
 */
export function buildSegmentToFields(
  events: ExtractionEvent[],
  config: SegmentToFieldsConfig = {}
): Record<string, unknown> {
  const { fieldMap = {}, minConfidence = DEFAULT_MIN_CONFIDENCE } = config;
  const out: Record<string, unknown> = {};

  for (const ev of events) {
    if (ev.confidence !== undefined && ev.confidence < minConfidence) continue;
    const key = fieldMap[ev.field] ?? ev.field;
    if (ev.value !== undefined && ev.value !== null) {
      out[key] = ev.value;
    }
  }
  return out;
}
