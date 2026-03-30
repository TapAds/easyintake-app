"use client";

import { useCallback, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

export type OrganizationInitial = {
  name: string;
  websiteUrl: string;
  logoUrl: string;
};

type OrgErrorKey =
  | "NO_ORG"
  | "FORBIDDEN"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "CLERK"
  | "SAVE_FAILED"
  | "UPLOAD_FAILED"
  | "BLOB_NOT_CONFIGURED"
  | "NETWORK"
  | "FETCH_FAILED"
  | "FETCH_NOT_HTML";

type PreviewState =
  | null
  | {
      dataBase64: string;
      mimeType: string;
      sourceUrl: string;
    };

export function OrganizationSection({
  initial,
  hasOrgId,
}: {
  initial: OrganizationInitial | null;
  hasOrgId: boolean;
}) {
  const t = useTranslations("settings.organization");
  const te = useTranslations("settings.organization.errors");
  const noOrgHeadingId = useId();
  const fileInputId = useId();

  const [open, setOpen] = useState(true);
  const [name, setName] = useState(initial?.name ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<"saved" | null>(null);
  const [errorKey, setErrorKey] = useState<OrgErrorKey | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

  const base64ToFile = useCallback((dataBase64: string, mimeType: string, filename: string) => {
    const binary = atob(dataBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mimeType });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setErrorKey(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/settings/organization-logo/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        if (data.error === "BLOB_NOT_CONFIGURED") setErrorKey("BLOB_NOT_CONFIGURED");
        else if (data.error === "INVALID_TYPE" || data.error === "INVALID_SIZE") setErrorKey("VALIDATION");
        else setErrorKey("UPLOAD_FAILED");
        return;
      }
      if (data.url) setLogoUrl(data.url);
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setUploading(false);
    }
  }, []);

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  const saveProfile = useCallback(async () => {
    setErrorKey(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          websiteUrl: websiteUrl.trim(),
          logoUrl: logoUrl.trim() || "",
        }),
      });
      const data = (await res.json()) as {
        name?: string;
        websiteUrl?: string;
        logoUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        const err = data.error;
        if (err === "NO_ORG" || err === "FORBIDDEN" || err === "VALIDATION" || err === "UNAUTHORIZED") {
          setErrorKey(err);
        } else if (err === "CLERK") {
          setErrorKey("CLERK");
        } else {
          setErrorKey("SAVE_FAILED");
        }
        setSaving(false);
        return;
      }
      if (data.name != null) setName(data.name);
      if (data.websiteUrl != null) setWebsiteUrl(data.websiteUrl);
      if (data.logoUrl != null) setLogoUrl(data.logoUrl);
      setMessage("saved");
      setSaving(false);
      window.setTimeout(() => setMessage(null), 2500);
    } catch {
      setErrorKey("NETWORK");
      setSaving(false);
    }
  }, [name, websiteUrl, logoUrl]);

  const fetchLogoPreview = useCallback(async () => {
    setErrorKey(null);
    setPreview(null);
    setFetching(true);
    try {
      const res = await fetch("/api/settings/organization-logo/fetch-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: websiteUrl.trim() }),
      });
      const data = (await res.json()) as {
        dataBase64?: string;
        mimeType?: string;
        sourceUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.dataBase64 || !data.mimeType) {
        if (data.error === "NOT_HTML") setErrorKey("FETCH_NOT_HTML");
        else setErrorKey("FETCH_FAILED");
        setFetching(false);
        return;
      }
      setPreview({
        dataBase64: data.dataBase64,
        mimeType: data.mimeType,
        sourceUrl: data.sourceUrl ?? "",
      });
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setFetching(false);
    }
  }, [websiteUrl]);

  const approvePreview = useCallback(async () => {
    if (!preview) return;
    const ext =
      preview.mimeType === "image/png"
        ? "png"
        : preview.mimeType === "image/webp"
          ? "webp"
          : preview.mimeType === "image/gif"
            ? "gif"
            : "jpg";
    const file = base64ToFile(preview.dataBase64, preview.mimeType, `logo-from-site.${ext}`);
    setPreview(null);
    await uploadFile(file);
  }, [preview, base64ToFile, uploadFile]);

  if (!hasOrgId) {
    return (
      <section
        className="rounded-xl border border-foreground/15 bg-white shadow-sm dark:bg-zinc-950 dark:border-foreground/20"
        aria-labelledby={noOrgHeadingId}
      >
        <div className="px-5 py-4">
          <h2 id={noOrgHeadingId} className="text-base font-semibold text-foreground">
            {t("sectionTitle")}
          </h2>
          <p className="mt-2 text-sm text-foreground/65">{t("noOrgHint")}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-foreground/15 bg-white shadow-sm dark:bg-zinc-950 dark:border-foreground/20"
      aria-labelledby="org-settings-heading"
    >
      <button
        type="button"
        id="org-settings-heading"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-foreground">{t("sectionTitle")}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-foreground/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-foreground/10 px-5 pb-5 pt-4 space-y-4">
          <p className="text-sm text-foreground/65">{t("sectionHint")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground sm:col-span-2">
              {t("nameLabel")}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                autoComplete="organization"
              />
            </label>
            <label className="block text-sm font-medium text-foreground sm:col-span-2">
              {t("websiteLabel")}
              <input
                type="url"
                inputMode="url"
                placeholder={t("websitePlaceholder")}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </label>
          </div>

          <div className="rounded-lg border border-foreground/12 bg-foreground/[0.03] p-4 space-y-3">
            <div className="text-sm font-medium text-foreground">{t("logoHeading")}</div>
            {logoUrl ? (
              <div className="flex items-start gap-4">
                {/* Blob or arbitrary HTTPS origins; avoid next/image remote config churn */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt=""
                  className="h-16 w-16 rounded-md border border-foreground/10 object-contain bg-white"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    {t("removeLogo")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground/55">{t("logoEmpty")}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={fileInputId}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-foreground/20 bg-background px-3 py-2 text-xs font-medium hover:bg-foreground/5"
              >
                {uploading ? t("uploading") : t("uploadLogo")}
              </label>
              <input
                id={fileInputId}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={onPickFile}
              />
              <button
                type="button"
                disabled={fetching || !websiteUrl.trim()}
                onClick={() => void fetchLogoPreview()}
                className="inline-flex items-center justify-center rounded-lg border border-foreground/20 bg-background px-3 py-2 text-xs font-medium hover:bg-foreground/5 disabled:opacity-50"
              >
                {fetching ? t("fetching") : t("fetchLogoFromWebsite")}
              </button>
            </div>
            <p className="text-xs text-foreground/50">{t("fetchLogoHint")}</p>
          </div>

          {preview ? (
            <div
              className="rounded-lg border border-foreground/15 p-4 space-y-3"
              role="region"
              aria-label={t("previewAria")}
            >
              <div className="text-sm font-medium text-foreground">{t("previewHeading")}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${preview.mimeType};base64,${preview.dataBase64}`}
                alt=""
                className="h-20 w-20 rounded-md border border-foreground/10 object-contain bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void approvePreview()}
                  className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] dark:bg-white dark:text-zinc-900"
                >
                  {t("useThisLogo")}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium"
                >
                  {t("cancelPreview")}
                </button>
              </div>
            </div>
          ) : null}

          {message === "saved" ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t("saved")}</p>
          ) : null}
          {errorKey ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {te(errorKey)}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile()}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
