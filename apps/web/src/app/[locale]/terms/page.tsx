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

type TermsBundle = {
  pageTitle: string;
  productName: string;
  lastUpdated: string;
  intro: string[];
  contactHeading: string;
  contactBlocks: LegalContentBlock[];
  sections: { heading: string; content: LegalContentBlock[] }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: t("pageTitle"),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const terms = messages.terms as unknown as TermsBundle;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TermsPublicHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {terms.pageTitle}
        </h1>
        <p className="mt-2 text-lg font-medium text-foreground/85">
          {terms.productName}
        </p>
        <p className="mt-1 text-sm text-foreground/60">{terms.lastUpdated}</p>
        <div className="mt-8 space-y-4 text-foreground/80 leading-relaxed">
          {terms.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 space-y-10">
          {terms.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-foreground">
                {section.heading}
              </h2>
              <LegalDocumentBlocks blocks={section.content} />
            </section>
          ))}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              {terms.contactHeading}
            </h2>
            <LegalDocumentBlocks blocks={terms.contactBlocks} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
