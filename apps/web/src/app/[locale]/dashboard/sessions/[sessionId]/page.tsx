import type { FieldChangeEventV1, IntakeSessionStatus } from "@easy-intake/shared";
import { applicantDisplayNameFromFieldValues } from "@easy-intake/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { SessionApplicantTools } from "@/components/sessions/SessionApplicantTools";
import { SessionApplicationsFromCall } from "@/components/sessions/SessionApplicationsFromCall";
import { SessionCallTranscript } from "@/components/sessions/SessionCallTranscript";
import { SessionCopyIdButton } from "@/components/sessions/SessionCopyIdButton";
import { SessionWorkflowTimeline } from "@/components/sessions/SessionWorkflowTimeline";
import { buildAgentHtmlUrl } from "@/lib/agent/buildAgentHtmlUrl";
import { fetchIntakeSessionFromBff } from "@/lib/bff/serverFetch";
import { fieldLabelForLocale } from "@/lib/intake/fieldLabels";
import { intakePackageLabel } from "@/lib/intake/packageLabel";

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
  const tApp = await getTranslations("agent.applications");
  const agentBase =
    process.env.NEXT_PUBLIC_AGENT_HTML_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  const hasVoice = session.channels.some((c) => c.channel === "voice");
  const callSid = session.externalIds?.callSid;
  const agentHref = hasVoice
    ? buildAgentHtmlUrl(agentBase, callSid ? { callSid } : undefined)
    : null;

  const fieldEntries = Object.entries(session.fieldValues);

  const fieldChangeLog: FieldChangeEventV1[] = Array.isArray(
    (session as { fieldChangeLog?: unknown }).fieldChangeLog
  )
    ? (session as { fieldChangeLog: FieldChangeEventV1[] }).fieldChangeLog
    : [];

  const applicantPortal =
    (
      session as {
        applicantPortal?: { hasActiveToken: boolean; expiresAt?: string };
      }
    ).applicantPortal ?? { hasActiveToken: false };

  const agentRequestedFieldKeys =
    session.hitl.agentRequestedFieldKeys ?? [];

  const displayName = applicantDisplayNameFromFieldValues(
    session.fieldValues,
    session.configPackageId
  );
  const heading =
    displayName?.trim() || tApp("unnamedApplicant");
  const pkgLabel = intakePackageLabel(session.configPackageId, locale);
  const completenessPct = Math.round(session.completeness.score * 100);
  const statusLabel = tApp(`status_${session.status}` as StatusLabelKey);

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        <header className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(session.status)}`}
                >
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {heading}
              </h1>
              <p className="text-sm text-foreground/70">{pkgLabel}</p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-foreground/55">
                <span className="font-mono break-all">{session.sessionId}</span>
                <SessionCopyIdButton sessionId={session.sessionId} />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="h-2 w-40 max-w-full rounded-full bg-foreground/10 overflow-hidden"
                  role="img"
                  aria-label={t("completenessTitle")}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${completenessPct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {completenessPct}%
                </span>
              </div>
            </div>
            <div className="shrink-0 space-y-2" id="application-actions">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {t("actionsTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
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
                <Link
                  href={`#applicant-portal`}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-foreground/15 text-sm font-medium hover:bg-foreground/5"
                >
                  {t("mintLink")}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <SessionApplicationsFromCall
          callSid={callSid}
          relatedApplications={session.relatedApplications ?? []}
        />

        {session.configPackageId === "uscis-n400" ? (
          <SessionWorkflowTimeline sessionId={session.sessionId} />
        ) : null}

        <SessionApplicantTools
          sessionId={session.sessionId}
          configPackageId={session.configPackageId}
          agentRequestedFieldKeys={agentRequestedFieldKeys}
          fieldChangeLog={fieldChangeLog}
          applicantPortal={applicantPortal}
        />

        <div className="flex flex-col-reverse gap-10 lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
          <div className="lg:col-span-7 space-y-10">
            <section
              id="field-review"
              aria-labelledby="fields-heading"
              className="scroll-mt-24"
            >
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
                      <th className="px-4 py-2 font-medium">{t("fieldProvenance")}</th>
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
                        <td className="px-4 py-2 text-xs text-foreground/75">
                          {wrap?.provenance?.channel
                            ? `${wrap.provenance.channel}${
                                wrap.provenance.source
                                  ? ` · ${wrap.provenance.source}`
                                  : ""
                              }`
                            : "—"}
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

            <section
              id="completeness-section"
              aria-labelledby="completeness-heading"
              className="scroll-mt-24"
            >
              <h2
                id="completeness-heading"
                className="text-lg font-semibold text-foreground mb-3"
              >
                {t("completenessTitle")}
              </h2>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {completenessPct}%
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
          </div>

          <div
            id="call-activity"
            className="lg:col-span-5 space-y-6 scroll-mt-24 lg:sticky lg:top-24"
          >
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

            {callSid ? (
              <section
                aria-labelledby="transcript-heading"
                className="rounded-xl border border-foreground/10 p-4"
              >
                <h2
                  id="transcript-heading"
                  className="text-lg font-semibold text-foreground mb-3"
                >
                  {tApp("transcriptTitle")}
                </h2>
                <SessionCallTranscript callSid={callSid} />
              </section>
            ) : null}
          </div>
        </div>

        <p className="text-sm">
          <Link
            href={`/${locale}/dashboard/applications`}
            className="text-primary hover:underline"
          >
            {t("backToQueue")}
          </Link>
        </p>
      </main>
    </AppChrome>
  );
}
