"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

/** Browser-friendly extensions and MIME hints for instructional uploads. */
export const CONTEXT_DOCUMENTS_ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/png,image/jpeg,image/webp";

type Props = {
  files: File[];
  onFilesAdded: (next: File[]) => void;
  onRemoveAt: (index: number) => void;
};

export function FormContextDocumentsSection({
  files,
  onFilesAdded,
  onRemoveAt,
}: Props) {
  const t = useTranslations("settings.addForm");
  const sectionTitleId = useId();
  const hintId = useId();
  const inputId = useId();

  return (
    <section
      className="mt-6 rounded-lg border border-foreground/12 bg-foreground/[0.02] p-4"
      aria-labelledby={sectionTitleId}
    >
      <h3
        id={sectionTitleId}
        className="text-sm font-semibold text-foreground"
      >
        {t("contextSectionTitle")}
      </h3>
      <p className="mt-2 text-sm text-foreground/80">{t("contextDocsPrompt")}</p>
      <p className="mt-2 text-sm text-foreground/65">
        {t("contextDocsDecisionHint")}
      </p>
      <p id={hintId} className="mt-2 text-xs text-foreground/55">
        {t("contextDocsAcceptHint")}
      </p>

      <label
        htmlFor={inputId}
        className="mt-3 flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-foreground/25 bg-background px-4 py-4 text-center text-sm"
      >
        <span className="font-medium text-primary">{t("contextDocsLabel")}</span>
        <span className="text-foreground/50">{t("contextDocsChoose")}</span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={CONTEXT_DOCUMENTS_ACCEPT}
          className="sr-only"
          aria-describedby={hintId}
          onChange={(e) => {
            const list = e.target.files;
            if (!list?.length) return;
            onFilesAdded(Array.from(list));
            e.target.value = "";
          }}
        />
      </label>

      {files.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/50">{t("contextDocsEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2"
            >
              <span className="min-w-0 truncate text-foreground/90">
                {file.name}
              </span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-foreground/15 px-2 py-1 text-xs font-medium text-foreground/70 hover:bg-foreground/5"
                onClick={() => onRemoveAt(index)}
                aria-label={t("contextDocsRemoveFile", { fileName: file.name })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
