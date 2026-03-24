"use client";

export interface FormSection {
  id: string;
  title: string;
  fieldKeys: string[];
}

export interface FormWithSectionsProps<T = Record<string, unknown>> {
  sections: FormSection[];
  values: T;
  onChange: (key: string, value: unknown) => void;
  renderField: (props: {
    fieldKey: string;
    value: unknown;
    onChange: (value: unknown) => void;
  }) => React.ReactNode;
  className?: string;
}

export function FormWithSections<T extends Record<string, unknown>>({
  sections,
  values,
  onChange,
  renderField,
  className = "",
}: FormWithSectionsProps<T>) {
  const getSectionProgress = (fieldKeys: string[]) => {
    if (fieldKeys.length === 0) return 100;
    const filled = fieldKeys.filter((k) => {
      const v = values[k];
      return v !== undefined && v !== null && v !== "";
    }).length;
    return Math.round((filled / fieldKeys.length) * 100);
  };

  return (
    <form className={`space-y-8 ${className}`}>
      {sections.map((section) => {
        const progress = getSectionProgress(section.fieldKeys);
        return (
          <section key={section.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {section.title}
              </h3>
              <span className="text-sm text-foreground/60">{progress}%</span>
            </div>
            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="space-y-3 pt-2">
              {section.fieldKeys.map((fieldKey) =>
                renderField({
                  fieldKey,
                  value: values[fieldKey],
                  onChange: (v) => onChange(fieldKey, v),
                })
              )}
            </div>
          </section>
        );
      })}
    </form>
  );
}
