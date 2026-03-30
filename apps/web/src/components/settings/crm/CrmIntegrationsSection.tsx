"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { CrmLogo, type CrmId } from "./CrmBrandLogos";

const CRM_ORDER: CrmId[] = [
  "pipedrive",
  "gohighlevel",
  "hubspot",
  "salesforce",
  "attio",
  "exlynx",
  "agencyzoom",
  "agentcrm",
];

export function CrmIntegrationsSection() {
  const t = useTranslations("settings.crm");
  const tName = useTranslations("settings.crm.names");
  const [open, setOpen] = useState(true);

  return (
    <section
      className="rounded-xl border border-foreground/15 bg-white shadow-sm dark:bg-zinc-950 dark:border-foreground/20"
      aria-labelledby="crm-integrations-heading"
    >
      <button
        type="button"
        id="crm-integrations-heading"
        onClick={() => setOpen((v) => !v)}
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
          <p className="text-sm text-foreground/65 mb-4">{t("sectionHint")}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CRM_ORDER.map((id) => {
              const displayName = tName(id);
              return (
                <li
                  key={id}
                  className="flex flex-col gap-2.5 rounded-lg border border-foreground/12 bg-background p-3 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <CrmLogo id={id} size={40} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground text-sm truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-foreground/55">
                        {t("statusNotConnected")}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#111827] px-3 py-2 text-xs font-medium text-white hover:bg-[#1f2937] sm:w-auto sm:justify-center dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    <CrmLogo id={id} size={18} className="rounded-sm" />
                    {t("connectNamed", { name: displayName })}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
