"use client";

import { useTranslations } from "next-intl";

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";

export function PhoneSetupStep({
  onNext,
  onSkip,
}: {
  onNext: (data: Record<string, unknown>) => void;
  onSkip?: () => void;
}) {
  const t = useTranslations("agencyOnboarding.steps.phone_setup");
  const tCommon = useTranslations("agencyOnboarding");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{t("heading")}</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/90">
        <li>{t("bullet1")}</li>
        <li>{t("bullet2")}</li>
        <li>{t("bullet3")}</li>
      </ul>
      <div className="rounded-lg border border-dashed border-foreground/20 p-4 text-sm text-foreground/50">
        {/* TODO: implement form */}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} onClick={() => onNext({})}>
          {tCommon("continue")}
        </button>
        {onSkip ? (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            onClick={() => onSkip()}
          >
            {tCommon("skip")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
