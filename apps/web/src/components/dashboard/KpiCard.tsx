import { Info } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  /** Shown on hover/focus on the info icon (native tooltip + accessible label). */
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-foreground/10 p-4 shadow-sm">
      <p className="text-xs text-foreground/60 leading-snug flex items-start gap-1.5">
        <span className="flex-1">{label}</span>
        {hint ? (
          <span className="shrink-0 inline-flex" title={hint}>
            <Info
              className="h-4 w-4 text-foreground/40 hover:text-foreground/60 cursor-help mt-0.5"
              strokeWidth={2}
              aria-hidden
            />
            <span className="sr-only">{hint}</span>
          </span>
        ) : null}
      </p>
      <p className="text-xl font-semibold tabular-nums text-foreground mt-2">
        {value}
      </p>
    </div>
  );
}
