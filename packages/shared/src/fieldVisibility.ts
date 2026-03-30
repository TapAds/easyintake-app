import type { FieldKey } from "./fieldState";
import type {
  FieldVisibilityRule,
  VerticalFieldDefinition,
  VerticalConfig,
} from "./verticalConfig";

/** Whether a runtime value counts as “filled” for completeness. */
export function isVerticalFieldValueFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}

function normalizeComparable(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  return value;
}

export function visibilityConditionMet(
  fieldKey: FieldKey,
  expected: unknown,
  entities: Record<string, unknown>
): boolean {
  const actual = entities[fieldKey];
  const a = normalizeComparable(actual);
  const e = normalizeComparable(expected);
  if (typeof a === "boolean" || typeof e === "boolean") {
    return Boolean(a) === Boolean(e);
  }
  return a === e;
}

/** True if the field should be shown and counted for completeness. */
export function isFieldApplicable(
  rule: FieldVisibilityRule | undefined,
  entities: Record<string, unknown>
): boolean {
  const conds = rule?.allOf;
  if (!conds || conds.length === 0) return true;
  return conds.every((c) =>
    visibilityConditionMet(c.fieldKey, c.equals, entities)
  );
}

export function filterApplicableFields(
  fields: VerticalFieldDefinition[],
  entities: Record<string, unknown>
): VerticalFieldDefinition[] {
  return fields.filter((f) => isFieldApplicable(f.visibility, entities));
}

export function listApplicableFieldKeys(
  cfg: VerticalConfig,
  entities: Record<string, unknown>
): FieldKey[] {
  return filterApplicableFields(cfg.fields, entities).map((f) => f.key);
}

export function listMissingApplicableFieldKeys(
  cfg: VerticalConfig,
  entities: Record<string, unknown>
): FieldKey[] {
  return filterApplicableFields(cfg.fields, entities)
    .filter((f) => !isVerticalFieldValueFilled(entities[f.key]))
    .map((f) => f.key);
}
