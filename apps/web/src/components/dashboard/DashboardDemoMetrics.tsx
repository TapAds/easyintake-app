import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  getDashboardSnapshot,
  scaleDemoSalesKpis,
  type FunnelStageId,
} from "@/lib/dashboard/snapshot";
import { DashboardFilters, type DashboardFilterOption } from "./DashboardFilters";
import { KpiCard } from "./KpiCard";

const FUNNEL_COPY: Record<
  FunnelStageId,
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

function toDemoOptions(ids: string[]): DashboardFilterOption[] {
  return ids.map((value) => ({ value, label: value }));
}

export async function DashboardDemoMetrics({
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
  const tDemoFunnel = await getTranslations("dashboard.demo.funnel");
  const tDemoConversion = await getTranslations("dashboard.demo.conversion");
  const tActivity = await getTranslations("dashboard.activity");
  const tSales = await getTranslations("dashboard.kpis.sales");
  const format = await getFormatter();
  const snapshot = getDashboardSnapshot();

  const carrierOptions = toDemoOptions(snapshot.demoFilterPrograms);
  const productOptions = toDemoOptions(snapshot.demoFilterProducts);

  const selectedCarrier =
    carrier && carrierOptions.some((o) => o.value === carrier) ? carrier : "all";
  const selectedProduct =
    product && productOptions.some((o) => o.value === product) ? product : "all";

  const salesKpis = scaleDemoSalesKpis(
    snapshot.salesKpis,
    selectedCarrier,
    selectedProduct
  );

  const completionRate = (entered: number, completed: number) =>
    entered > 0 ? Math.round((completed / entered) * 1000) / 10 : 0;

  return (
    <>
      <p className="text-sm text-violet-800 dark:text-violet-300/90 bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/50 rounded-lg px-3 py-2 inline-block max-w-2xl">
        {t("demo.banner")}
      </p>

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
        <p className="mt-2 text-xs text-foreground/55 max-w-2xl">
          {tSales("demoFilterHint")}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label={tSales("leads")}
            hint={tSales("leadsHint")}
            value={format.number(salesKpis.leads)}
          />
          <KpiCard
            label={tSales("appsStarted")}
            hint={tSales("appsStartedHint")}
            value={format.number(salesKpis.appsStarted)}
          />
          <KpiCard
            label={tSales("appsCompleted")}
            hint={tSales("appsCompletedHint")}
            value={format.number(salesKpis.appsCompleted)}
          />
          <KpiCard
            label={tSales("appsSubmitted")}
            hint={tSales("appsSubmittedHint")}
            value={format.number(salesKpis.appsSubmitted)}
          />
          <KpiCard
            label={tSales("appsAccepted")}
            hint={tSales("appsAcceptedHint")}
            value={format.number(salesKpis.appsAccepted)}
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
                      {tDemoFunnel("entered")}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {format.number(stage.entered)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/55">
                      {tDemoFunnel("completed")}
                    </dt>
                    <dd className="font-semibold tabular-nums text-primary">
                      {format.number(stage.completed)}
                    </dd>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-foreground/10">
                    <dt className="text-foreground/55 text-xs">
                      {tDemoFunnel("stageCompletion")}
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
        <p className="text-sm text-foreground/60 mb-4 max-w-3xl">
          {tDemoConversion("hint")}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {tDemoConversion("intakeToValidate")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-primary mt-1">
              {format.number(snapshot.stageConversion.intakeToValidate)}%
            </p>
          </div>
          <div className="rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {tDemoConversion("validateToClose")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-primary mt-1">
              {format.number(snapshot.stageConversion.validateToClose)}%
            </p>
          </div>
          <div className="rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {tDemoConversion("closeToTransfer")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-primary mt-1">
              {format.number(snapshot.stageConversion.closeToTransfer)}%
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
    </>
  );
}
