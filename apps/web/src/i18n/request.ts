import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "es")) {
    locale = routing.defaultLocale;
  }

  const common = (await import(`../../messages/${locale}.json`)).default;
  const terms = (await import(`../../messages/terms-${locale}.json`)).default;
  const privacy = (await import(`../../messages/privacy-${locale}.json`)).default;

  return {
    locale,
    messages: {
      ...common,
      terms,
      privacy,
    },
  };
});
