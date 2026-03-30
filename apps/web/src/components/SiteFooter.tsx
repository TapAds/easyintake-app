"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const prefix = `/${locale}`;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-foreground/10 bg-background/80">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-foreground/65">
        <p>{t("copyright", { year })}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link
            href={`${prefix}/terms`}
            className="text-primary font-medium hover:text-primary/90 hover:underline underline-offset-2"
          >
            {t("terms")}
          </Link>
          <Link
            href={`${prefix}/privacy`}
            className="text-primary font-medium hover:text-primary/90 hover:underline underline-offset-2"
          >
            {t("privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
