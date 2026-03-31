import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppChrome } from "@/components/AppChrome";
import { DashboardDemoMetrics } from "@/components/dashboard/DashboardDemoMetrics";
import { DashboardLiveMetrics } from "@/components/dashboard/DashboardLiveMetrics";
import { userHasSuperAdminRole } from "@/lib/auth/roles";

function normalizeParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: {
    mode?: string | string[];
    carrier?: string | string[];
    product?: string | string[];
  };
}) {
  const { locale } = params;
  const mode = normalizeParam(searchParams?.mode);
  const carrier = normalizeParam(searchParams?.carrier);
  const product = normalizeParam(searchParams?.product);
  const superAdmin = await userHasSuperAdminRole();

  const filterQuery = (() => {
    const q = new URLSearchParams();
    if (carrier && carrier !== "all") q.set("carrier", carrier);
    if (product && product !== "all") q.set("product", product);
    const s = q.toString();
    return s ? `&${s}` : "";
  })();
  /** Super-admins default to illustrative metrics; append `?mode=live` for API-backed data. */
  const useDemo = superAdmin && mode !== "live";

  const t = await getTranslations("dashboard");

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-foreground/70 max-w-2xl">{t("subtitle")}</p>
          {superAdmin ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-foreground/70">
                {useDemo ? t("superAdmin.demoModeOn") : t("superAdmin.liveModeOn")}
              </span>
              <span className="text-foreground/40" aria-hidden>
                ·
              </span>
              {useDemo ? (
                <Link
                  href={`/${locale}/dashboard?mode=live${filterQuery}`}
                  className="text-primary font-medium underline underline-offset-2"
                >
                  {t("superAdmin.showLiveLink")}
                </Link>
              ) : (
                <Link
                  href={`/${locale}/dashboard${filterQuery ? `?${filterQuery.slice(1)}` : ""}`}
                  className="text-primary font-medium underline underline-offset-2"
                >
                  {t("superAdmin.showDemoLink")}
                </Link>
              )}
            </div>
          ) : null}
        </div>

        {useDemo ? (
          <DashboardDemoMetrics locale={locale} carrier={carrier} product={product} />
        ) : (
          <DashboardLiveMetrics locale={locale} carrier={carrier} product={product} />
        )}
      </main>
    </AppChrome>
  );
}
