import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "es")) {
    locale = routing.defaultLocale;
  }

  const common = (await import(`../../messages/${locale}.json`)).default;
  const terms =
    locale === "es"
      ? (await import("@easy-intake/shared/legal/terms-es.json")).default
      : (await import("@easy-intake/shared/legal/terms-en.json")).default;
  const privacy =
    locale === "es"
      ? (await import("@easy-intake/shared/legal/privacy-es.json")).default
      : (await import("@easy-intake/shared/legal/privacy-en.json")).default;

  return {
    locale,
    messages: {
      ...common,
      terms,
      privacy,
    },
  };
});
