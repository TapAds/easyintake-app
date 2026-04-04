import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import {
  DEFAULT_ONBOARDING_STATE,
  type OnboardingState,
} from "@easy-intake/shared";
import { AppChrome } from "@/components/AppChrome";
import { OnboardingShell } from "./OnboardingShell";
import type { OnboardingLoadError } from "./loadError";

async function fetchInitialOnboardingState(): Promise<{
  state: OnboardingState;
  error: OnboardingLoadError;
}> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookie = h.get("cookie");
  const url = `${proto}://${host}/api/onboarding/state`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });
  if (res.ok) {
    const body = (await res.json()) as OnboardingState;
    return { state: body, error: "none" };
  }
  if (res.status === 404) {
    return { state: DEFAULT_ONBOARDING_STATE, error: "no_agency" };
  }
  return { state: DEFAULT_ONBOARDING_STATE, error: "failed" };
}

export default async function AgencyOnboardingPage() {
  await auth();
  const t = await getTranslations("agencyOnboarding");
  const { state, error } = await fetchInitialOnboardingState();

  return (
    <AppChrome>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {t("pageTitle")}
        </h1>
        <OnboardingShell initialState={state} loadError={error} />
      </main>
    </AppChrome>
  );
}
