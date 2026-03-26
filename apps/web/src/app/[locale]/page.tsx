import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppChrome } from "@/components/AppChrome";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const prefix = `/${locale}`;

  return (
    <AppChrome>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-lg mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-4 text-foreground/75 leading-relaxed">{t("intro")}</p>
        <p className="mt-3 text-sm text-foreground/60 leading-relaxed">
          {t("signedInBlurb")}
        </p>
        <Link
          href={`${prefix}/dashboard`}
          className="mt-8 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("goToDashboard")}
        </Link>
      </main>
    </AppChrome>
  );
}
