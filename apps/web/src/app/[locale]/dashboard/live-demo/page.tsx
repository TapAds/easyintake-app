import { getTranslations } from "next-intl/server";
import { AppChrome } from "@/components/AppChrome";
import { LiveDemoClient } from "@/components/demo/LiveDemoClient";

export default async function LiveDemoPage() {
  const t = await getTranslations("demo.live");
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_AGENT_HTML_URL ?? "";

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 space-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-foreground/70 max-w-3xl">{t("subtitle")}</p>
        </div>
        <LiveDemoClient apiBaseUrl={apiBase} />
      </main>
    </AppChrome>
  );
}
