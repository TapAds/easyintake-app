import { getTranslations, getFormatter } from "next-intl/server";
import { AppChrome } from "@/components/AppChrome";
import {
  getDashboardSnapshot,
  type FunnelStageId,
} from "@/lib/dashboard/snapshot";

const FUNNEL_COPY: Record<
  FunnelStageId,
  { title: "intakeTitle" | "validateTitle" | "closeTitle" | "transferTitle"; desc: "intakeDesc" | "validateDesc" | "closeDesc" | "transferDesc" }
> = {
  intake: { title: "intakeTitle", desc: "intakeDesc" },
  validate: { title: "validateTitle", desc: "validateDesc" },
  close: { title: "closeTitle", desc: "closeDesc" },
  transfer: { title: "transferTitle", desc: "transferDesc" },
};

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tFunnel = await getTranslations("dashboard.funnel");
  const tActivity = await getTranslations("dashboard.activity");
  const format = await getFormatter();
  const snapshot = getDashboardSnapshot();

  const completionRate = (entered: number, completed: number) =>
    entered > 0 ? Math.round((completed / entered) * 1000) / 10 : 0;

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-foreground/70 max-w-2xl">{t("subtitle")}</p>
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-lg px-3 py-2 inline-block">
            {t("demoDataNote")}
          </p>
        </div>

        <section aria-labelledby="funnel-heading">
          <h2
            id="funnel-heading"
            className="text-lg font-semibold text-foreground mb-4"
          >
            {tFunnel("sectionTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {snapshot.funnel.map((stage) => {
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
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-foreground/55">
                        {tFunnel("entered")}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {format.number(stage.entered)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-foreground/55">
                        {tFunnel("completed")}
                      </dt>
                      <dd className="font-semibold tabular-nums text-primary">
                        {format.number(stage.completed)}
                      </dd>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-foreground/10">
                      <dt className="text-foreground/55 text-xs">
                        {tFunnel("stageCompletion")}
                      </dt>
                      <dd className="text-lg font-semibold tabular-nums">
                        {completionRate(stage.entered, stage.completed)}%
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-foreground/10 p-4">
              <p className="text-xs text-foreground/60 uppercase tracking-wide">
                {t("conversion.intakeToValidate")}
              </p>
              <p className="text-2xl font-bold tabular-nums text-primary mt-1">
                {snapshot.stageConversion.intakeToValidate}%
              </p>
            </div>
            <div className="rounded-xl border border-foreground/10 p-4">
              <p className="text-xs text-foreground/60 uppercase tracking-wide">
                {t("conversion.validateToClose")}
              </p>
              <p className="text-2xl font-bold tabular-nums text-primary mt-1">
                {snapshot.stageConversion.validateToClose}%
              </p>
            </div>
            <div className="rounded-xl border border-foreground/10 p-4">
              <p className="text-xs text-foreground/60 uppercase tracking-wide">
                {t("conversion.closeToTransfer")}
              </p>
              <p className="text-2xl font-bold tabular-nums text-primary mt-1">
                {snapshot.stageConversion.closeToTransfer}%
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
              label={t("kpis.totalSessions")}
              value={format.number(snapshot.kpis.totalSessions)}
            />
            <KpiCard
              label={t("kpis.avgIntakeTime")}
              value={t("kpis.minutesValue", {
                count: snapshot.kpis.avgIntakeMinutes,
              })}
            />
            <KpiCard
              label={t("kpis.verificationRate")}
              value={t("kpis.percentValue", {
                value: snapshot.kpis.verificationRatePct,
              })}
            />
            <KpiCard
              label={t("kpis.closePaymentRate")}
              value={t("kpis.percentValue", {
                value: snapshot.kpis.closePaymentRatePct,
              })}
            />
            <KpiCard
              label={t("kpis.destinationSuccess")}
              value={t("kpis.percentValue", {
                value: snapshot.kpis.destinationSuccessRatePct,
              })}
            />
            <KpiCard
              label={t("kpis.medianFirstResponse")}
              value={t("kpis.minutesValue", {
                count: snapshot.kpis.medianFirstResponseMinutes,
              })}
            />
            <KpiCard
              label={t("kpis.openExceptions")}
              value={format.number(snapshot.kpis.openExceptions)}
            />
            <KpiCard
              label={t("kpis.channelMix")}
              value={t("kpis.channelMixValue", {
                voice: snapshot.kpis.channelVoicePct,
                messaging: snapshot.kpis.channelMessagingPct,
                partner: snapshot.kpis.channelPartnerPct,
              })}
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
                  <th className="px-4 py-3 font-medium">
                    {tActivity("when")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {tActivity("event")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentActivity.map((row) => (
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
                      {tActivity(`events.${row.eventKey}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppChrome>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 p-4 shadow-sm">
      <p className="text-xs text-foreground/60 leading-snug">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground mt-2">
        {value}
      </p>
    </div>
  );
}
