import type { FieldKey } from "./fieldState";
import type {
  FieldValueSource,
  FieldValueWithMeta,
  IntakeChannelType,
  SessionFieldValues,
} from "./intakeSession";

/**
 * Flat map of current values for vertical helpers (visibility, completeness).
 * Unwraps FieldValueWithMeta cells; ignores empty object cells.
 */
export function unwrapSessionFieldValues(
  fv: SessionFieldValues | Record<string, unknown>
): Record<FieldKey, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fv)) {
    if (v && typeof v === "object" && !Array.isArray(v) && "value" in v) {
      const val = (v as FieldValueWithMeta).value;
      if (val !== undefined) out[k] = val;
    } else if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}

export function wrapFieldCell(
  value: unknown,
  source: FieldValueSource,
  channel: IntakeChannelType
): FieldValueWithMeta {
  return {
    value,
    provenance: {
      source,
      channel,
      updatedAt: new Date().toISOString(),
    },
  };
}
