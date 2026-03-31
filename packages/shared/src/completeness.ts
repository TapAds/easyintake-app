import type { FieldKey } from "./fieldState";
import type { VerticalConfig } from "./verticalConfig";
import {
  filterApplicableFields,
  isVerticalFieldValueFilled,
} from "./fieldVisibility";
import type { CompletenessSnapshot, SessionFieldValues } from "./intakeSession";
import { unwrapSessionFieldValues } from "./sessionFieldValues";

/**
 * Required keys for scoring: explicit `requiredFieldKeys` intersected with applicable fields,
 * or all applicable field keys when `requiredFieldKeys` is absent.
 */
export function resolveRequiredKeysForCompleteness(
  cfg: VerticalConfig,
  entities: Record<string, unknown>
): FieldKey[] {
  const applicable = filterApplicableFields(cfg.fields, entities);
  const applicableSet = new Set(applicable.map((f) => f.key));
  const declared = cfg.requiredFieldKeys?.filter((k) => applicableSet.has(k));
  if (declared && declared.length > 0) return declared;
  return applicable.map((f) => f.key);
}

export function computeCompletenessSnapshot(
  cfg: VerticalConfig | null,
  fieldValues: SessionFieldValues | Record<string, unknown>
): CompletenessSnapshot {
  if (!cfg) {
    return { score: 0, missingRequiredKeys: [] };
  }
  const entities = unwrapSessionFieldValues(fieldValues);
  const requiredKeys = resolveRequiredKeysForCompleteness(cfg, entities);
  const missingRequiredKeys = requiredKeys.filter(
    (k) => !isVerticalFieldValueFilled(entities[k])
  );
  const score =
    requiredKeys.length === 0
      ? 1
      : (requiredKeys.length - missingRequiredKeys.length) / requiredKeys.length;
  return {
    score,
    missingRequiredKeys,
  };
}
