import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import { readOrgPipelineAndOnboarding } from "@/lib/settings/readOrgMetadata";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const can = await userCanEditOrganizationProfile();
  const { orgId } = await auth();
  if (!can || !orgId) {
    redirect(`/${locale}/dashboard/applications`);
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const pm = (org.publicMetadata ?? {}) as Record<string, unknown>;
  const { onboardingComplete } = readOrgPipelineAndOnboarding(pm);

  return (
    <AppChrome>
      <OnboardingClient locale={locale} initialComplete={onboardingComplete} />
    </AppChrome>
  );
}
