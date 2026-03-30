import type {
  VerticalConfig,
  VerticalFieldDefinition,
  VerticalSection,
} from "@easy-intake/shared";
import {
  isFieldApplicable,
  isVerticalFieldValueFilled,
} from "@easy-intake/shared";

/** True if the entity value counts as collected for completion bars. */
export const isFieldValueFilled = isVerticalFieldValueFilled;

export type SectionCompletionRow = {
  sectionId: string;
  label: string;
  percent: number;
  filled: number;
  total: number;
};

/** Sections in catalog order, each with fields ordered within the section. */
export function groupFieldsBySection(
  cfg: VerticalConfig,
  entities?: Record<string, unknown>
): Array<{ section: VerticalSection; fields: VerticalFieldDefinition[] }> {
  const sortedSections = [...cfg.sections].sort((a, b) => a.order - b.order);
  return sortedSections
    .map((section) => ({
      section,
      fields: cfg.fields
        .filter((f) => f.sectionId === section.id)
        .filter((f) =>
          entities === undefined ? true : isFieldApplicable(f.visibility, entities)
        )
        .sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.fields.length > 0);
}

/**
 * Per-section fill ratio for every field in the vertical catalog (all application fields).
 */
export function computeSectionCompletion(
  cfg: VerticalConfig,
  entities: Record<string, unknown>,
  locale: string
): SectionCompletionRow[] {
  const sortedSections = [...cfg.sections].sort((a, b) => a.order - b.order);
  const rows: SectionCompletionRow[] = [];

  for (const sec of sortedSections) {
    const fieldsInSection = cfg.fields.filter(
      (f) =>
        f.sectionId === sec.id && isFieldApplicable(f.visibility, entities)
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
