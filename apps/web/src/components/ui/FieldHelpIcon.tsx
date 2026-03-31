"use client";

import { HelpCircle } from "lucide-react";

/** Small (?) control; shows `text` in a hover/focus tooltip (matches `FieldInput` help pattern). */
export function FieldHelpIcon({
  text,
  label,
}: {
  text: string;
  /** Accessible name, e.g. field label */
  label: string;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded p-0.5 text-foreground/45 hover:text-foreground/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label={`${label} — help`}
      >
        <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-[min(20rem,calc(100vw-2rem))] whitespace-normal rounded-md border border-foreground/15 bg-background px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-foreground shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
