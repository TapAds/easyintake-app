import { getFormatter, getTranslations } from "next-intl/server";
import type { IntakeSessionListRow } from "@easy-intake/shared";
import { rollupSessionsByOrganization } from "@/lib/dashboard/rollupSessionsByOrganization";
import { DashboardLiveMetrics } from "./DashboardLiveMetrics";

export async function CeoDashOverview({
  locale,
  rows,
}: {
  locale: string;
  rows: IntakeSessionListRow[] | null;
}) {
  const t = await getTranslations("ceoDash");
  const format = await getFormatter();
  const rollup = rows ? rollupSessionsByOrganization(rows) : [];

  return (
    <>
      <p className="text-sm text-foreground/60 border border-foreground/10 rounded-lg px-3 py-2 inline-block max-w-3xl">
        {t("scopeNote")}
      </p>

      <section aria-labelledby="ceo-org-heading" className="space-y-4">
        <h2
          id="ceo-org-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("orgSectionTitle")}
        </h2>
        <div className="rounded-xl border border-foreground/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.04] text-left text-foreground/70">
              <tr>
                <th className="px-4 py-3 font-medium">{t("orgColId")}</th>
                <th className="px-4 py-3 font-medium">{t("orgColSessions")}</th>
                <th className="px-4 py-3 font-medium">{t("orgColUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {rollup.length > 0 ? (
                rollup.map((r) => (
                  <tr
                    key={r.organizationId}
                    className="border-t border-foreground/10 hover:bg-foreground/[0.02]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground break-all">
                      {r.organizationId}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {format.number(r.sessionCount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground/80">
                      {format.dateTime(new Date(r.latestUpdatedAtIso), {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-foreground/60"
                  >
                    {t("orgEmpty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ceo-costs-heading" className="space-y-4">
        <h2
          id="ceo-costs-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("costsTitle")}
        </h2>
        <p className="text-sm text-foreground/70 max-w-3xl">{t("costsIntro")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-dashed border-foreground/20 p-4 bg-foreground/[0.02]">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {t("costsVoiceLabel")}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground/40 mt-2">
              —
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-foreground/20 p-4 bg-foreground/[0.02]">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {t("costsTranscriptionLabel")}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground/40 mt-2">
              —
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-foreground/20 p-4 bg-foreground/[0.02]">
            <p className="text-xs text-foreground/60 uppercase tracking-wide">
              {t("costsModelLabel")}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground/40 mt-2">
              —
            </p>
          </div>
        </div>
      </section>

      <DashboardLiveMetrics locale={locale} initialRows={rows} />
    </>
  );
}
