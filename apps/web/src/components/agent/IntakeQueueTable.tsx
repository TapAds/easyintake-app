"use client";

import type { IntakeSessionListRow } from "@easy-intake/shared";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type SortKey = keyof IntakeSessionListRow;

export function IntakeQueueTable() {
  const t = useTranslations("agent.queue");
  const locale = useLocale();
  const prefix = `/${locale}`;
  const [rows, setRows] = useState<IntakeSessionListRow[] | null>(null);
  const [loadError, setLoadError] = useState<false | "generic" | "no_org">(false);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
    const q = filter.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((r) =>
        [
          r.sessionId,
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
    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "boolean" && typeof vb === "boolean") {
        return (Number(va) - Number(vb)) * mul;
      }
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * mul;
      }
      return String(va).localeCompare(String(vb)) * mul;
    });
  }, [rows, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
    <div className="space-y-4">
      <label className="block max-w-md">
        <span className="sr-only">{t("filterPlaceholder")}</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="rounded-xl border border-foreground/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[56rem]">
          <thead className="bg-foreground/[0.04] text-left text-foreground/70">
            <tr>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colSessionId")} onClick={() => toggleSort("sessionId")} />
              </th>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colVertical")} onClick={() => toggleSort("verticalId")} />
              </th>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colPackage")} onClick={() => toggleSort("configPackageId")} />
              </th>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colStatus")} onClick={() => toggleSort("status")} />
              </th>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colChannels")} onClick={() => toggleSort("channelSummary")} />
              </th>
              <th className="px-3 py-2 font-medium tabular-nums">
                <SortButton label={t("colCompleteness")} onClick={() => toggleSort("completenessScore")} />
              </th>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colUpdated")} onClick={() => toggleSort("updatedAt")} />
              </th>
              <th className="px-3 py-2 font-medium">
                <SortButton label={t("colHitl")} onClick={() => toggleSort("pendingHitl")} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-foreground/60">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              filteredSorted.map((r) => (
                <tr key={r.sessionId} className="border-t border-foreground/10 hover:bg-foreground/[0.02]">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`${prefix}/dashboard/sessions/${encodeURIComponent(r.sessionId)}`}
                      className="text-primary hover:underline"
                    >
                      {r.sessionId}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.verticalId}</td>
                  <td className="px-3 py-2">{r.configPackageId}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-foreground/80">{r.channelSummary}</td>
                  <td className="px-3 py-2 tabular-nums">{Math.round(r.completenessScore * 100)}%</td>
                  <td className="px-3 py-2 tabular-nums text-foreground/80">
                    {new Date(r.updatedAt).toLocaleString(locale)}
                  </td>
                  <td className="px-3 py-2">{r.pendingHitl ? t("hitlYes") : t("hitlNo")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
    </button>
  );
}
