"use client";

export interface YesNoFieldGridProps {
  fieldKeys: string[];
  getFieldLabel: (key: string) => string;
  values: Record<string, boolean | undefined>;
  onChange: (key: string, value: boolean) => void;
  className?: string;
}

export function YesNoFieldGrid({
  fieldKeys,
  getFieldLabel,
  values,
  onChange,
  className = "",
}: YesNoFieldGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {fieldKeys.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between p-3 rounded-lg bg-foreground/5 border border-foreground/10"
        >
          <span className="text-sm font-medium text-foreground">
            {getFieldLabel(key)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange(key, true)}
              className={`px-3 py-1 text-sm rounded ${
                values[key] === true
                  ? "bg-primary text-white"
                  : "bg-foreground/10 text-foreground/70 hover:bg-foreground/20"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange(key, false)}
              className={`px-3 py-1 text-sm rounded ${
                values[key] === false
                  ? "bg-primary text-white"
                  : "bg-foreground/10 text-foreground/70 hover:bg-foreground/20"
              }`}
            >
              No
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
