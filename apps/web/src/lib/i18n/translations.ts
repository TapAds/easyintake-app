/**
 * Minimal en/es translation stub.
 * Vertical-agnostic.
 */

export type Locale = "en" | "es";

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.loading": "Loading...",
  },
  es: {
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.submit": "Enviar",
    "common.loading": "Cargando...",
  },
};

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
