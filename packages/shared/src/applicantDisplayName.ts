import type { SessionFieldValues } from "./intakeSession";
import { getVerticalConfigForPackageId } from "./verticalConfigResolve";
import { unwrapSessionFieldValues } from "./sessionFieldValues";

function trimString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * Builds a single-line applicant label from session field values using
 * convention keys (firstName / givenName, lastName / familyName, optional middleName).
 * When a vertical config exists, only keys declared on that config are used.
 */
export function applicantDisplayNameFromFieldValues(
  fieldValues: SessionFieldValues | Record<string, unknown>,
  configPackageId: string
): string | null {
  const flat = unwrapSessionFieldValues(fieldValues) as Record<string, unknown>;
  const cfg = getVerticalConfigForPackageId(configPackageId);
  const allowed =
    cfg !== null ? new Set(cfg.fields.map((f) => f.key as string)) : null;

  const take = (key: string): string | null => {
    if (allowed && !allowed.has(key)) return null;
    return trimString(flat[key]);
  };

  const first = take("firstName") ?? take("givenName");
  const middle = take("middleName");
  const last = take("lastName") ?? take("familyName");

  const parts: string[] = [];
  if (first) parts.push(first);
  if (middle) parts.push(middle);
  if (last) parts.push(last);

  const name = parts.join(" ").trim();
  return name || null;
}
