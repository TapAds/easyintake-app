"use client";

import { fieldLabelForLocale } from "@/lib/intake/fieldLabels";
import {
  computeSectionCompletion,
  groupFieldsBySection,
  overallCompletionPercent,
} from "@/lib/intake/sectionCompletion";
import { USCIS_N400_VERTICAL_CONFIG } from "@easy-intake/shared";
import type { VerticalFieldDefinition } from "@easy-intake/shared";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

function enumValuesForField(field: VerticalFieldDefinition): string[] {
  const rule = field.validation?.find((v) => v.kind === "enum");
  return Array.isArray(rule?.value) ? (rule.value as string[]) : [];
}

function fieldControl(
  field: VerticalFieldDefinition,
  value: unknown,
  onChange: (v: unknown) => void,
  tEnum: (key: string) => string,
  enumPlaceholder: string
) {
  if (field.type === "enum") {
    const values = enumValuesForField(field);
    const str = value === undefined || value === null ? "" : String(value);
    return (
      <select
        className="w-full rounded border border-foreground/20 bg-background px-2 py-1.5 text-sm"
        value={str}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : v);
        }}
      >
        <option value="">{enumPlaceholder}</option>
        {values.map((opt) => (
          <option key={opt} value={opt}>
            {tEnum(opt)}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    return (
      <input
        type="checkbox"
        className="rounded border-foreground/25"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  const inputType =
    field.type === "date"
      ? "date"
      : field.type === "number" || field.type === "currency"
        ? "number"
        : "text";
  return (
    <input
      type={inputType}
      className="w-full rounded border border-foreground/20 bg-background px-2 py-1.5 text-sm"
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (field.type === "number" || field.type === "currency") {
          onChange(raw === "" ? undefined : Number(raw));
        } else {
          onChange(raw);
        }
      }}
    />
  );
}

export function N400WebformDemoClient() {
  const t = useTranslations("intake.n400Demo");
  const tEnum = useTranslations("intake.enumOptions");
  const locale = useLocale();
  const pkg = USCIS_N400_VERTICAL_CONFIG.configPackageId;
  const [values, setValues] = useState<Record<string, unknown>>({});

  const groups = useMemo(
    () => groupFieldsBySection(USCIS_N400_VERTICAL_CONFIG, values),
    [values]
  );

  const sectionRows = useMemo(
    () => computeSectionCompletion(USCIS_N400_VERTICAL_CONFIG, values, locale),
    [values, locale]
  );

  const overallPct = useMemo(
    () => overallCompletionPercent(sectionRows, undefined),
    [sectionRows]
  );

  const setField = useCallback((key: string, v: unknown) => {
    setValues((prev) => {
      const next = { ...prev };
      if (v === undefined || v === null || v === "") {
        delete next[key];
        return next;
      }
      next[key] = v;
      return next;
    });
  }, []);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-foreground/70">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/dashboard/live-call`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("openLiveCall")}
        </Link>
      </div>

      {sectionRows.length > 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 text-xs space-y-3">
          <div className="h-2.5 w-full rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/90 transition-[width] duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-foreground">
              {t("sectionCompletionTitle")}
            </span>
            <span className="tabular-nums text-foreground/80">
              {t("overallComplete")}: {overallPct}%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sectionRows.map((row) => (
              <div key={row.sectionId} className="min-w-0">
                <div
                  className="flex justify-between gap-2 text-[10px] text-foreground/70 mb-1"
                  title={row.label}
                >
                  <span className="truncate">{row.label}</span>
                  <span className="shrink-0 tabular-nums">{row.percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/90 transition-[width]"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {groups.map(({ section, fields }) => (
          <div
            key={section.id}
            className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-foreground/10 bg-foreground/[0.04]">
              <h2 className="text-sm font-semibold">
                {locale === "es" ? section.labels.es : section.labels.en}
              </h2>
              {section.description ? (
                <p className="text-[11px] text-foreground/60 mt-0.5">
                  {locale === "es"
                    ? section.description.es
                    : section.description.en}
                </p>
              ) : null}
            </div>
            <div className="p-3 grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="block text-xs space-y-1">
                  <span className="font-medium text-foreground/80">
                    {fieldLabelForLocale(field.key, locale, pkg)}
                  </span>
                  {fieldControl(
                    field,
                    values[field.key],
                    (v) => setField(field.key, v),
                    (k) => tEnum(k),
                    t("enumPlaceholder")
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-foreground/10 p-3">
        <h3 className="text-xs font-semibold text-foreground/70 mb-2">
          {t("sessionJson")}
        </h3>
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-foreground/85 max-h-64 overflow-auto">
          {JSON.stringify(values, null, 2)}
        </pre>
      </div>
    </div>
  );
}
