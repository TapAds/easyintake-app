import { getTranslations } from "next-intl/server";
import { AppChrome } from "@/components/AppChrome";
import { AddFormApplicationDialog } from "@/components/settings/AddFormApplicationDialog";
import { CrmIntegrationsSection } from "@/components/settings/crm/CrmIntegrationsSection";
import { userCanConfigureIntake } from "@/lib/auth/roles";

export default async function DashboardSettingsPage() {
  const t = await getTranslations("settings");
  const canConfigure = await userCanConfigureIntake();

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {t("pageTitle")}
            </h1>
            <p className="mt-2 text-foreground/70 max-w-2xl">{t("pageSubtitle")}</p>
          </div>
          {canConfigure ? (
            <div className="shrink-0">
              <AddFormApplicationDialog />
            </div>
          ) : null}
        </div>

        <CrmIntegrationsSection />
      </main>
    </AppChrome>
  );
}
