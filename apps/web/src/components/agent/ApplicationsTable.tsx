"use client";

import type { IntakeSessionListRow, IntakeSessionStatus } from "@easy-intake/shared";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  APPLICATION_FILTER_IDS,
  type ApplicationFilterId,
  nextStepForRow,
  rowMatchesFilter,
} from "@/lib/applications/applicationsFilters";
import { intakePackageLabel } from "@/lib/intake/packageLabel";

type ApplicationsFilterKey =
  | "filterAll"
  | "filterNeedsAttention"
  | "filterActiveIntake"
  | "filterAwaitingApplicant"
  | "filterAwaitingReview"
  | "filterReadyToSubmit"
  | "filterSubmitted"
  | "filterClosed";

const FILTER_LABELS: Record<ApplicationFilterId, ApplicationsFilterKey> = {
  all: "filterAll",
  needs_attention: "filterNeedsAttention",
  active_intake: "filterActiveIntake",
  awaiting_applicant: "filterAwaitingApplicant",
  awaiting_review: "filterAwaitingReview",
  ready_to_submit: "filterReadyToSubmit",
  submitted: "filterSubmitted",
  closed: "filterClosed",
};

type StatusLabelKey =
  | "status_created"
  | "status_collecting"
  | "status_awaiting_hitl"
  | "status_awaiting_applicant"
  | "status_ready_to_submit"
  | "status_submitted"
  | "status_synced"
  | "status_failed"
  | "status_cancelled";

function statusBadgeClass(status: IntakeSessionStatus): string {
  switch (status) {
    case "failed":
    case "cancelled":
      return "bg-red-500/15 text-red-800 dark:text-red-200";
    case "awaiting_hitl":
    case "awaiting_applicant":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
    case "ready_to_submit":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-100";
    case "submitted":
    case "synced":
      return "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
    default:
      return "bg-foreground/10 text-foreground/80";
  }
}

export function ApplicationsTable() {
  const t = useTranslations("agent.applications");
  const locale = useLocale();
  const prefix = `/${locale}`;
  const [rows, setRows] = useState<IntakeSessionListRow[] | null>(null);
  const [loadError, setLoadError] = useState<false | "generic" | "no_org">(false);
  const [filterText, setFilterText] = useState("");
  const [pill, setPill] = useState<ApplicationFilterId>("all");

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    fetch("/api/intake/sessions", { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 403) {
            const body = (await r.json().catch(() => null)) as {
              code?: string;
            } | null;
            if (body?.code === "NO_ORG") {
              throw new Error("NO_ORG");
            }
          }
          throw new Error(String(r.status));
        }
        return r.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!alive) return;
        if (!Array.isArray(data)) {
          setLoadError("generic");
          return;
        }
        setRows(data as IntakeSessionListRow[]);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof Error && err.message === "NO_ORG") {
          setLoadError("no_org");
          return;
        }
        setLoadError("generic");
      });
    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  const filteredSorted = useMemo(() => {
    if (!rows) return [];
    const q = filterText.trim().toLowerCase();
    let list = rows.filter((r) => rowMatchesFilter(r, pill));
    if (q) {
      list = list.filter((r) =>
        [
          r.sessionId,
          r.applicantDisplayName ?? "",
          r.callSid ?? "",
          r.verticalId,
          r.configPackageId,
          r.status,
          r.channelSummary,
          String(r.pendingHitl),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [rows, filterText, pill]);

  if (loadError === "no_org") {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200/90" role="status">
        {t("loadErrorNoOrg")}
      </p>
    );
  }

  if (loadError === "generic") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {t("loadError")}
      </p>
    );
  }

  if (rows === null) {
    return <p className="text-sm text-foreground/70">{t("loading")}</p>;
  }

  return (
    <div className="space-y-5">
      {rows.length === 0 && !filterText.trim() && pill === "all" ? (
        <p className="text-sm text-foreground/70">{t("queueEmptyOnboarding")}</p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
        {APPLICATION_FILTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pill === id}
            onClick={() => setPill(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              pill === id
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/[0.06] text-foreground/80 hover:bg-foreground/10"
            }`}
          >
            {t(FILTER_LABELS[id])}
          </button>
        ))}
      </div>

      <label className="block max-w-xl">
        <span className="sr-only">{t("filterPlaceholder")}</span>
        <input
          type="search"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="rounded-xl border border-foreground/10 bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[52rem]">
          <thead className="bg-foreground/[0.04] text-left text-foreground/70">
            <tr>
              <th className="px-4 py-3 font-medium">{t("colApplication")}</th>
              <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
              <th className="px-4 py-3 font-medium">{t("colProgress")}</th>
              <th className="px-4 py-3 font-medium">{t("colUpdated")}</th>
              <th className="px-4 py-3 font-medium">{t("colLastCall")}</th>
              <th className="px-4 py-3 font-medium">{t("colNextStep")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-foreground/60">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              filteredSorted.map((r) => {
                const pkg = intakePackageLabel(r.configPackageId, locale);
                const display =
                  r.applicantDisplayName?.trim() || t("unnamedApplicant");
                const { messageKey, hash } = nextStepForRow(r);
                const sessionPath = `${prefix}/dashboard/sessions/${encodeURIComponent(r.sessionId)}`;
                const hashSuffix = hash ? `#${hash}` : "";
                const statusLabel = t(
                  `status_${r.status}` as StatusLabelKey
                );

                return (
                  <tr
                    key={r.sessionId}
                    className="border-t border-foreground/10 hover:bg-foreground/[0.02]"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={sessionPath}
                        className="block group"
                      >
                        <span className="font-semibold text-primary group-hover:underline">
                          {display}
                        </span>
                        <span className="block text-xs text-foreground/55 mt-0.5">
                          {r.verticalId} · {pkg}
                          {r.channelSummary ? ` · ${r.channelSummary}` : ""}
                        </span>
                        <span className="sr-only">{t("openApplication")}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.round(Math.min(1, Math.max(0, r.completenessScore)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-xs text-foreground/75 w-9 text-right">
                          {Math.round(r.completenessScore * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-foreground/80 whitespace-nowrap">
                      {new Date(r.updatedAt).toLocaleString(locale)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`${sessionPath}#call-activity`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        {t("viewCall")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`${sessionPath}${hashSuffix}`}
                        className="text-sm text-foreground/90 hover:text-primary hover:underline"
                      >
                        {t(messageKey)}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
