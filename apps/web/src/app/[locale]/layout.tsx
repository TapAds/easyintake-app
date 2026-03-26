import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import "../globals.css";

export const dynamic = "force-dynamic";

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
