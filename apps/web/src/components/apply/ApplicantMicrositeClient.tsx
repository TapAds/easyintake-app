"use client";

import { fieldLabelForLocale } from "@/lib/intake/fieldLabels";
import {
  computeSectionCompletion,
  groupFieldsBySection,
  isFieldValueFilled,
  overallCompletionPercent,
} from "@/lib/intake/sectionCompletion";
import { FieldHelpIcon } from "@/components/ui/FieldHelpIcon";
import type { FieldChangeEventV1, VerticalFieldDefinition } from "@easy-intake/shared";
import {
  computeCompletenessSnapshot,
  getVerticalConfigForPackageId,
  unwrapSessionFieldValues,
} from "@easy-intake/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SessionPayload = {
  sessionId: string;
  configPackageId: string;
  fieldValues: Record<string, unknown>;
  completeness: { score: number; missingRequiredKeys: string[] };
  hitl: { agentRequestedFieldKeys?: string[] };
  fieldChangeLog?: FieldChangeEventV1[];
  updatedAt: string;
};

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
        className="w-full rounded-lg border border-foreground/20 bg-background px-2 py-2 text-sm"
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
        className="rounded border-foreground/25 h-4 w-4"
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
      className="w-full rounded-lg border border-foreground/20 bg-background px-2 py-2 text-sm"
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

function actorLabel(ev: FieldChangeEventV1, t: (k: string) => string): string {
  if (ev.actor.type === "system") return t("changelogSystem");
  if (ev.actor.type === "agent") return t("changelogRep");
  if (ev.reason === "applicant_self_service" || ev.reason === "applicant_correction") {
    return t("changelogYou");
  }
  return t("changelogChannel");
}

