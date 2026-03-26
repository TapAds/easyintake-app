"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  const switchLocale = (next: string) => {
    const stripped = pathname.replace(/^\/(en|es)/, "") || "/";
    return `/${next}${stripped === "/" ? "" : stripped}`;
  };

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
              EasyAppIntake
            </Link>
            <nav className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm font-medium">
              <Link
                href={prefix}
                className={`hover:text-foreground ${
                  pathname === prefix || pathname === `${prefix}/`
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
              >
                {t("home")}
              </Link>
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
                href={`${prefix}/dashboard/queue`}
                className={`hover:text-foreground ${
                  pathname.startsWith(`${prefix}/dashboard/queue`)
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
              >
                {t("intakeQueue")}
              </Link>
              <Link
                href={`${prefix}/dashboard/sessions/sess_stub`}
                className={`hover:text-foreground ${
                  pathname.startsWith(`${prefix}/dashboard/sessions`)
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
              >
                {t("sessionDetail")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex rounded-lg border border-foreground/15 overflow-hidden text-xs font-medium">
              <Link
                href={switchLocale("en")}
                className={`px-2.5 py-1.5 ${
                  locale === "en"
                    ? "bg-primary text-white"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                EN
              </Link>
              <Link
                href={switchLocale("es")}
                className={`px-2.5 py-1.5 ${
                  locale === "es"
                    ? "bg-primary text-white"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                ES
              </Link>
            </div>
            <UserButton
              afterSignOutUrl="/en/sign-in"
              appearance={{ baseTheme: undefined }}
            />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
