export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const isLow = confidence < 0.75;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all ${isLow ? "bg-amber-500" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-900">{pct}%</span>
    </div>
  );
}
