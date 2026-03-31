import { ApplicantMicrositeClient } from "@/components/apply/ApplicantMicrositeClient";
import { getTranslations } from "next-intl/server";

export default async function ApplicantApplyPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("apply");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-foreground/70 max-w-2xl">{t("subtitle")}</p>
        </div>
      </header>
      <main className="px-4 py-6">
        <ApplicantMicrositeClient token={token} />
      </main>
      <footer className="border-t border-foreground/10 py-8 text-center text-xs text-foreground/45">
        {t("footerBrand")}
      </footer>
    </div>
  );
}
