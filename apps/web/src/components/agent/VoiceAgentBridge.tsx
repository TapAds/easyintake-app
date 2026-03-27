"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { buildAgentHtmlUrl } from "@/lib/agent/buildAgentHtmlUrl";

type Props = {
  agentBaseUrl: string;
};

export function VoiceAgentBridge({ agentBaseUrl }: Props) {
  const t = useTranslations("agent.voiceBridge");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openWithToken = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/agent/ws-token", { method: "POST" });
      if (!res.ok) {
        if (res.status === 401) {
          setError(t("errorUnauthorized"));
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("errorGeneric"));
        return;
      }
      const { token } = (await res.json()) as { token: string };
      const href = buildAgentHtmlUrl(agentBaseUrl, { token });
      if (!href) {
        setError(t("errorConfigure"));
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }, [agentBaseUrl, t]);

  if (!agentBaseUrl.trim()) {
    return (
      <div
        className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100/90"
        role="status"
      >
        {t("configureHint")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-foreground/70">{t("description")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openWithToken}
          disabled={busy}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {busy ? t("opening") : t("openWithToken")}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
