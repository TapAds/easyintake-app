"use client";

import type { IntakeSession } from "@easy-intake/shared";
import { LIVE_DEMO_PRESETS } from "@easy-intake/shared";
import { intakePackageLabel } from "@/lib/intake/packageLabel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

export function SessionApplicationsFromCall({
  callSid,
  relatedApplications,
}: {
  callSid: string | undefined;
  relatedApplications: NonNullable<IntakeSession["relatedApplications"]>;
}) {
  const t = useTranslations("agent.session");
  const locale = useLocale();
  const router = useRouter();
  const [forkPresetId, setForkPresetId] = useState(LIVE_DEMO_PRESETS[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...relatedApplications].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [relatedApplications]
  );

  const canFork = Boolean(callSid?.trim());

  const fork = useCallback(async () => {
    if (!callSid?.trim()) {
      setError(t("newApplicationMissingCallSid"));
      return;
    }
    const preset = LIVE_DEMO_PRESETS.find((p) => p.id === forkPresetId);
    const configPackageId =
      preset?.configPackageId ?? LIVE_DEMO_PRESETS[0]?.configPackageId;
    if (!configPackageId) {
      setError(t("newApplicationError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/intake/sessions/from-call-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          callSid: callSid.trim(),
          configPackageId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        sessionId?: string;
      };
      if (!res.ok || !data.sessionId) {
        setError(data.error ?? t("newApplicationError"));
        return;
      }
      router.push(`/${locale}/dashboard/sessions/${encodeURIComponent(data.sessionId)}`);
    } catch {
      setError(t("newApplicationError"));
    } finally {
      setBusy(false);
    }
  }, [callSid, forkPresetId, locale, router, t]);

  if (!canFork && sorted.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="apps-from-call-heading" className="space-y-4">
      <h2
        id="apps-from-call-heading"
        className="text-lg font-semibold text-foreground"
      >
        {t("applicationsFromCallTitle")}
      </h2>
      <p className="text-sm text-foreground/70">{t("applicationsFromCallHint")}</p>

      {sorted.length > 0 ? (
        <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {sorted.map((row) => (
            <li
              key={row.sessionId}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <Link
                  href={`/${locale}/dashboard/sessions/${encodeURIComponent(row.sessionId)}`}
                  className="font-mono text-xs text-primary hover:underline break-all"
                >
                  {row.sessionId}
                </Link>
                <div className="mt-0.5 text-foreground/80">
                  {intakePackageLabel(row.configPackageId, locale)} —{" "}
                  {Math.round(row.completenessScore * 100)}%
                </div>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  row.isDerived
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                }`}
              >
                {row.isDerived
                  ? t("applicationDerivedBadge")
                  : t("applicationPrimaryBadge")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("newApplicationFromCallTitle")}
        </h3>
        {!canFork ? (
          <p className="text-sm text-foreground/65">{t("newApplicationMissingCallSid")}</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-medium text-foreground/80 mb-1">
                  {t("newApplicationProductLabel")}
                </label>
                <select
                  value={forkPresetId}
                  onChange={(e) => setForkPresetId(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
                >
                  {LIVE_DEMO_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {locale === "es" ? p.labels.es : p.labels.en}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void fork()}
                className="inline-flex justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? t("newApplicationWorking") : t("newApplicationSubmit")}
              </button>
            </div>
            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
