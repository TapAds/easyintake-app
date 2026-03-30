"use client";

import { useCallback, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { FormContextDocumentsSection } from "./FormContextDocumentsSection";

type FieldRow = { id: string; label: string };

function newRow(): FieldRow {
  return { id: Math.random().toString(36).slice(2), label: "" };
}

export function AddFormApplicationDialog() {
  const t = useTranslations("settings.addForm");
  const dialogTitleId = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pdf" | "manual">("pdf");
  const [applicationName, setApplicationName] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<FieldRow[]>([newRow()]);
  const [catalogDraft, setCatalogDraft] = useState<unknown>(null);
  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setTab("pdf");
    setApplicationName("");
    setFileName(null);
    setPdfFile(null);
    setContextFiles([]);
    setFields([newRow()]);
    setCatalogDraft(null);
    setAnalyzeError(null);
    setAnalyzeBusy(false);
  }, []);

  const runAnalyzePdf = useCallback(async () => {
    const file = pdfFile;
    if (!file) return;
    setAnalyzeError(null);
    setAnalyzeBusy(true);
    setCatalogDraft(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/intake/form-catalog/analyze", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        draft?: unknown;
      };
      if (!res.ok) {
        setAnalyzeError(data.error ?? t("analyzeError"));
        return;
      }
      setCatalogDraft(data.draft ?? data);
    } catch {
      setAnalyzeError(t("analyzeError"));
    } finally {
      setAnalyzeBusy(false);
    }
  }, [pdfFile, t]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
      >
        {t("button")}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-foreground/15 bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={dialogTitleId} className="text-lg font-semibold text-foreground">
              {t("dialogTitle")}
            </h2>
            <div className="mt-4 flex gap-2 rounded-lg border border-foreground/15 p-1 text-sm">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 font-medium ${
                  tab === "pdf"
                    ? "bg-primary text-white"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
                onClick={() => setTab("pdf")}
              >
                {t("uploadTab")}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 font-medium ${
                  tab === "manual"
                    ? "bg-primary text-white"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
                onClick={() => setTab("manual")}
              >
                {t("manualTab")}
              </button>
            </div>

            <label className="mt-4 block text-sm font-medium text-foreground">
              {t("applicationName")}
              <input
                type="text"
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                autoComplete="off"
              />
            </label>

            {tab === "pdf" ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-foreground/65">{t("pdfHint")}</p>
                <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-foreground/25 bg-foreground/[0.02] px-4 py-6 text-center text-sm">
                  <span className="font-medium text-primary">{t("pdfLabel")}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setPdfFile(f);
                      setFileName(f?.name ?? null);
                      setCatalogDraft(null);
                      setAnalyzeError(null);
                    }}
                  />
                  {fileName ? (
                    <span className="text-foreground/80">{fileName}</span>
                  ) : (
                    <span className="text-foreground/50">{t("pdfChoose")}</span>
                  )}
                </label>
                <button
                  type="button"
                  disabled={!pdfFile || analyzeBusy}
                  className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
                  onClick={() => void runAnalyzePdf()}
                >
                  {analyzeBusy ? t("analyzing") : t("analyzePdf")}
                </button>
                {analyzeError ? (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {analyzeError}
                  </p>
                ) : null}
                {catalogDraft != null ? (
                  <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2">
                    <p className="text-xs font-medium text-foreground/70 mb-1">
                      {t("draftPreviewTitle")}
                    </p>
                    <pre className="max-h-52 overflow-auto text-[11px] font-mono text-foreground/85 whitespace-pre-wrap break-words">
                      {JSON.stringify(catalogDraft, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-foreground/65">{t("manualHint")}</p>
                {fields.map((row, idx) => (
                  <div key={row.id} className="flex gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFields((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, label: v } : r,
                          ),
                        );
                      }}
                      placeholder={t("fieldLabelPlaceholder", { index: idx + 1 })}
                      className="min-w-0 flex-1 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                    />
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-lg border border-foreground/15 px-2 text-sm text-foreground/70 hover:bg-foreground/5"
                        onClick={() =>
                          setFields((prev) => prev.filter((r) => r.id !== row.id))
                        }
                        aria-label={t("removeField")}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setFields((prev) => [...prev, newRow()])}
                >
                  {t("addFieldRow")}
                </button>
              </div>
            )}

            <FormContextDocumentsSection
              files={contextFiles}
              onFilesAdded={(incoming) =>
                setContextFiles((prev) => [...prev, ...incoming])
              }
              onRemoveAt={(index) =>
                setContextFiles((prev) => prev.filter((_, i) => i !== index))
              }
            />

            <p className="mt-4 text-xs text-foreground/55">{t("saveNote")}</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
                onClick={close}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                onClick={close}
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
