"use client";

import {
  fieldLabelForLocale,
  getVerticalConfigForPackage,
} from "@/lib/intake/fieldLabels";
import type { FieldChangeEventV1 } from "@easy-intake/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

export function SessionApplicantTools({
  sessionId,
  configPackageId,
  agentRequestedFieldKeys,
  fieldChangeLog,
  applicantPortal,
}: {
  sessionId: string;
  configPackageId: string;
  agentRequestedFieldKeys: string[];
  fieldChangeLog: FieldChangeEventV1[];
  applicantPortal: { hasActiveToken: boolean; expiresAt?: string };
}) {
  const t = useTranslations("agent.session");
  const locale = useLocale();
  const cfg = useMemo(
    () => getVerticalConfigForPackage(configPackageId),
    [configPackageId]
  );
  const allFieldKeys = useMemo(
    () => (cfg ? cfg.fields.map((f) => f.key) : []),
    [cfg]
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(agentRequestedFieldKeys)
  );

  useEffect(() => {
    setSelected(new Set(agentRequestedFieldKeys));
  }, [agentRequestedFieldKeys]);
  const [mintBusy, setMintBusy] = useState(false);
  const [lastMintUrl, setLastMintUrl] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);

  const toggleKey = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveHighlights = useCallback(async () => {
    setSaveBusy(true);
    try {
      const res = await fetch(`/api/intake/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hitl: { agentRequestedFieldKeys: Array.from(selected) },
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "save failed");
      }
    } finally {
      setSaveBusy(false);
    }
  }, [sessionId, selected]);

  const mintLink = useCallback(async () => {
    setMintBusy(true);
    setLastMintUrl(null);
    setLastToken(null);
    try {
      const res = await fetch(
        `/api/intake/sessions/${encodeURIComponent(sessionId)}/applicant-portal-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        applyUrl?: string | null;
        applyPath?: string;
        token?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "mint failed");
      if (data.applyUrl) setLastMintUrl(data.applyUrl);
      if (data.token) setLastToken(data.token);
      if (!data.applyUrl && data.applyPath) {
        setLastMintUrl(
          typeof window !== "undefined"
            ? `${window.location.origin}${data.applyPath}`
            : data.applyPath
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMintBusy(false);
    }
  }, [sessionId, locale]);

  const copyLink = useCallback(async () => {
    const text =
      lastMintUrl ??
      (lastToken && typeof window !== "undefined"
        ? `${window.location.origin}/${locale}/apply/${encodeURIComponent(lastToken)}`
        : null);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 2000);
    } catch {
      /* ignore */
    }
  }, [lastMintUrl, lastToken, locale]);

  const sendReminder = useCallback(async () => {
    setRemindBusy(true);
    setRemindMsg(null);
    try {
      const res = await fetch(
        `/api/intake/sessions/${encodeURIComponent(sessionId)}/remind-applicant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setRemindMsg(data.error ?? t("reminderError"));
        return;
      }
      setRemindMsg(t("reminderSent"));
    } catch {
      setRemindMsg(t("reminderError"));
    } finally {
      setRemindBusy(false);
    }
  }, [sessionId, locale, t]);

  const sortedLog = useMemo(
    () =>
      [...fieldChangeLog].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
      ),
    [fieldChangeLog]
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="portal-title" className="rounded-xl border border-foreground/10 overflow-hidden">
        <h2
          id="portal-title"
          className="text-lg font-semibold px-4 py-3 border-b border-foreground/10 bg-foreground/[0.04]"
        >
          {t("applicantPortalTitle")}
        </h2>
        <div className="p-4 space-y-4 text-sm">
          {applicantPortal.hasActiveToken && applicantPortal.expiresAt ? (
            <p className="text-foreground/70">
              <span className="font-medium">{t("hasActiveToken")}:</span>{" "}
              {t("tokenExpires", {
                date: new Date(applicantPortal.expiresAt).toLocaleString(locale),
              })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={mintBusy}
              onClick={() => void mintLink()}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {mintBusy ? t("minting") : t("mintLink")}
            </button>
            {(lastMintUrl || lastToken) && (
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-foreground/15 text-sm font-medium hover:bg-foreground/5"
              >
                {copyFlash ? t("linkCopied") : t("copyLink")}
              </button>
            )}
            <button
              type="button"
              disabled={remindBusy}
              onClick={() => void sendReminder()}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-foreground/15 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
            >
              {remindBusy ? t("reminderSending") : t("sendReminder")}
            </button>
          </div>
          {lastMintUrl ? (
            <p className="text-xs font-mono break-all text-foreground/80">{lastMintUrl}</p>
          ) : null}
          <p className="text-xs text-foreground/60">{t("linkHint")}</p>
          <p className="text-xs text-foreground/50">{t("noApplyUrl")}</p>
          {remindMsg ? (
            <p className="text-xs text-foreground/80" role="status">
              {remindMsg}
            </p>
          ) : null}
        </div>
      </section>

      {allFieldKeys.length > 0 ? (
        <section
          aria-labelledby="requested-fields-title"
          className="rounded-xl border border-foreground/10 overflow-hidden"
        >
          <h2
            id="requested-fields-title"
            className="text-lg font-semibold px-4 py-3 border-b border-foreground/10 bg-foreground/[0.04]"
          >
            {t("requestedFieldsTitle")}
          </h2>
          <div className="p-4 space-y-3">
            <p className="text-xs text-foreground/60">{t("requestedFieldsHint")}</p>
            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {allFieldKeys.map((key) => (
                <label
                  key={key}
                  className="flex items-start gap-2 rounded border border-foreground/10 px-2 py-1.5 cursor-pointer hover:bg-foreground/[0.02]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggleKey(key)}
                    className="mt-0.5 rounded border-foreground/30"
                  />
                  <span>{fieldLabelForLocale(key, locale, configPackageId)}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void saveHighlights()}
              className="text-sm font-medium px-3 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/15 disabled:opacity-50"
            >
              {saveBusy ? t("savingRequested") : t("saveRequested")}
            </button>
          </div>
        </section>
      ) : null}

      {sortedLog.length > 0 ? (
        <section aria-labelledby="changelog-title" className="rounded-xl border border-foreground/10 overflow-hidden">
          <h2
            id="changelog-title"
            className="text-lg font-semibold px-4 py-3 border-b border-foreground/10 bg-foreground/[0.04]"
          >
            {t("changelogTitle")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-foreground/60">
                  <th className="px-3 py-2 font-medium">{t("changelogWhen")}</th>
                  <th className="px-3 py-2 font-medium">{t("changelogField")}</th>
                  <th className="px-3 py-2 font-medium">{t("changelogActor")}</th>
                  <th className="px-3 py-2 font-medium">{t("changelogOld")}</th>
                  <th className="px-3 py-2 font-medium">{t("changelogNew")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedLog.slice(0, 100).map((ev) => (
                  <tr key={ev.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                    <td className="px-3 py-2 whitespace-nowrap text-foreground/70">
                      {new Date(ev.at).toLocaleString(locale)}
                    </td>
                    <td className="px-3 py-2">
                      {fieldLabelForLocale(ev.fieldKey, locale, configPackageId)}
                    </td>
                    <td className="px-3 py-2">
                      {ev.actor.type === "agent"
                        ? ev.actor.subject
                        : ev.actor.type === "system"
                          ? "system"
                          : ev.actor.channel}
                    </td>
                    <td className="px-3 py-2 max-w-[140px] truncate">
                      {ev.oldValue === undefined ? "—" : String(ev.oldValue)}
                    </td>
                    <td className="px-3 py-2 max-w-[140px] truncate">
                      {ev.newValue === undefined ? "—" : String(ev.newValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
