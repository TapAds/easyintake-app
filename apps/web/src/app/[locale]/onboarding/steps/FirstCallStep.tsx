"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";

export function FirstCallStep({
  onNext,
  onSkip,
  locale,
}: {
  onNext: (data: Record<string, unknown>) => void;
  onSkip?: () => void;
  locale: string;
}) {
  const t = useTranslations("agencyOnboarding.steps.first_call");
  const tCommon = useTranslations("agencyOnboarding");
  const prefix = `/${locale}`;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{t("heading")}</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/90">
        <li>{t("bullet1")}</li>
        <li>{t("bullet2")}</li>
        <li>{t("bullet3")}</li>
      </ul>
      <p className="text-sm text-foreground/85">{tCommon("completeNote")}</p>
      <div className="rounded-lg border border-dashed border-foreground/20 p-4 text-sm text-foreground/50">
        {/* TODO: implement form */}
      </div>

      <div className="space-y-4">
        <button
          type="button"
          className={`${btnPrimary} w-full py-3 text-base font-semibold shadow-sm`}
          onClick={() => onNext({})}
        >
          {t("definePipeline")}
        </button>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <Link
            href={`${prefix}/dashboard/live-demo`}
            className={`${btnPrimary} text-center no-underline sm:flex-1`}
          >
            {tCommon("linkLiveDemo")}
          </Link>
          <Link
            href={`${prefix}/dashboard/applications`}
            className="inline-flex items-center justify-center rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground/90 hover:bg-foreground/5 no-underline sm:flex-1"
          >
            {t("goToDashboard")}
          </Link>
        </div>
      </div>

      {onSkip ? (
        <div className="pt-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            onClick={() => onSkip()}
          >
            {tCommon("skip")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
