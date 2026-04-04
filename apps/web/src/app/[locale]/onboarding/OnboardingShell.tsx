"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { OnboardingState, OnboardingStepId } from "@easy-intake/shared";
import { ONBOARDING_STEPS, getStepById } from "@easy-intake/shared";
import { getNextStep } from "@/lib/onboarding/getNextStep";
import type { OnboardingLoadError } from "./loadError";
import { AgencyProfileStep } from "./steps/AgencyProfileStep";
import { CrmConnectStep } from "./steps/CrmConnectStep";
import { FirstCallStep } from "./steps/FirstCallStep";
import { InviteTeamStep } from "./steps/InviteTeamStep";
import { PhoneSetupStep } from "./steps/PhoneSetupStep";
import { WelcomeStep } from "./steps/WelcomeStep";

function stepTitleMessageKey(stepId: OnboardingStepId): string {
  switch (stepId) {
    case "welcome":
      return "steps.welcome.title";
    case "agency_profile":
      return "steps.agency_profile.title";
    case "crm_connect":
      return "steps.crm_connect.title";
    case "phone_setup":
      return "steps.phone_setup.title";
    case "invite_team":
      return "steps.invite_team.title";
    case "first_call":
      return "steps.first_call.title";
  }
}

export function OnboardingShell({
  initialState,
  loadError,
}: {
  initialState: OnboardingState;
  loadError: OnboardingLoadError;
}) {
  const t = useTranslations("agencyOnboarding");
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(initialState);
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);

  const stepMeta = getStepById(state.currentStep);
  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === state.currentStep);
  const displayIndex = stepIndex >= 0 ? stepIndex + 1 : 1;
  const totalSteps = ONBOARDING_STEPS.length;
  const stepName = t(stepTitleMessageKey(state.currentStep) as "steps.welcome.title");
  const canSkip = Boolean(stepMeta && !stepMeta.required);

  const persistPatch = useCallback(async (patch: Partial<OnboardingState>) => {
    setSaveError(false);
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setSaveError(true);
        return null;
      }
      const next = (await res.json()) as OnboardingState;
      setState(next);
      return next;
    } catch {
      setSaveError(true);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const handleNext = useCallback(
    async (stepData: Record<string, unknown>) => {
      if (loadError === "no_agency") return;

      const mergedData = { ...state.data, ...stepData };
      const completed = [...state.completedSteps];
      if (!completed.includes(state.currentStep)) {
        completed.push(state.currentStep);
      }

      const next = getNextStep(state.currentStep, mergedData);

      if (next === "pipeline") {
        await persistPatch({
          currentStep: state.currentStep,
          completedSteps: completed,
          data: mergedData,
          completedAt: new Date().toISOString(),
        });
        router.push(`/${locale}/dashboard/onboarding`);
        return;
      }

      if (next === state.currentStep) {
        return;
      }

      await persistPatch({
        currentStep: next,
        completedSteps: completed,
        data: mergedData,
      });
    },
    [loadError, locale, persistPatch, router, state]
  );

  const handleSkip = useCallback(async () => {
    if (!canSkip || loadError === "no_agency") return;
    const next = getNextStep(state.currentStep, state.data);
    if (next === "pipeline" || next === state.currentStep) {
      return;
    }
    await persistPatch({ currentStep: next });
  }, [canSkip, loadError, persistPatch, state.currentStep, state.data]);

  const banner = useMemo(() => {
    if (loadError === "no_agency") {
      return (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
          {t("noAgency")}
        </p>
      );
    }
    if (loadError === "failed") {
      return (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {t("loadError")}
        </p>
      );
    }
    return null;
  }, [loadError, t]);

  const stepProps = {
    onNext: handleNext,
    ...(canSkip ? { onSkip: handleSkip } : {}),
  };

  return (
    <div className="space-y-6">
      {banner}
      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {t("saveError")}
        </p>
      ) : null}
      <p className="text-sm text-foreground/80">
        {t("progress", {
          current: displayIndex,
          total: totalSteps,
          stepName,
        })}
      </p>

      <div className="rounded-xl border border-foreground/10 bg-card p-6 shadow-sm">
        {state.currentStep === "welcome" ? <WelcomeStep {...stepProps} /> : null}
        {state.currentStep === "agency_profile" ? (
          <AgencyProfileStep {...stepProps} />
        ) : null}
        {state.currentStep === "crm_connect" ? <CrmConnectStep {...stepProps} /> : null}
        {state.currentStep === "phone_setup" ? <PhoneSetupStep {...stepProps} /> : null}
        {state.currentStep === "invite_team" ? <InviteTeamStep {...stepProps} /> : null}
        {state.currentStep === "first_call" ? (
          <FirstCallStep {...stepProps} locale={locale} />
        ) : null}
      </div>

      {busy ? (
        <p className="text-sm text-foreground/60" aria-live="polite">
          {t("saving")}
        </p>
      ) : null}
    </div>
  );
}
