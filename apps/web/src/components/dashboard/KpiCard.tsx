export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 p-4 shadow-sm">
      <p className="text-xs text-foreground/60 leading-snug">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground mt-2">
        {value}
      </p>
    </div>
  );
}
