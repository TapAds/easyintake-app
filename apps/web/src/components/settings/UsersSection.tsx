"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddUserInviteDialog } from "./AddUserInviteDialog";

export function UsersSection() {
  const t = useTranslations("settings.users");
  const [open, setOpen] = useState(true);

  return (
    <section
      className="rounded-xl border border-foreground/15 bg-white shadow-sm dark:bg-zinc-950 dark:border-foreground/20"
      aria-labelledby="settings-users-heading"
    >
      <button
        type="button"
        id="settings-users-heading"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-foreground">
          {t("sectionTitle")}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-foreground/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-foreground/10 px-5 pb-5 pt-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-foreground/65 sm:max-w-xl">{t("sectionHint")}</p>
            <div className="shrink-0">
              <AddUserInviteDialog />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
