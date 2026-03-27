import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import "../globals.css";

/** Prerender `/en` and `/es` shells so Next can cache static HTML at the edge where nothing below forces dynamic. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  const signInUrl = `/${locale}/sign-in`;
  const signUpUrl = `/${locale}/sign-up`;
  const queueUrl = `/${locale}/dashboard/queue`;

  return (
    <ClerkProvider
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={queueUrl}
      signUpFallbackRedirectUrl={queueUrl}
      signInForceRedirectUrl={queueUrl}
      signUpForceRedirectUrl={queueUrl}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
