"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function TermsPublicHeader() {
  const tNav = useTranslations("nav");
  const tPublic = useTranslations("public");
  const locale = useLocale();
  const prefix = `/${locale}`;

  return (
    <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
        <Link
          href={prefix}
          className="text-lg font-semibold text-primary shrink-0"
        >
          {tNav("brand")}
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          <LocaleSwitcher />
          <SignedOut>
            <Link
              href={`${prefix}/sign-in`}
              className="text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              {tPublic("signIn")}
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl={`/${locale}/sign-in`}
              appearance={{ baseTheme: undefined }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
