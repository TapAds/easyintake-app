import "server-only";

/**
 * Comma-separated emails allowed to open the CEO dashboard (in addition to Clerk `super_admin`).
 * Server-only env: `CEO_DASH_ALLOWED_EMAILS`. Do not use NEXT_PUBLIC_* — the browser must not
 * receive this list; the shell calls GET `/api/auth/ceo-dash-access` for a boolean.
 *
 * In development, if unset, defaults to btroth@gmail.com. In production, unset means no one
 * passes the allowlist check.
 */
export function ceoDashAllowedEmails(): string[] {
  const raw = process.env.CEO_DASH_ALLOWED_EMAILS?.trim();

  if (raw) {
    return raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === "development") {
    return ["btroth@gmail.com"];
  }

  return [];
}
