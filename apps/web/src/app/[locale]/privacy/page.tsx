import type { Metadata } from "next";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

/** Legal routes use Clerk in the header; avoid static prerender so local `next build` without a valid pk is possible. */
export const dynamic = "force-dynamic";
import {
  LegalDocumentBlocks,
  type LegalContentBlock,
} from "@/components/LegalDocumentBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { TermsPublicHeader } from "@/components/TermsPublicHeader";

type PrivacyBundle = {
  pageTitle: string;
  productName: string;
  lastUpdated: string;
  intro: string[];
  sections: { heading: string; content: LegalContentBlock[] }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("pageTitle"),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const privacy = messages.privacy as unknown as PrivacyBundle;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TermsPublicHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {privacy.pageTitle}
        </h1>
        <p className="mt-2 text-lg font-medium text-foreground/85">
          {privacy.productName}
        </p>
        <p className="mt-1 text-sm text-foreground/60">{privacy.lastUpdated}</p>
        <div className="mt-8 space-y-4 text-foreground/80 leading-relaxed">
          {privacy.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 space-y-10">
          {privacy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-foreground">
                {section.heading}
              </h2>
              <LegalDocumentBlocks blocks={section.content} />
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
