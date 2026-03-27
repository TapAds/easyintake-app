"use client";

import {
  DEFAULT_LIVE_DEMO_CONFIG_PACKAGE_ID,
  LIVE_DEMO_PRESETS,
} from "@easy-intake/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAgentWsUrl } from "@/lib/agent/buildAgentWsUrl";
import {
  fieldLabelForLocale,
  getVerticalConfigForPackage,
} from "@/lib/intake/fieldLabels";
import {
  computeSectionCompletion,
  isFieldValueFilled,
  overallCompletionPercent,
} from "@/lib/intake/sectionCompletion";

function entityValueFingerprint(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

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
  | {
      type: "guidance";
      guidanceText?: string;
      missingFields?: string[];
      priorityField?: string | null;
    }
  | { type: "call_ended" };

export function LiveDemoClient({ apiBaseUrl }: { apiBaseUrl: string }) {
  const t = useTranslations("demo.live");
  const locale = useLocale();
  const [presetId, setPresetId] = useState(LIVE_DEMO_PRESETS[0]?.id ?? "");
  const [callSid, setCallSid] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [entities, setEntities] = useState<Record<string, unknown>>({});
  const [score, setScore] = useState<{ overall: number; tier: string } | null>(
    null
  );
  const [guidanceText, setGuidanceText] = useState<string | null>(null);
  const [guidanceMissingKeys, setGuidanceMissingKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceHealth, setVoiceHealth] = useState<VoiceHealthPayload | null>(
    null
  );
  const [twilioRows, setTwilioRows] = useState<TwilioRow[]>([]);
  const [twilioError, setTwilioError] = useState<string | null>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(() => new Set());
  const [linkCopied, setLinkCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const prevEntitiesRef = useRef<Record<string, unknown>>({});
  const flashTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const preset = LIVE_DEMO_PRESETS.find((p) => p.id === presetId);
  const visibleKeys = useMemo(
    () => preset?.visibleFieldKeys ?? [],
    [preset]
  );

  const pkg =
    preset?.configPackageId ?? DEFAULT_LIVE_DEMO_CONFIG_PACKAGE_ID;
  const verticalCfg = useMemo(() => getVerticalConfigForPackage(pkg), [pkg]);

  const sectionRows = useMemo(() => {
    if (!verticalCfg) return [];
    return computeSectionCompletion(
      verticalCfg,
      visibleKeys,
      entities,
      locale
    );
  }, [verticalCfg, visibleKeys, entities, locale]);

  const overallPct = useMemo(
    () => overallCompletionPercent(sectionRows, score?.overall),
    [sectionRows, score?.overall]
  );

  const clientVisibleMissingKeys = useMemo(
    () => visibleKeys.filter((k) => !isFieldValueFilled(entities[k])),
    [visibleKeys, entities]
  );

  const missingKeysForDisplay = useMemo(() => {
    const s = new Set<string>([
      ...guidanceMissingKeys,
      ...clientVisibleMissingKeys,
    ]);
    return Array.from(s);
  }, [guidanceMissingKeys, clientVisibleMissingKeys]);

  const hasMissingAttention = missingKeysForDisplay.length > 0;

  /** Demo placeholder; set NEXT_PUBLIC_DEMO_APPLICANT_LINK_BASE to your future microsite origin. */
  const applicantLinkUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_DEMO_APPLICANT_LINK_BASE?.replace(
      /\/$/,
      ""
    );
    const sid = callSid.trim() || "…";
    if (base) return `${base}/session/${sid}`;
    return `https://apply.example.com/session/${sid}`;
  }, [callSid]);

  useEffect(() => {
    prevEntitiesRef.current = { ...entities };
    setFlashingKeys(new Set());
    flashTimeoutsRef.current.forEach(clearTimeout);
    flashTimeoutsRef.current.clear();
  }, [presetId]); // eslint-disable-line react-hooks/exhaustive-deps -- sync baseline to current cache when preset changes

  useEffect(() => {
    const timeouts = flashTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  useEffect(() => {
    const prev = prevEntitiesRef.current;
    for (const key of visibleKeys) {
      if (
        entityValueFingerprint(prev[key]) !==
        entityValueFingerprint(entities[key])
      ) {
        setFlashingKeys((s) => new Set(s).add(key));
        const existing = flashTimeoutsRef.current.get(key);
        if (existing) clearTimeout(existing);
        const tid = setTimeout(() => {
          setFlashingKeys((s) => {
            const next = new Set(s);
            next.delete(key);
            return next;
          });
          flashTimeoutsRef.current.delete(key);
        }, 900);
        flashTimeoutsRef.current.set(key, tid);
      }
    }
    prevEntitiesRef.current = { ...entities };
  }, [entities, visibleKeys]);

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

  const copyApplicantLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(applicantLinkUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [applicantLinkUrl]);

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
      prevEntitiesRef.current = {};
      setEntities({});
      setScore(null);
      setGuidanceText(null);
      setGuidanceMissingKeys([]);

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
              setGuidanceText(msg.guidanceText ?? null);
              setGuidanceMissingKeys(
                Array.isArray(msg.missingFields) ? msg.missingFields : []
              );
              break;
            case "call_ended":
              setGuidanceText(t("callEndedHint"));
              setGuidanceMissingKeys([]);
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

  const stubButtonClass =
    "text-xs py-1.5 px-2 rounded-md border border-foreground/20 bg-background text-foreground/90 hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryStubClass =
    "text-xs py-1.5 px-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-2">
      {(sectionRows.length > 0 || score != null) && verticalCfg ? (
        <div className="rounded border border-foreground/10 bg-foreground/[0.02] p-2 text-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
            <span className="font-semibold text-foreground">
              {t("sectionCompletionTitle")}
            </span>
            <span className="tabular-nums text-foreground/80">
              {t("overallComplete")}: {overallPct}%
            </span>
          </div>
          {sectionRows.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {sectionRows.map((row) => (
                <div
                  key={row.sectionId}
                  className="min-w-[100px] max-w-[200px] flex-1"
                >
                  <div className="flex justify-between gap-1 text-[10px] text-foreground/70 mb-0.5">
                    <span className="truncate">{row.label}</span>
                    <span className="shrink-0 tabular-nums">{row.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500/90 transition-[width]"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 justify-end">
        <button
          type="button"
          className={stubButtonClass}
          disabled
          title={t("actionComingSoon")}
        >
          {t("actionDownloadPdf")}
        </button>
        <button
          type="button"
          className={primaryStubClass}
          disabled
          title={t("actionComingSoon")}
        >
          {t("actionExtractAi")}
        </button>
        <button
          type="button"
          className={stubButtonClass}
          disabled
          title={t("actionComingSoon")}
        >
          {t("actionCrmSync")}
        </button>
      </div>

      <aside
        className="rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm text-foreground shadow-sm"
        aria-label={t("agentInstructionTitle")}
      >
        <p className="font-semibold text-foreground">{t("agentInstructionTitle")}</p>
        <ol className="mt-2 list-decimal list-inside space-y-1.5 text-foreground/95">
          <li>{t("agentStepConfirmProduct")}</li>
          <li>{t("agentStepConnectStream")}</li>
        </ol>
        <p className="mt-2 text-xs text-foreground/75">{t("agentInstructionHint")}</p>
      </aside>

      <div className="grid gap-2 lg:grid-cols-2">
        <section className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("productFormLabel")}
            </label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
            >
              {LIVE_DEMO_PRESETS.map((p) => (
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

          <div className="rounded-lg border border-foreground/10 overflow-hidden">
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
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {t("transcriptTitle")}
            </h3>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-foreground/[0.04] border border-foreground/10 rounded-lg p-2 max-h-64 overflow-auto min-h-[6rem]">
              {transcript || t("transcriptEmpty")}
            </pre>
          </div>

          <details
            className={`rounded-lg border text-xs ${
              hasMissingAttention
                ? "border-red-600/50 bg-red-500/[0.06]"
                : "border-foreground/10 bg-foreground/[0.02]"
            }`}
          >
            <summary className="cursor-pointer select-none list-none px-2 py-1.5 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {t("agentAdviceTitle")}
            </summary>
            <div className="px-2 pb-2 border-t border-foreground/10 pt-1.5 space-y-1.5">
              {guidanceText ? (
                <p className="text-foreground/90 whitespace-pre-wrap">{guidanceText}</p>
              ) : null}
              {hasMissingAttention ? (
                <>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/60">
                    {t("missingFieldsHeading")}
                  </p>
                  <ul className="list-disc list-inside text-foreground/85 space-y-0.5">
                    {missingKeysForDisplay.map((key) => (
                      <li key={key}>
                        {fieldLabelForLocale(key, locale, pkg)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-foreground/55">{t("agentAdviceEmpty")}</p>
              )}
            </div>
          </details>

          <div className="rounded-lg border border-foreground/10 p-2">
            <p className="text-xs font-semibold text-foreground mb-1">
              {t("applicantLinkTitle")}
            </p>
            <p className="text-[11px] text-foreground/70 mb-1.5">
              {t("applicantLinkHint")}
            </p>
            <div className="flex gap-1.5">
              <input
                readOnly
                value={applicantLinkUrl}
                className="min-w-0 flex-1 rounded border border-foreground/15 bg-background px-2 py-1 text-[11px] font-mono text-foreground/90"
                aria-label={t("applicantLinkTitle")}
              />
              <button
                type="button"
                onClick={() => void copyApplicantLink()}
                className="shrink-0 rounded border border-foreground/20 px-2 py-1 text-[11px] font-medium hover:bg-foreground/5"
              >
                {linkCopied ? t("applicantLinkCopied") : t("applicantLinkCopy")}
              </button>
            </div>
            <div className="sr-only" aria-live="polite">
              {linkCopied ? t("applicantLinkCopied") : ""}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("applicationTitle")}
          </h3>
          <p className="text-xs text-foreground/65 mb-2 max-w-prose">
            {t("applicationPanelHint")}
          </p>
          <div className="rounded-xl border border-foreground/10 divide-y divide-foreground/10">
            {visibleKeys.map((key) => {
              const raw = entities[key];
              const display =
                raw === undefined || raw === null
                  ? "—"
                  : typeof raw === "object"
                    ? JSON.stringify(raw)
                    : String(raw);
              const flash = flashingKeys.has(key);
              return (
                <div
                  key={key}
                  className={`px-3 py-2 flex flex-col sm:flex-row sm:items-start gap-1 transition-colors duration-500 ${
                    flash
                      ? "bg-primary/[0.12] dark:bg-primary/[0.18]"
                      : ""
                  }`}
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

      <details className="group border-t border-foreground/10 pt-2 text-xs text-foreground/55">
        <summary className="cursor-pointer select-none list-none text-foreground/45 transition-colors hover:text-foreground/65 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block text-[9px] text-foreground/35 transition-transform duration-200 group-open:rotate-90"
            >
              ▶
            </span>
            {t("voiceDiagnosticsSummary")}
          </span>
        </summary>
        <div className="mt-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.02] p-2 font-mono text-[11px] leading-relaxed text-foreground/65">
          <p className="mb-2 font-sans text-[10px] font-medium uppercase tracking-wide text-foreground/40">
            {t("voiceHealthTitle")}
          </p>
          {voiceHealth ? (
            <ul className="space-y-1.5">
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
                <li className="pt-1 text-foreground/55">
                  {t("recentDb")}:{" "}
                  {voiceHealth.recentCallsFromDb
                    .map((r) => r.callSid)
                    .join(", ")}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="font-sans text-foreground/50">{t("voiceHealthLoading")}</p>
          )}
        </div>
      </details>
    </div>
  );
}
