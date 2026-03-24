import type { Locale } from "./config";
import { defaultLocale } from "./config";

export const LOCALE_COOKIE_NAME = "locale";

/** 1 year in seconds */
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function getLocaleFromCookie(cookieValue: string | undefined): Locale {
  if (cookieValue === "en" || cookieValue === "es") {
    return cookieValue as Locale;
  }
  return defaultLocale;
}
