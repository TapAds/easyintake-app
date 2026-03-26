import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { fetchIntakeSessionFromBff } from "@/lib/bff/serverFetch";
import { fieldLabelForLocale } from "@/lib/intake/fieldLabels";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { sessionId } = await params;
  const locale = await getLocale();
  const session = await fetchIntakeSessionFromBff(sessionId);
  if (!session) {
    notFound();
  }

  const t = await getTranslations("agent.session");
  const agentBase = process.env.NEXT_PUBLIC_AGENT_HTML_URL ?? "";
  const hasVoice = session.channels.some((c) => c.channel === "voice");
  const callSid = session.externalIds?.callSid;
  const agentHref =
    agentBase && callSid
      ? `${agentBase.replace(/\/$/, "")}?callSid=${encodeURIComponent(callSid)}`
      : agentBase || null;

  const fieldEntries = Object.entries(session.fieldValues);

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="mt-1 font-mono text-sm text-foreground/70 break-all">
              {session.sessionId}
            </p>
          </div>
          <div className="shrink-0">
            {hasVoice ? (
              agentHref ? (
                <a
                  href={agentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {t("openLiveCall")}
                </a>
              ) : (
                <p className="text-sm text-foreground/60 max-w-xs">
                  {t("openLiveCallConfigure")}
                </p>
              )
            ) : (
              <p className="text-sm text-foreground/60">{t("noVoiceChannel")}</p>
            )}
          </div>
        </div>

        <section aria-labelledby="channels-heading">
          <h2
            id="channels-heading"
            className="text-lg font-semibold text-foreground mb-3"
          >
            {t("channelsTitle")}
          </h2>
          <ol className="space-y-2 border border-foreground/10 rounded-lg p-4">
            {session.channels.map((c, i) => (
              <li key={`${c.channel}-${i}`} className="text-sm">
                <span className="font-medium">{c.channel}</span>
                {c.externalRef ? (
                  <span className="text-foreground/60 ml-2 font-mono text-xs">
                    {c.externalRef}
                  </span>
                ) : null}
                <span className="text-foreground/50 ml-2 tabular-nums">
                  {new Date(c.startedAt).toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="fields-heading">
          <h2
            id="fields-heading"
            className="text-lg font-semibold text-foreground mb-3"
          >
            {t("fieldsTitle")}
          </h2>
          <div className="rounded-xl border border-foreground/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.04] text-left text-foreground/70">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("fieldKey")}</th>
                  <th className="px-4 py-2 font-medium">{t("fieldValue")}</th>
                  <th className="px-4 py-2 font-medium">{t("fieldConfidence")}</th>
                </tr>
              </thead>
              <tbody>
                {fieldEntries.map(([key, wrap]) => (
                  <tr
                    key={key}
                    className="border-t border-foreground/10 hover:bg-foreground/[0.02]"
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      {fieldLabelForLocale(
                        key,
                        locale,
                        session.configPackageId
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {wrap?.value === undefined || wrap?.value === null
                        ? "—"
                        : String(wrap.value)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-foreground/80">
                      {wrap?.provenance?.confidence !== undefined
                        ? `${Math.round(wrap.provenance.confidence * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="completeness-heading">
          <h2
            id="completeness-heading"
            className="text-lg font-semibold text-foreground mb-3"
          >
            {t("completenessTitle")}
          </h2>
          <p className="text-2xl font-semibold tabular-nums text-primary">
            {Math.round(session.completeness.score * 100)}%
          </p>
          {session.completeness.missingRequiredKeys &&
          session.completeness.missingRequiredKeys.length > 0 ? (
            <p className="mt-2 text-sm text-foreground/70">
              <span className="font-medium">{t("missingLabel")}: </span>
              {session.completeness.missingRequiredKeys
                .map((k) =>
                  fieldLabelForLocale(k, locale, session.configPackageId)
                )
                .join(", ")}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="hitl-heading">
          <h2
            id="hitl-heading"
            className="text-lg font-semibold text-foreground mb-3"
          >
            {t("hitlTitle")}
          </h2>
          <ul className="text-sm space-y-1 text-foreground/80">
            <li>
              {t("hitlAgentReview")}:{" "}
              {session.hitl.pendingAgentReview ? t("yes") : t("no")}
            </li>
            <li>
              {t("hitlDocs")}:{" "}
              {session.hitl.pendingDocumentApproval ? t("yes") : t("no")}
            </li>
            <li>
              {t("hitlSignOff")}:{" "}
              {session.hitl.pendingFinalSignOff ? t("yes") : t("no")}
            </li>
          </ul>
          <p className="mt-3 text-sm text-foreground/60">{t("hitlPlaceholder")}</p>
        </section>

        <p className="text-sm">
          <Link
            href={`/${locale}/dashboard/queue`}
            className="text-primary hover:underline"
          >
            {t("backToQueue")}
          </Link>
        </p>
      </main>
    </AppChrome>
  );
}
