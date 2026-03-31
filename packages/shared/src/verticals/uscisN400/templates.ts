/**
 * Copy keys and format helpers for N-400 workflow messaging (SMS / voice / in-app).
 * Surfaces in `apps/web` via next-intl; API may use these for server-rendered nudges (Release B).
 */

/** Map stable id → bilingual template strings. Use `{{targetSubmissionDate}}` as placeholder. */
export const N400_TEMPLATE_COPY = {
  "n400.template.early_filing.pre_window.body": {
    en: "Good news — you can start your application with us today so everything is ready. Under USCIS rules, we cannot officially submit your forms until {{targetSubmissionDate}}. Let's get your information and documents organized now so we can file as soon as you are eligible.",
    es: "¡Buenas noticias! Puede comenzar su solicitud con nosotros hoy para tener todo listo. Según las reglas de USCIS, no podemos presentar oficialmente sus formularios hasta el {{targetSubmissionDate}}. Organicemos ahora su información y documentos para presentar en cuanto sea elegible.",
  },
} as const;

export type N400TemplateId = keyof typeof N400_TEMPLATE_COPY;

export type N400TemplateLocale = "en" | "es";

export function getN400TemplateBody(
  templateId: N400TemplateId,
  locale: N400TemplateLocale
): string {
  const row = N400_TEMPLATE_COPY[templateId];
  return locale === "es" ? row.es : row.en;
}

/** Replace `{{targetSubmissionDate}}` (ISO YYYY-MM-DD or localized string from caller). */
export function formatN400Template(
  templateId: N400TemplateId,
  locale: N400TemplateLocale,
  vars: { targetSubmissionDate: string }
): string {
  return getN400TemplateBody(templateId, locale).replace(
    /\{\{targetSubmissionDate\}\}/g,
    vars.targetSubmissionDate
  );
}

/** Map `evaluateEarlyFilingWindow` messageKey → template id when applicable. */
export function n400EarlyFilingMessageKeyToTemplateId(
  messageKey: string
): N400TemplateId | null {
  if (messageKey === "n400.rules.early_filing.pre_window_collection") {
    return "n400.template.early_filing.pre_window.body";
  }
  return null;
}
