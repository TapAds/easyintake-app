import type { VerticalConfig } from "../verticalConfig";

const S_APPLICANT = "applicant";
const S_RESIDENCE = "residence";
const S_ELIGIBILITY = "eligibility";

/**
 * Demo / future N-400 naturalization intake catalog (English + Spanish).
 * Live engine may still emit insurance entity keys until apps/api binds this package end-to-end.
 */
export const USCIS_N400_VERTICAL_CONFIG: VerticalConfig = {
  id: "uscis-n400-demo-v1",
  version: "0.1.0",
  vertical: "immigration",
  configPackageId: "uscis-n400",
  sections: [
    {
      id: S_APPLICANT,
      order: 0,
      labels: { en: "Applicant", es: "Solicitante" },
      description: {
        en: "Identity and A-number for Form N-400.",
        es: "Identidad y número A para el formulario N-400.",
      },
    },
    {
      id: S_RESIDENCE,
      order: 1,
      labels: { en: "Address & contact", es: "Dirección y contacto" },
      description: {
        en: "Mailing and residence for USCIS correspondence.",
        es: "Correo y residencia para correspondencia con USCIS.",
      },
    },
    {
      id: S_ELIGIBILITY,
      order: 2,
      labels: { en: "Eligibility signals", es: "Señales de elegibilidad" },
      description: {
        en: "High-level N-400 eligibility cues often captured on intake.",
        es: "Indicadores de elegibilidad del N-400 que suelen captarse en la captación.",
      },
    },
  ],
  fields: [
    {
      key: "alienNumber",
      type: "text",
      sectionId: S_APPLICANT,
      order: 0,
      labels: { en: "A-Number (if any)", es: "Número A (si aplica)" },
      stage: "application",
    },
    {
      key: "firstName",
      type: "text",
      sectionId: S_APPLICANT,
      order: 1,
      labels: { en: "Given name", es: "Nombre" },
      validation: [{ kind: "required" }],
      weight: 10,
      stage: "application",
    },
    {
      key: "lastName",
      type: "text",
      sectionId: S_APPLICANT,
      order: 2,
      labels: { en: "Family name", es: "Apellido" },
      validation: [{ kind: "required" }],
      weight: 10,
      stage: "application",
    },
    {
      key: "dateOfBirth",
      type: "date",
      sectionId: S_APPLICANT,
      order: 3,
      labels: { en: "Date of birth", es: "Fecha de nacimiento" },
      validation: [{ kind: "required" }],
      weight: 20,
      stage: "application",
    },
    {
      key: "countryOfBirth",
      type: "text",
      sectionId: S_APPLICANT,
      order: 4,
      labels: { en: "Country of birth", es: "País de nacimiento" },
      stage: "application",
    },
    {
      key: "maritalStatus",
      type: "enum",
      sectionId: S_APPLICANT,
      order: 5,
      labels: { en: "Marital status", es: "Estado civil" },
      stage: "application",
    },
    {
      key: "address",
      type: "address",
      sectionId: S_RESIDENCE,
      order: 0,
      labels: { en: "Mailing address", es: "Dirección postal" },
      stage: "application",
    },
    {
      key: "city",
      type: "text",
      sectionId: S_RESIDENCE,
      order: 1,
      labels: { en: "City", es: "Ciudad" },
      stage: "application",
    },
    {
      key: "state",
      type: "text",
      sectionId: S_RESIDENCE,
      order: 2,
      labels: { en: "State", es: "Estado" },
      stage: "application",
    },
    {
      key: "zip",
      type: "text",
      sectionId: S_RESIDENCE,
      order: 3,
      labels: { en: "ZIP code", es: "Código postal" },
      stage: "application",
    },
    {
      key: "phone",
      type: "phone",
      sectionId: S_RESIDENCE,
      order: 4,
      labels: { en: "Daytime phone", es: "Teléfono diurno" },
      stage: "application",
    },
    {
      key: "email",
      type: "email",
      sectionId: S_RESIDENCE,
      order: 5,
      labels: { en: "Email", es: "Correo electrónico" },
      stage: "application",
    },
    {
      key: "dateBecameLpr",
      type: "date",
      sectionId: S_ELIGIBILITY,
      order: 0,
      labels: {
        en: "Date became lawful permanent resident",
        es: "Fecha en que se obtuvo la residencia permanente",
      },
      stage: "application",
    },
    {
      key: "yearsAsLpr",
      type: "number",
      sectionId: S_ELIGIBILITY,
      order: 1,
      labels: {
        en: "Years as permanent resident (if known)",
        es: "Años como residente permanente (si se conoce)",
      },
      stage: "application",
    },
  ],
};
