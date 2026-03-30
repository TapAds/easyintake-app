"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const switchLocale = (next: string) => {
    const stripped = pathname.replace(/^\/(en|es)/, "") || "/";
    return `/${next}${stripped === "/" ? "" : stripped}`;
  };

  return (
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
  );
}
