import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { fetchIntakeSessionsListFromBff } from "@/lib/bff/serverFetch";
import {
  computeSalesKpis,
  deriveDashboardFromSessions,
  filterSessionsForDashboard,
  type DashboardFunnelStageId,
} from "@/lib/dashboard/deriveFromSessions";
import { DashboardFilters, type DashboardFilterOption } from "./DashboardFilters";
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

function toOptions(ids: string[]): DashboardFilterOption[] {
  return Array.from(new Set(ids))
    .sort()
    .map((value) => ({ value, label: value }));
}

export async function DashboardLiveMetrics({
  locale,
  carrier,
  product,
}: {
  locale: string;
  carrier?: string;
  product?: string;
}) {
  const t = await getTranslations("dashboard");
  const tFunnel = await getTranslations("dashboard.funnel");
  const tActivity = await getTranslations("dashboard.activity");
  const tSales = await getTranslations("dashboard.kpis.sales");
  const format = await getFormatter();

  const allRows = await fetchIntakeSessionsListFromBff();
  const carrierOptions =
    allRows !== null ? toOptions(allRows.map((r) => r.verticalId)) : [];
  const productOptions =
    allRows !== null ? toOptions(allRows.map((r) => r.configPackageId)) : [];

  const selectedCarrier =
    carrier && carrierOptions.some((o) => o.value === carrier) ? carrier : "all";
  const selectedProduct =
    product && productOptions.some((o) => o.value === product) ? product : "all";

  const filteredRows =
    allRows !== null
      ? filterSessionsForDashboard(allRows, selectedCarrier, selectedProduct)
      : null;

  const live =
    filteredRows !== null ? deriveDashboardFromSessions(filteredRows) : null;
  const salesKpis =
    filteredRows !== null ? computeSalesKpis(filteredRows) : null;

  const funnelDisplay =
    live?.funnel ??
    (["intake", "validate", "close", "transfer"] as const).map((id) => ({
      id,
      count: 0,
      sharePct: 0,
    }));

  return (
    <>
      {allRows === null ? (
        <p className="text-sm text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:text-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-lg px-3 py-2 inline-block">
          {t("loadErrorNote")}
        </p>
      ) : (
        <p className="text-sm text-foreground/60 border border-foreground/10 rounded-lg px-3 py-2 inline-block max-w-2xl">
          {t("liveDataNote")}
        </p>
      )}

      <section aria-labelledby="sales-kpis-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2
            id="sales-kpis-heading"
            className="text-lg font-semibold text-foreground"
          >
            {tSales("sectionTitle")}
          </h2>
          <Suspense
            fallback={
              <div className="h-10 w-56 rounded-lg bg-foreground/5 animate-pulse" />
            }
          >
            <DashboardFilters
              locale={locale}
              carrierOptions={carrierOptions}
              productOptions={productOptions}
              selectedCarrier={selectedCarrier}
              selectedProduct={selectedProduct}
              labels={{
                carrier: tSales("filterCarrier"),
                product: tSales("filterProduct"),
                all: tSales("filterAll"),
                carrierTitle: tSales("filterCarrierTitle"),
                productTitle: tSales("filterProductTitle"),
              }}
            />
          </Suspense>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label={tSales("leads")}
            hint={tSales("leadsHint")}
            value={salesKpis ? format.number(salesKpis.leads) : "—"}
          />
          <KpiCard
            label={tSales("appsStarted")}
            hint={tSales("appsStartedHint")}
            value={salesKpis ? format.number(salesKpis.appsStarted) : "—"}
          />
          <KpiCard
            label={tSales("appsCompleted")}
            hint={tSales("appsCompletedHint")}
            value={salesKpis ? format.number(salesKpis.appsCompleted) : "—"}
          />
          <KpiCard
            label={tSales("appsSubmitted")}
            hint={tSales("appsSubmittedHint")}
            value={salesKpis ? format.number(salesKpis.appsSubmitted) : "—"}
          />
          <KpiCard
            label={tSales("appsAccepted")}
            hint={tSales("appsAcceptedHint")}
            value={salesKpis ? format.number(salesKpis.appsAccepted) : "—"}
          />
        </div>
      </section>

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
