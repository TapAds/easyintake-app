import { getFormatter, getTranslations } from "next-intl/server";
import { fetchIntakeSessionsListFromBff } from "@/lib/bff/serverFetch";
import {
  deriveDashboardFromSessions,
  type DashboardFunnelStageId,
} from "@/lib/dashboard/deriveFromSessions";
import { KpiCard } from "./KpiCard";

const FUNNEL_COPY: Record<
  DashboardFunnelStageId,
  {
    title: "intakeTitle" | "validateTitle" | "closeTitle" | "transferTitle";
    desc: "intakeDesc" | "validateDesc" | "closeDesc" | "transferDesc";
  }
> = {
  intake: { title: "intakeTitle", desc: "intakeDesc" },
  validate: { title: "validateTitle", desc: "validateDesc" },
  close: { title: "closeTitle", desc: "closeDesc" },
  transfer: { title: "transferTitle", desc: "transferDesc" },
};

export async function DashboardLiveMetrics() {
  const t = await getTranslations("dashboard");
  const tFunnel = await getTranslations("dashboard.funnel");
  const tActivity = await getTranslations("dashboard.activity");
  const format = await getFormatter();

  const rows = await fetchIntakeSessionsListFromBff();
  const live = rows !== null ? deriveDashboardFromSessions(rows) : null;

  const funnelDisplay =
    live?.funnel ??
    (["intake", "validate", "close", "transfer"] as const).map((id) => ({
      id,
      count: 0,
      sharePct: 0,
    }));

  return (
    <>
      {rows === null ? (
        <p className="text-sm text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-lg px-3 py-2 inline-block">
          {t("loadErrorNote")}
        </p>
      ) : (
        <p className="text-sm text-foreground/60 border border-foreground/10 rounded-lg px-3 py-2 inline-block max-w-2xl">
          {t("liveDataNote")}
        </p>
      )}

      <section aria-labelledby="funnel-heading">
        <h2
          id="funnel-heading"
          className="text-lg font-semibold text-foreground mb-4"
        >
          {tFunnel("sectionTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {funnelDisplay.map((stage) => {
            const copy = FUNNEL_COPY[stage.id];
            return (
              <div
                key={stage.id}
                className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 shadow-sm"
              >
                <h3 className="font-semibold text-foreground">
                  {tFunnel(copy.title)}
                </h3>
                <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
                  {tFunnel(copy.desc)}
                </p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div>
                    <dt className="text-foreground/55">{tFunnel("sessionsLabel")}</dt>
                    <dd className="font-semibold tabular-nums text-lg">
                      {format.number(stage.count)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/55 text-xs">
                      {tFunnel("shareLabel")}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {format.number(stage.sharePct)}%
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="conversion-heading">
        <h2
          id="conversion-heading"
          className="text-lg font-semibold text-foreground mb-4"
        >
          {t("conversion.sectionTitle")}
        </h2>
        <p className="text-sm text-foreground/60 mb-4 max-w-3xl">
          {t("conversion.liveHint")}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {t("conversion.intakeToValidate")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-primary mt-1">
              {live ? format.number(live.conversion.intakeToValidate) : "—"}%
            </p>
          </div>
          <div className="rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {t("conversion.validateToClose")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-primary mt-1">
              {live ? format.number(live.conversion.validateToClose) : "—"}%
            </p>
          </div>
          <div className="rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {t("conversion.closeToTransfer")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-primary mt-1">
              {live ? format.number(live.conversion.closeToTransfer) : "—"}%
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="kpis-heading">
        <h2
          id="kpis-heading"
          className="text-lg font-semibold text-foreground mb-4"
        >
          {t("kpis.sectionTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label={t("kpis.totalSessionsLive")}
            value={live ? format.number(live.total) : "—"}
          />
          <KpiCard
            label={t("kpis.avgCompleteness")}
            value={
              live
                ? t("kpis.percentValue", { value: live.kpis.avgCompletenessPct })
                : "—"
            }
          />
          <KpiCard
            label={t("kpis.pendingAgentReview")}
            value={live ? format.number(live.kpis.pendingHitl) : "—"}
          />
          <KpiCard
            label={t("kpis.failedOrCancelled")}
            value={live ? format.number(live.kpis.failedOrCancelled) : "—"}
          />
          <KpiCard
            label={t("kpis.channelMix")}
            value={
              live
                ? t("kpis.channelMixValue", {
                    voice: live.kpis.channelVoicePct,
                    messaging: live.kpis.channelMessagingPct,
                    partner: live.kpis.channelPartnerPct,
                  })
                : "—"
            }
          />
        </div>
      </section>

      <section aria-labelledby="activity-heading">
        <h2
          id="activity-heading"
          className="text-lg font-semibold text-foreground mb-4"
        >
          {tActivity("sectionTitle")}
        </h2>
        <div className="rounded-xl border border-foreground/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.04] text-left text-foreground/70">
              <tr>
                <th className="px-4 py-3 font-medium">{tActivity("when")}</th>
                <th className="px-4 py-3 font-medium">{tActivity("event")}</th>
              </tr>
            </thead>
            <tbody>
              {live && live.recent.length > 0 ? (
                live.recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-foreground/10 hover:bg-foreground/[0.02]"
                  >
                    <td className="px-4 py-3 tabular-nums text-foreground/80">
                      {format.dateTime(new Date(row.atIso), {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {tActivity("sessionUpdated", { status: row.status })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-6 text-center text-foreground/60"
                  >
                    {tActivity("empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
