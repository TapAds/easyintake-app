import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { CeoDashOverview } from "@/components/dashboard/CeoDashOverview";
import { userCanAccessCeoDash } from "@/lib/auth/roles";
import { fetchIntakeSessionsListFromBff } from "@/lib/bff/serverFetch";

export default async function CeoDashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  if (!(await userCanAccessCeoDash())) {
    notFound();
  }

  const { locale } = params;
  const rows = await fetchIntakeSessionsListFromBff();
  const t = await getTranslations("ceoDash");

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-foreground/70 max-w-2xl">{t("subtitle")}</p>
        </div>

        <CeoDashOverview locale={locale} rows={rows} />
      </main>
    </AppChrome>
  );
}
