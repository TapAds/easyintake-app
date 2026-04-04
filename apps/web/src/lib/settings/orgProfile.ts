export const ORG_PUBLIC_WEBSITE_URL = "websiteUrl";
export const ORG_PUBLIC_LOGO_URL = "logoUrl";
/** Clerk org `publicMetadata` — validated `OrgPipelineConfig` JSON (`@easy-intake/shared`). */
export const ORG_PUBLIC_PIPELINE_CONFIG = "pipelineConfig";
/** Clerk org `publicMetadata` — boolean; true after org admin completes onboarding (or skips). */
export const ORG_PUBLIC_ONBOARDING_COMPLETE = "onboardingComplete";

export const ALLOWED_LOGO_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_HTML_BYTES = 2 * 1024 * 1024;

export function normalizeWebsiteInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function validateWebsiteForStorage(urlStr: string): string | null {
  if (!urlStr.trim()) return "";
  try {
    const u = new URL(normalizeWebsiteInput(urlStr));
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (process.env.NODE_ENV === "production" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
