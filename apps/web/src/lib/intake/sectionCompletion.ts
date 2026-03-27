import type { VerticalConfig } from "@easy-intake/shared";

/** True if the entity value counts as collected for completion bars. */
export function isFieldValueFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}

export type SectionCompletionRow = {
  sectionId: string;
  label: string;
  percent: number;
  filled: number;
  total: number;
};

/**
 * Per-section fill ratio for fields that appear in the live demo preset for this package.
 */
export function computeSectionCompletion(
  cfg: VerticalConfig,
  visibleFieldKeys: string[],
  entities: Record<string, unknown>,
  locale: string
): SectionCompletionRow[] {
  const visible = new Set(visibleFieldKeys);
  const sortedSections = [...cfg.sections].sort((a, b) => a.order - b.order);
  const rows: SectionCompletionRow[] = [];

  for (const sec of sortedSections) {
    const fieldsInSection = cfg.fields.filter(
      (f) => visible.has(f.key) && f.sectionId === sec.id
    );
    if (fieldsInSection.length === 0) continue;

    let filled = 0;
    for (const f of fieldsInSection) {
      if (isFieldValueFilled(entities[f.key])) filled++;
    }
    const total = fieldsInSection.length;
    const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
    rows.push({
      sectionId: sec.id,
      label: locale === "es" ? sec.labels.es : sec.labels.en,
      percent,
      filled,
      total,
    });
  }

  return rows;
}

/**
 * Overall percent: prefer live engine completeness score when present; else weighted by visible fields.
 */
export function overallCompletionPercent(
  sectionRows: SectionCompletionRow[],
  scoreOverall: number | null | undefined
): number {
  if (scoreOverall != null && !Number.isNaN(scoreOverall)) {
    return Math.round(scoreOverall * 100);
  }
  if (sectionRows.length === 0) return 0;
  let filled = 0;
  let total = 0;
  for (const r of sectionRows) {
    filled += r.filled;
    total += r.total;
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}
