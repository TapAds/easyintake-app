import { auth, clerkClient } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { AppChrome } from "@/components/AppChrome";
import { AddFormApplicationDialog } from "@/components/settings/AddFormApplicationDialog";
import { CrmIntegrationsSection } from "@/components/settings/crm/CrmIntegrationsSection";
import type { OrganizationInitial } from "@/components/settings/OrganizationSection";
import { OrganizationSection } from "@/components/settings/OrganizationSection";
import { UsersSection } from "@/components/settings/UsersSection";
import {
  userCanConfigureIntake,
  userCanEditOrganizationProfile,
  userCanViewSettingsUsers,
} from "@/lib/auth/roles";
import { ORG_PUBLIC_LOGO_URL, ORG_PUBLIC_WEBSITE_URL } from "@/lib/settings/orgProfile";

export default async function DashboardSettingsPage() {
  const t = await getTranslations("settings");
  const canConfigure = await userCanConfigureIntake();
  const showUsers = await userCanViewSettingsUsers();
  const canEditOrg = await userCanEditOrganizationProfile();
  const { orgId } = await auth();

  let organizationInitial: OrganizationInitial | null = null;
  if (canEditOrg && orgId) {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const pm = (org.publicMetadata ?? {}) as Record<string, unknown>;
    organizationInitial = {
      name: org.name,
      websiteUrl:
        typeof pm[ORG_PUBLIC_WEBSITE_URL] === "string" ? pm[ORG_PUBLIC_WEBSITE_URL] : "",
      logoUrl: typeof pm[ORG_PUBLIC_LOGO_URL] === "string" ? pm[ORG_PUBLIC_LOGO_URL] : "",
    };
  }

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

        {canEditOrg ? (
          <OrganizationSection initial={organizationInitial} hasOrgId={Boolean(orgId)} />
        ) : null}

        {showUsers ? <UsersSection /> : null}

        <CrmIntegrationsSection />
      </main>
    </AppChrome>
  );
}
