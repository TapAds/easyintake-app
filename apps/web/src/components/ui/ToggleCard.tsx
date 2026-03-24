"use client";

import { Check, X } from "lucide-react";

export function ToggleCard({
  label,
  value,
  onToggle,
  disabled,
  id,
  highlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  label: string;
  value: "yes" | "no";
  onToggle?: (v: "yes" | "no") => void;
  disabled?: boolean;
  id?: string;
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      id={id ? `field-${id}` : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2 scroll-mt-20 transition-all ${highlighted ? "ring-2 ring-primary bg-primary/10" : ""}`}
    >
      <span className="text-sm text-slate-900">{label}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onToggle?.("yes")}
          disabled={disabled}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
            value === "yes"
              ? "bg-green-600 text-white"
              : "border border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"
          }`}
          aria-pressed={value === "yes"}
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onToggle?.("no")}
          disabled={disabled}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
            value === "no"
              ? "bg-red-600 text-white"
              : "border border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"
          }`}
          aria-pressed={value === "no"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
