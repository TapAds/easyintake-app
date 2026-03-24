"use client";

import { HelpCircle } from "lucide-react";
import { ConfidenceBar } from "./ConfidenceBar";

type Source = "ai" | "agent_confirmed" | "agent_edited";

const sourceColors: Record<Source, string> = {
  ai: "border-amber-500/50 bg-amber-500/5",
  agent_confirmed: "border-green-500/50 bg-green-500/5",
  agent_edited: "border-blue-500/50 bg-blue-500/5",
};

export function FieldInput({
  label,
  value,
  onChange,
  source = "ai",
  confidence,
  error,
  id,
  highlighted,
  helpText,
  ...props
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  source?: Source;
  confidence?: number;
  error?: boolean;
  id?: string;
  highlighted?: boolean;
  /** Question-bubble tooltip: shows (?) icon; hover to reveal help */
  helpText?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const sourceClass = sourceColors[source] ?? "";
  const errorClass = error ? "border-red-500" : "";
  const highlightClass = highlighted ? "ring-2 ring-primary" : "";
  return (
    <div id={id ? `field-${id}` : undefined} className={`space-y-1 scroll-mt-20 rounded-lg transition-all ${highlighted ? "bg-primary/10 p-1 -m-1" : ""}`}>
      <div className="flex items-center gap-1.5">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-900">
          {label}
        </label>
        {helpText && (
          <span className="group relative inline-flex">
            <HelpCircle className="h-3.5 w-3.5 shrink-0 cursor-help text-slate-500 hover:text-slate-700" aria-label="Help" />
            <span className="pointer-events-none absolute left-0 top-full z-10 mt-0.5 hidden w-64 whitespace-normal rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs font-normal text-slate-700 shadow-lg group-hover:block">
              {helpText}
            </span>
          </span>
        )}
      </div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary ${sourceClass} ${errorClass} ${highlightClass} ${confidence !== undefined && source === "ai" ? "pr-20" : ""}`}
          {...props}
        />
        {confidence !== undefined && source === "ai" && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <ConfidenceBar confidence={confidence} />
          </div>
        )}
      </div>
    </div>
  );
}