export function ApplicantMicrositeClient({ token }: { token: string }) {
  const t = useTranslations("apply");
  const tEnum = useTranslations("intake.enumOptions");
  const tN400 = useTranslations("intake.n400Demo");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionPayload | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pendingRef = useRef<Record<string, unknown>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${decodeURIComponent(token)}` }),
    [token]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/intake/session", {
        headers: authHeader,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<SessionPayload>;
      if (!res.ok) {
        setError(data.error ?? t("loadError"));
        setSessionData(null);
        return;
      }
      setSessionData(data as SessionPayload);
      setValues(unwrapSessionFieldValues(data.fieldValues ?? {}));
    } catch {
      setError(t("loadError"));
      setSessionData(null);
    } finally {
      setLoading(false);
    }
  }, [authHeader, t]);

  useEffect(() => {
    load();
  }, [load]);

  const flushPending = useCallback(async () => {
    const updates = { ...pendingRef.current };
    pendingRef.current = {};
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    setSaveState("saving");
    try {
      const res = await fetch("/api/public/intake/session", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = (await res.json().catch(() => ({}))) as SessionPayload & {
        error?: string;
      };
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      setSessionData((prev) =>
        prev
          ? {
              ...prev,
              fieldValues: data.fieldValues ?? prev.fieldValues,
              completeness: data.completeness ?? prev.completeness,
              hitl: data.hitl ?? prev.hitl,
              updatedAt: data.updatedAt ?? prev.updatedAt,
            }
          : prev
      );
      setValues(unwrapSessionFieldValues(data.fieldValues ?? {}));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }, [authHeader]);

  const queueSave = useCallback(
    (key: string, v: unknown) => {
      if (v === undefined) {
        pendingRef.current[key] = null;
      } else {
        pendingRef.current[key] = v;
      }
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        void flushPending();
      }, 650);
    },
    [flushPending]
  );

  const setField = useCallback(
    (key: string, v: unknown) => {
      setValues((prev) => {
        const next = { ...prev };
        if (v === undefined || v === null || v === "") {
          delete next[key];
        } else {
          next[key] = v;
        }
        return next;
      });
      queueSave(key, v === "" ? null : v === undefined ? null : v);
    },
    [queueSave]
  );

  const cfg = sessionData
    ? getVerticalConfigForPackageId(sessionData.configPackageId)
    : null;

  const missingRequired = useMemo(() => {
    if (!cfg) return new Set<string>();
    const snap = computeCompletenessSnapshot(cfg, values as Record<string, unknown>);
    return new Set(snap.missingRequiredKeys ?? []);
  }, [cfg, values]);

  const requestedSet = useMemo(
    () => new Set(sessionData?.hitl?.agentRequestedFieldKeys ?? []),
    [sessionData?.hitl?.agentRequestedFieldKeys]
  );

  const groups = useMemo(
    () => (cfg ? groupFieldsBySection(cfg, values) : []),
    [cfg, values]
  );

  const sectionRows = useMemo(
    () => (cfg ? computeSectionCompletion(cfg, values, locale) : []),
    [cfg, values, locale]
  );

  const overallPct = useMemo(
    () => overallCompletionPercent(sectionRows, undefined),
    [sectionRows]
  );

  const sortedLog = useMemo(() => {
    const log = sessionData?.fieldChangeLog ?? [];
    return [...log].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [sessionData?.fieldChangeLog]);

  if (loading) {
    return (
      <p className="text-sm text-foreground/70 py-12 text-center">{t("loading")}</p>
    );
  }

  if (error || !sessionData || !cfg) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 py-12 text-center px-4">
        {error ?? t("loadError")}
      </p>
    );
  }

  const pkg = sessionData.configPackageId;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {t("progress", { pct: Math.round(overallPct) })}
          </p>
          <span className="text-xs text-foreground/60 tabular-nums">
            {saveState === "saving"
              ? t("saving")
              : saveState === "saved"
                ? t("saved")
                : saveState === "error"
                  ? t("saveError")
                  : ""}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-foreground/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/90 transition-[width] duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {groups.map(({ section, fields }) => (
          <div
            key={section.id}
            className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-foreground/10 bg-foreground/[0.04]">
              <h2 className="text-base font-semibold">
                {locale === "es" ? section.labels.es : section.labels.en}
              </h2>
            </div>
            <div className="p-4 grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const miss = missingRequired.has(field.key);
                const req = requestedSet.has(field.key);
                const filled = isFieldValueFilled(values[field.key]);
                const ring = filled
                  ? "ring-2 ring-emerald-600/45 border-emerald-600/28 dark:ring-emerald-500/45 dark:border-emerald-500/25"
                  : miss || req
                    ? miss && req
                      ? "ring-2 ring-amber-500/70 border-amber-500/40"
                      : miss
                        ? "ring-2 ring-red-500/50 border-red-500/30"
                        : "ring-2 ring-sky-500/50 border-sky-500/30"
                    : "border-foreground/15";
                const labelText = fieldLabelForLocale(field.key, locale, pkg);
                const helpText =
                  field.description &&
                  (locale === "es" ? field.description.es : field.description.en);

                return (
                  <div
                    key={field.key}
                    className={`rounded-lg border bg-background/50 p-3 space-y-2 ${ring}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {labelText}
                      </span>
                      {helpText ? (
                        <FieldHelpIcon text={helpText} label={labelText} />
                      ) : null}
                      {miss ? (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300">
                          {t("missingBadge")}
                        </span>
                      ) : null}
                      {req ? (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-200">
                          {t("requestedBadge")}
                        </span>
                      ) : null}
                    </div>
                    {fieldControl(
                      field,
                      values[field.key],
                      (v) => setField(field.key, v),
                      (k) => tEnum(k),
                      tN400("enumPlaceholder")
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {sortedLog.length > 0 ? (
        <section className="rounded-xl border border-foreground/10 overflow-hidden">
          <h3 className="text-sm font-semibold px-4 py-3 border-b border-foreground/10 bg-foreground/[0.04]">
            {t("changelogTitle")}
          </h3>
          <ul className="divide-y divide-foreground/10 max-h-64 overflow-y-auto text-sm">
            {sortedLog.slice(0, 50).map((ev) => (
              <li key={ev.id} className="px-4 py-2 space-y-0.5">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {fieldLabelForLocale(ev.fieldKey, locale, pkg)}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {new Date(ev.at).toLocaleString(locale)}
                  </span>
                </div>
                <p className="text-xs text-foreground/70">
                  {actorLabel(ev, t)} ·{" "}
                  {ev.oldValue === undefined
                    ? "—"
                    : String(ev.oldValue as string | number | boolean).slice(0, 80)}
                  {" → "}
                  {ev.newValue === undefined
                    ? "—"
                    : String(ev.newValue as string | number | boolean).slice(0, 80)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
