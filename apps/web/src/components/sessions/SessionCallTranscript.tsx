"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function formatOffsetMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Segment = {
  speaker?: string;
  text?: string;
  offsetMs?: number;
};

export function SessionCallTranscript({ callSid }: { callSid: string }) {
  const t = useTranslations("agent.applications");
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    setError(null);
    setSegments(null);
    fetch(
      `/api/intake/calls/${encodeURIComponent(callSid)}/transcript`,
      { signal: ac.signal }
    )
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as {
          segments?: Segment[];
          error?: string;
        } | null;
        if (!r.ok) {
          throw new Error(data?.error ?? t("transcriptLoadError"));
        }
        return data;
      })
      .then((data) => {
        if (!alive) return;
        setSegments(Array.isArray(data?.segments) ? data!.segments! : []);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : t("transcriptLoadError"));
      });
    return () => {
      alive = false;
      ac.abort();
    };
  }, [callSid, t]);

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    );
  }

  if (segments === null) {
    return (
      <p className="text-sm text-foreground/60">{t("transcriptLoading")}</p>
    );
  }

  if (segments.length === 0) {
    return (
      <p className="text-sm text-foreground/60">{t("transcriptEmpty")}</p>
    );
  }

  return (
    <ul className="space-y-2 text-sm max-h-80 overflow-y-auto pr-1">
      {segments.map((s, i) => {
        const sp = (s.speaker ?? "").toLowerCase();
        const who =
          sp === "agent" || sp === "assistant"
            ? t("transcriptSpeakerAgent")
            : sp === "caller" || sp === "customer" || sp === "user"
              ? t("transcriptSpeakerCaller")
              : s.speaker?.trim() || "—";
        const ms = typeof s.offsetMs === "number" ? s.offsetMs : null;
        return (
          <li key={`${ms ?? i}-${i}`} className="border-b border-foreground/5 pb-2">
            <span className="text-xs font-medium text-foreground/50">
              {who}
              {ms !== null ? (
                <span className="tabular-nums ml-2">{formatOffsetMs(ms)}</span>
              ) : null}
            </span>
            <p className="mt-0.5 text-foreground/90 whitespace-pre-wrap">
              {s.text ?? ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
