import { getTranslations } from "next-intl/server";
import { UserButton } from "@clerk/nextjs";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <header className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t("comingSoon")}
        </h1>
      </main>
    </div>
  );
}
