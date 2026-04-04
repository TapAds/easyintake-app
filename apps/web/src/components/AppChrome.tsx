"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteFooter } from "@/components/SiteFooter";
import { useClientCeoDashAccess } from "@/lib/auth/useClientCeoDashAccess";
import { useClientSuperAdmin } from "@/lib/auth/useClientSuperAdmin";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const isSuperAdmin = useClientSuperAdmin();
  const showCeoDash = useClientCeoDashAccess();
  const voiceHrefSegment = isSuperAdmin ? "live-demo" : "live-call";
  const voiceNavActive =
    pathname.startsWith(`/${locale}/dashboard/live-demo`) ||
    pathname.startsWith(`/${locale}/dashboard/live-call`);

  const prefix = `/${locale}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
          <div className="flex items-center gap-8 min-w-0">
            <Link
              href={prefix}
              className="text-lg font-semibold text-primary shrink-0"
            >
              {t("brand")}
            </Link>
            <nav className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm font-medium">
              <Link
                href={`${prefix}/dashboard`}
                className={`hover:text-foreground ${
                  pathname === `${prefix}/dashboard` ||
                  pathname === `${prefix}/dashboard/`
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
              >
                {t("overview")}
              </Link>
              <Link
                href={`${prefix}/dashboard/applications`}
                className={`hover:text-foreground ${
                  pathname.startsWith(`${prefix}/dashboard/applications`) ||
                  pathname.startsWith(`${prefix}/dashboard/queue`) ||
                  pathname.startsWith(`${prefix}/dashboard/sessions/`)
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
              >
                {t("intakeQueue")}
              </Link>
              <Link
                href={`${prefix}/dashboard/${voiceHrefSegment}`}
                className={`hover:text-foreground ${
                  voiceNavActive ? "text-primary" : "text-foreground/70"
                }`}
              >
                {isSuperAdmin ? t("liveDemo") : t("liveCall")}
              </Link>
              <Link
                href={`${prefix}/dashboard/settings`}
                className={`hover:text-foreground ${
                  pathname.startsWith(`${prefix}/dashboard/settings`)
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
              >
                {t("settings")}
              </Link>
              {showCeoDash ? (
                <Link
                  href={`${prefix}/dashboard/ceo`}
                  className={`hover:text-foreground ${
                    pathname.startsWith(`${prefix}/dashboard/ceo`)
                      ? "text-primary"
                      : "text-foreground/70"
                  }`}
                >
                  {t("ceoDash")}
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <LocaleSwitcher />
            <UserButton
              afterSignOutUrl={`/${locale}/sign-in`}
              appearance={{ baseTheme: undefined }}
            />
          </div>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}
