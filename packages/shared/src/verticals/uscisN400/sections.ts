import type { VerticalSection } from "../../verticalConfig";

export const N400_SECTION_IDS = {
  applicant: "n400-applicant-info",
  employmentTravel: "n400-employment-travel",
  additional: "n400-additional-info",
  contact: "n400-contact-info",
} as const;

export const N400_SECTIONS: VerticalSection[] = [
  {
    id: N400_SECTION_IDS.applicant,
    order: 0,
    labels: {
      en: "Applicant Information",
      es: "Información del solicitante",
    },
    description: {
      en: "Eligibility, identity, biographic data, residence, parents, and marital history (N-400 Parts 1–6).",
      es: "Elegibilidad, identidad, biografía, residencia, padres e historial marital (Partes 1–6 del N-400).",
    },
  },
  {
    id: N400_SECTION_IDS.employmentTravel,
    order: 1,
    labels: {
      en: "Employment & Travel",
      es: "Empleo y viajes",
    },
    description: {
      en: "Employment, schools, and time outside the United States (N-400 Parts 7–8).",
      es: "Empleo, estudios y tiempo fuera de los Estados Unidos (Partes 7–8 del N-400).",
    },
  },
  {
    id: N400_SECTION_IDS.additional,
    order: 2,
    labels: {
      en: "Additional Info",
      es: "Información adicional",
    },
    description: {
      en: "Moral character, declarations, and interpreter/preparer (N-400 Parts 9–16, except contact).",
      es: "Buena moral, declaraciones e intérprete/preparador (Partes 9–16, excepto contacto).",
    },
  },
  {
    id: N400_SECTION_IDS.contact,
    order: 3,
    labels: {
      en: "Contact Information",
      es: "Información de contacto",
    },
    description: {
      en: "How to reach the applicant.",
      es: "Cómo contactar al solicitante.",
    },
  },
];
