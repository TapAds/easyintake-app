"use client";

import {
  INSURANCE_DEMO_PRODUCTS,
  INSURANCE_VERTICAL_CONFIG,
} from "@easy-intake/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildAgentWsUrl } from "@/lib/agent/buildAgentWsUrl";
import { fieldLabelForLocale } from "@/lib/intake/fieldLabels";

type TwilioRow = {
  sid: string;
  status: string;
  from: string;
  to: string;
  dateCreated: string | null;
  duration: string | number | null;
};

type VoiceHealthPayload = {
  endpoints?: {
    agentWs?: string | null;
    mediaStreamWs?: string | null;
  };
  engine?: {
    twilioConfigured?: boolean;
    deepgramConfigured?: boolean;
    anthropicConfigured?: boolean;
  };
  recentCallsFromDb?: { callSid: string; status: string; startedAt: string }[];
};

type AgentMsg =
  | { type: "transcript_chunk"; speaker: string; text: string }
  | {
      type: "entity_update";
      entities: Record<string, unknown>;
      score: { overall: number; tier: string };
    }
  | { type: "score_update"; overall: number; tier: string }
  | { type: "guidance"; guidanceText?: string }
  | { type: "call_ended" };

export function LiveDemoClient({ apiBaseUrl }: { apiBaseUrl: string }) {
  const t = useTranslations("demo.live");
  const locale = useLocale();
  const [productId, setProductId] = useState(INSURANCE_DEMO_PRODUCTS[0]?.id ?? "");
  const [callSid, setCallSid] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [entities, setEntities] = useState<Record<string, unknown>>({});
  const [score, setScore] = useState<{ overall: number; tier: string } | null>(
    null
  );
  const [guidance, setGuidance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceHealth, setVoiceHealth] = useState<VoiceHealthPayload | null>(
    null
  );
  const [twilioRows, setTwilioRows] = useState<TwilioRow[]>([]);
  const [twilioError, setTwilioError] = useState<string | null>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const product = INSURANCE_DEMO_PRODUCTS.find((p) => p.id === productId);
  const visibleKeys = product?.visibleFieldKeys ?? [];

  const loadTwilioCalls = useCallback(() => {
    setTwilioError(null);
    setTwilioLoading(true);
    fetch("/api/demo/twilio-calls")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setTwilioError(
            (data as { error?: string }).error ?? t("twilioLoadError")
          );
          setTwilioRows([]);
          return;
        }
        const calls = (data as { calls?: TwilioRow[] }).calls ?? [];
        setTwilioRows(calls);
      })
      .catch(() => {
        setTwilioError(t("twilioLoadError"));
        setTwilioRows([]);
      })
      .finally(() => setTwilioLoading(false));
  }, [t]);

  useEffect(() => {
    let alive = true;
    fetch("/api/demo/voice-health")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setVoiceHealth(data as VoiceHealthPayload);
      })
      .catch(() => {
        if (alive) setVoiceHealth(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    loadTwilioCalls();
  }, [loadTwilioCalls]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setBusy(false);
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  const connect = useCallback(async () => {
    setError(null);
    const sid = callSid.trim();
    if (!sid) {
      setError(t("errorCallSid"));
      return;
    }
    if (!apiBaseUrl.trim()) {
      setError(t("errorApiBase"));
      return;
    }
    setBusy(true);
    try {
      const tokRes = await fetch("/api/agent/ws-token", { method: "POST" });
      if (!tokRes.ok) {
        setError(t("errorToken"));
        setBusy(false);
        return;
      }
      const { token } = (await tokRes.json()) as { token: string };
      const wsUrl = buildAgentWsUrl(apiBaseUrl, token, sid);
      if (!wsUrl) {
        setError(t("errorWsUrl"));
        setBusy(false);
        return;
      }
      disconnect();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setTranscript("");
      setEntities({});
      setScore(null);
      setGuidance(null);

      ws.onopen = () => {
        setConnected(true);
        setBusy(false);
      };
      ws.onclose = () => {
        setConnected(false);
        setBusy(false);
      };
      ws.onerror = () => {
        setError(t("errorWs"));
        setConnected(false);
        setBusy(false);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as AgentMsg;
          switch (msg.type) {
            case "transcript_chunk":
              setTranscript(
                (prev) =>
                  prev + `[${msg.speaker}] ${msg.text}\n`
              );
              break;
            case "entity_update":
              setEntities((msg.entities ?? {}) as Record<string, unknown>);
              setScore(msg.score);
              break;
            case "score_update":
              setScore({
                overall: msg.overall,
                tier: msg.tier,
              });
              break;
            case "guidance":
              setGuidance(msg.guidanceText ?? "—");
              break;
            case "call_ended":
              setGuidance(t("callEndedHint"));
              break;
            default:
              break;
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  }, [apiBaseUrl, callSid, disconnect, t]);

  const pkg = INSURANCE_VERTICAL_CONFIG.configPackageId;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("voiceHealthTitle")}
        </h2>
        {voiceHealth ? (
          <ul className="text-xs text-foreground/80 space-y-1 font-mono">
            <li>
              {t("labelAgentWs")}: {voiceHealth.endpoints?.agentWs ?? "—"}
            </li>
            <li>
              {t("labelEngine")}:{" "}
              {[
                voiceHealth.engine?.twilioConfigured && "Twilio",
                voiceHealth.engine?.deepgramConfigured && "Deepgram",
                voiceHealth.engine?.anthropicConfigured && "Anthropic",
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </li>
            {voiceHealth.recentCallsFromDb &&
            voiceHealth.recentCallsFromDb.length > 0 ? (
              <li className="mt-2 text-foreground/70">
                {t("recentDb")}:{" "}
                {voiceHealth.recentCallsFromDb
                  .map((r) => r.callSid)
                  .join(", ")}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-foreground/60">{t("voiceHealthLoading")}</p>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("productLabel")}
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
            >
              {INSURANCE_DEMO_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {locale === "es" ? p.labels.es : p.labels.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="callSid"
              className="block text-sm font-medium text-foreground mb-1"
            >
              {t("callSidLabel")}
            </label>
            <input
              id="callSid"
              type="text"
              value={callSid}
              onChange={(e) => setCallSid(e.target.value)}
              placeholder="CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={connect}
              disabled={busy || connected}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? t("connecting") : t("connect")}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={!connected && !busy}
              className="px-4 py-2 rounded-lg border border-foreground/20 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
            >
              {t("disconnect")}
            </button>
          </div>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="rounded-xl border border-foreground/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-foreground/[0.04] border-b border-foreground/10">
              <span className="text-xs font-medium text-foreground/80">
                {t("twilioTitle")}
              </span>
              <button
                type="button"
                onClick={loadTwilioCalls}
                disabled={twilioLoading}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {twilioLoading ? t("refreshing") : t("refreshTwilio")}
              </button>
            </div>
            {twilioError ? (
              <p className="p-3 text-xs text-red-600">{twilioError}</p>
            ) : twilioRows.length === 0 ? (
              <p className="p-3 text-xs text-foreground/60">{t("twilioEmpty")}</p>
            ) : (
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-foreground/60 border-b border-foreground/10">
                      <th className="p-2">{t("colSid")}</th>
                      <th className="p-2">{t("colStatus")}</th>
                      <th className="p-2">{t("colWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {twilioRows.map((row) => (
                      <tr key={row.sid} className="border-t border-foreground/10">
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCallSid(row.sid);
                              setError(null);
                            }}
                            className="font-mono text-primary hover:underline text-left"
                          >
                            {row.sid}
                          </button>
                        </td>
                        <td className="p-2">{row.status}</td>
                        <td className="p-2 text-foreground/70">
                          {row.dateCreated
                            ? new Date(row.dateCreated).toLocaleString(locale)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {t("transcriptTitle")}
            </h3>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-foreground/[0.04] border border-foreground/10 rounded-lg p-3 max-h-64 overflow-auto min-h-[8rem]">
              {transcript || t("transcriptEmpty")}
            </pre>
          </div>

          {score ? (
            <p className="text-sm">
              {t("scoreLabel")}:{" "}
              <span className="font-semibold tabular-nums">
                {(score.overall * 100).toFixed(0)}%
              </span>{" "}
              <span className="text-foreground/70">({score.tier})</span>
            </p>
          ) : null}
          {guidance ? (
            <p className="text-sm text-primary/90">{guidance}</p>
          ) : null}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t("applicationTitle")}
          </h3>
          <div className="rounded-xl border border-foreground/10 divide-y divide-foreground/10">
            {visibleKeys.map((key) => {
              const raw = entities[key];
              const display =
                raw === undefined || raw === null
                  ? "—"
                  : typeof raw === "object"
                    ? JSON.stringify(raw)
                    : String(raw);
              return (
                <div
                  key={key}
                  className="px-3 py-2 flex flex-col sm:flex-row sm:items-start gap-1"
                >
                  <span className="text-xs font-medium text-foreground/70 max-w-[40%]">
                    {fieldLabelForLocale(key, locale, pkg)}
                  </span>
                  <span className="text-sm text-foreground break-words flex-1">
                    {display}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
