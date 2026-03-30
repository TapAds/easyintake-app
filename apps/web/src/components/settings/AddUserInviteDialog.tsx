"use client";

import { useCallback, useId, useState } from "react";
import { useTranslations } from "next-intl";

type InviteErrorCode = "NO_ORG" | "FORBIDDEN" | "VALIDATION" | "CLERK" | "UNAUTHORIZED" | "NETWORK";

export function AddUserInviteDialog() {
  const t = useTranslations("settings.users.invite");
  const dialogTitleId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"org:member" | "org:admin">("org:member");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<InviteErrorCode | null>(null);
  const [clerkDetail, setClerkDetail] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setName("");
    setEmail("");
    setRole("org:member");
    setSubmitting(false);
    setErrorCode(null);
    setClerkDetail(null);
    setSuccess(false);
  }, []);

  const submit = useCallback(async () => {
    setErrorCode(null);
    setClerkDetail(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/organization-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        const code = data.error;
        if (
          code === "NO_ORG" ||
          code === "FORBIDDEN" ||
          code === "VALIDATION" ||
          code === "CLERK" ||
          code === "UNAUTHORIZED"
        ) {
          setErrorCode(code);
        } else {
          setErrorCode("CLERK");
        }
        if (data.message) setClerkDetail(data.message);
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setSubmitting(false);
      window.setTimeout(() => close(), 1200);
    } catch {
      setErrorCode("NETWORK");
      setSubmitting(false);
    }
  }, [name, email, role, close]);

  const errorMessage =
    errorCode != null
      ? `${t(`errors.${errorCode}`)}${clerkDetail && errorCode === "CLERK" ? ` (${clerkDetail})` : ""}`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
      >
        {t("addUserButton")}
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
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-foreground/15 bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={dialogTitleId} className="text-lg font-semibold text-foreground">
              {t("dialogTitle")}
            </h2>
            <p className="mt-2 text-sm text-foreground/65">{t("dialogHint")}</p>

            <label className="mt-4 block text-sm font-medium text-foreground">
              {t("nameLabel")}
              <input
                type="text"
                name="invite-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                placeholder={t("namePlaceholder")}
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-foreground">
              {t("emailLabel")}
              <input
                type="email"
                name="invite-email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                placeholder={t("emailPlaceholder")}
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-foreground">
              {t("roleLabel")}
              <select
                name="invite-role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value === "org:admin" ? "org:admin" : "org:member")
                }
                className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              >
                <option value="org:member">{t("roleMember")}</option>
                <option value="org:admin">{t("roleAdmin")}</option>
              </select>
            </label>

            {success ? (
              <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {t("success")}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-foreground/15 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                className="rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {submitting ? t("sending") : t("sendInvite")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
