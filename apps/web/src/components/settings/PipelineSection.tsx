"use client";

import { useCallback, useId, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getPipelinePreset,
  PIPELINE_PRESET_IDS,
  type OrgPipelineConfig,
  type PipelineStage,
} from "@easy-intake/shared";

function emptyStage(): PipelineStage {
  return { id: "new_stage", label: { en: "", es: "" } };
}

export function PipelineSection({
  initial,
  initialOnboardingComplete,
}: {
  initial: OrgPipelineConfig | null;
  initialOnboardingComplete: boolean;
}) {
  const t = useTranslations("settings.pipeline");
  const te = useTranslations("settings.pipeline.errors");
  const presetId = useId();

  const [stages, setStages] = useState<PipelineStage[]>(() =>
    initial?.stages?.length ? initial.stages.map((s) => ({ ...s })) : getPipelinePreset("sales_funnel_milestones").stages,
  );
  const [onboardingComplete, setOnboardingComplete] = useState(initialOnboardingComplete);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"saved" | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const applyPreset = useCallback((id: string) => {
    if (id !== "insurance_application_chips" && id !== "sales_funnel_milestones") return;
    const p = getPipelinePreset(id);
    setStages(p.stages.map((s) => ({ ...s })));
    setMessage(null);
    setErrorKey(null);
  }, []);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setStages((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setErrorKey(null);
    setMessage(null);
    setSaving(true);
    const pipelineConfig: OrgPipelineConfig = { version: 1, stages };
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineConfig,
          onboardingComplete,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorKey(data.error ?? "SAVE_FAILED");
        setSaving(false);
        return;
      }
      setMessage("saved");
      setSaving(false);
      window.setTimeout(() => setMessage(null), 2500);
    } catch {
      setErrorKey("NETWORK");
      setSaving(false);
    }
  }, [stages, onboardingComplete]);

  return (
    <section className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("sectionTitle")}</h2>
        <p className="mt-1 text-sm text-foreground/70">{t("sectionHint")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor={presetId} className="text-sm font-medium text-foreground">
            {t("presetLabel")}
          </label>
          <select
            id={presetId}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) applyPreset(v);
              e.target.value = "";
            }}
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">{t("presetPlaceholder")}</option>
            {PIPELINE_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {id === "insurance_application_chips" ? t("presetInsurance") : t("presetFunnel")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className="space-y-3">
        {stages.map((s, i) => (
          <li
            key={`${s.id}-${i}`}
            className="rounded-lg border border-foreground/10 p-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          >
            <div>
              <label className="text-xs font-medium text-foreground/70">{t("stageId")}</label>
              <input
                value={s.id}
                onChange={(e) => {
                  const v = e.target.value;
                  setStages((prev) =>
                    prev.map((row, j) => (j === i ? { ...row, id: v } : row)),
                  );
                }}
                className="mt-1 w-full rounded border border-foreground/15 bg-background px-2 py-1.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70">{t("labelEn")}</label>
              <input
                value={s.label.en}
                onChange={(e) => {
                  const v = e.target.value;
                  setStages((prev) =>
                    prev.map((row, j) =>
                      j === i ? { ...row, label: { ...row.label, en: v } } : row,
                    ),
                  );
                }}
                className="mt-1 w-full rounded border border-foreground/15 bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70">{t("labelEs")}</label>
              <input
                value={s.label.es}
                onChange={(e) => {
                  const v = e.target.value;
                  setStages((prev) =>
                    prev.map((row, j) =>
                      j === i ? { ...row, label: { ...row.label, es: v } } : row,
                    ),
                  );
                }}
                className="mt-1 w-full rounded border border-foreground/15 bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="rounded border border-foreground/15 px-2 py-1 text-xs"
              >
                {t("moveUp")}
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="rounded border border-foreground/15 px-2 py-1 text-xs"
              >
                {t("moveDown")}
              </button>
              <button
                type="button"
                onClick={() => setStages((prev) => prev.filter((_, j) => j !== i))}
                className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-700 dark:text-red-300"
              >
                {t("remove")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setStages((prev) => [...prev, emptyStage()])}
        className="text-sm font-medium text-primary underline underline-offset-2"
      >
        {t("addStage")}
      </button>

      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={onboardingComplete}
          onChange={(e) => setOnboardingComplete(e.target.checked)}
        />
        {t("markOnboardingComplete")}
      </label>

      {errorKey ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {te(errorKey as "FORBIDDEN" | "NO_ORG" | "VALIDATION" | "SAVE_FAILED" | "NETWORK" | "CLERK")}
        </p>
      ) : null}
      {message ? <p className="text-sm text-green-700 dark:text-green-400">{t("saved")}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </section>
  );
}
