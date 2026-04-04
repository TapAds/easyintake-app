import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ApplicationsTable } from "@/components/agent/ApplicationsTable";
import { VoiceAgentBridge } from "@/components/agent/VoiceAgentBridge";
import { AppChrome } from "@/components/AppChrome";
import { QueueOrgBootstrap } from "@/components/dashboard/QueueOrgBootstrap";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import { readOrgPipelineAndOnboarding } from "@/lib/settings/readOrgMetadata";

export default async function ApplicationsPage() {
  const t = await getTranslations("agent.applications");
  const locale = await getLocale();
  const agentBase =
    process.env.NEXT_PUBLIC_AGENT_HTML_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";

  let showOnboardingBanner = false;
  if (await userCanEditOrganizationProfile()) {
    const { orgId } = await auth();
    if (orgId) {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      const pm = (org.publicMetadata ?? {}) as Record<string, unknown>;
      const { onboardingComplete } = readOrgPipelineAndOnboarding(pm);
      showOnboardingBanner = !onboardingComplete;
    }
  }

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
        </div>
        {showOnboardingBanner ? (
          <div
            className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            role="region"
            aria-label={t("onboardingBannerCta")}
          >
            <p className="text-sm text-foreground/90">{t("onboardingBannerBody")}</p>
            <Link
              href={`/${locale}/dashboard/onboarding`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shrink-0"
            >
              {t("onboardingBannerCta")}
            </Link>
          </div>
        ) : null}
        <QueueOrgBootstrap>
          <VoiceAgentBridge agentBaseUrl={agentBase} />
          <ApplicationsTable />
        </QueueOrgBootstrap>
      </main>
    </AppChrome>
  );
}
