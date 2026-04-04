"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type WfEvent = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

type Payload = {
  phase: string | null;
  preferredChannel: string | null;
  targetSubmissionDate: string | null;
  events: WfEvent[];
};

export function SessionWorkflowTimeline({ sessionId }: { sessionId: string }) {
  const t = useTranslations("agent.session.workflow");
  const locale = useLocale();
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/intake/sessions/${encodeURIComponent(sessionId)}/workflow-events`, {
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Payload>;
      })
      .then(setData)
      .catch(() => setErr(true));
    return () => ac.abort();
  }, [sessionId]);

  if (err) {
    return (
      <p className="text-sm text-foreground/70" role="alert">
        {t("loadError")}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-foreground/70">{t("loading")}</p>;
  }

  if (!data.phase && (data.events?.length ?? 0) === 0) {
    return (
      <p className="text-sm text-foreground/70">{t("empty")}</p>
    );
  }

  return (
    <section aria-labelledby="workflow-timeline-heading" className="space-y-3">
      <h2 id="workflow-timeline-heading" className="text-lg font-semibold text-foreground">
        {t("title")}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {data.phase ? (
          <>
            <dt className="text-foreground/60">{t("phase")}</dt>
            <dd className="font-mono text-xs">{data.phase}</dd>
          </>
        ) : null}
        {data.preferredChannel ? (
          <>
            <dt className="text-foreground/60">{t("preferredChannel")}</dt>
            <dd>{data.preferredChannel}</dd>
          </>
        ) : null}
        {data.targetSubmissionDate ? (
          <>
            <dt className="text-foreground/60">{t("targetSubmissionDate")}</dt>
            <dd className="tabular-nums">{data.targetSubmissionDate}</dd>
          </>
        ) : null}
      </dl>
      <ol className="border border-foreground/10 rounded-lg divide-y divide-foreground/10 max-h-64 overflow-y-auto">
        {(data.events ?? []).map((e) => (
          <li key={e.id} className="px-3 py-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono text-xs text-primary">{e.type}</span>
              <time
                className="text-xs text-foreground/60 tabular-nums"
                dateTime={e.createdAt}
              >
                {new Date(e.createdAt).toLocaleString(locale)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
