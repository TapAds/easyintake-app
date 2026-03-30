"use client";

import { fieldLabelForLocale } from "@/lib/intake/fieldLabels";
import { groupFieldsBySection } from "@/lib/intake/sectionCompletion";
import { USCIS_N400_VERTICAL_CONFIG } from "@easy-intake/shared";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

function fieldInput(
  fieldKey: string,
  type: string,
  value: unknown,
  onChange: (v: unknown) => void
) {
  if (type === "boolean") {
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
    type === "date"
      ? "date"
      : type === "number" || type === "currency"
        ? "number"
        : "text";
  return (
    <input
      type={inputType}
      className="w-full rounded border border-foreground/20 bg-background px-2 py-1.5 text-sm"
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (type === "number" || type === "currency") {
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
  const locale = useLocale();
  const pkg = USCIS_N400_VERTICAL_CONFIG.configPackageId;
  const [values, setValues] = useState<Record<string, unknown>>({});

  const groups = useMemo(
    () => groupFieldsBySection(USCIS_N400_VERTICAL_CONFIG, values),
    [values]
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
            </div>
            <div className="p-3 grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="block text-xs space-y-1">
                  <span className="font-medium text-foreground/80">
                    {fieldLabelForLocale(field.key, locale, pkg)}
                  </span>
                  {fieldInput(field.key, field.type, values[field.key], (v) =>
                    setField(field.key, v)
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
