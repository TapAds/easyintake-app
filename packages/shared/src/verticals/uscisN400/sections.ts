import type { VerticalSection } from "../../verticalConfig";

export const N400_SECTION_IDS = {
  p1: "n400-p1",
  p2: "n400-p2",
  p3: "n400-p3",
  p4: "n400-p4",
  p5: "n400-p5",
  p6: "n400-p6",
  p7: "n400-p7",
  p8: "n400-p8",
  p9: "n400-p9",
  p10: "n400-p10",
  p11: "n400-p11",
  p12: "n400-p12",
  p13: "n400-p13",
  p14: "n400-p14",
  p15: "n400-p15",
  p16: "n400-p16",
} as const;

export const N400_SECTIONS: VerticalSection[] = [
  {
    id: N400_SECTION_IDS.p1,
    order: 0,
    labels: {
      en: "Part 1. Information About Your Eligibility",
      es: "Parte 1. Información sobre su elegibilidad",
    },
    description: {
      en: "Basis for N-400 filing (USCIS Form edition-aligned catalog).",
      es: "Base de la solicitud N-400 (catálogo alineado con la edición del formulario).",
    },
  },
  {
    id: N400_SECTION_IDS.p2,
    order: 1,
    labels: {
      en: "Part 2. Information About You",
      es: "Parte 2. Información sobre usted",
    },
  },
  {
    id: N400_SECTION_IDS.p3,
    order: 2,
    labels: {
      en: "Part 3. Biographic Information",
      es: "Parte 3. Información biográfica",
    },
  },
  {
    id: N400_SECTION_IDS.p4,
    order: 3,
    labels: {
      en: "Part 4. Information About Your Residence",
      es: "Parte 4. Información sobre su residencia",
    },
  },
  {
    id: N400_SECTION_IDS.p5,
    order: 4,
    labels: {
      en: "Part 5. Information About Your Parents",
      es: "Parte 5. Información sobre sus padres",
    },
  },
  {
    id: N400_SECTION_IDS.p6,
    order: 5,
    labels: {
      en: "Part 6. Information About Your Marital History",
      es: "Parte 6. Información sobre su historial marital",
    },
  },
  {
    id: N400_SECTION_IDS.p7,
    order: 6,
    labels: {
      en: "Part 7. Employment and Schools",
      es: "Parte 7. Empleo y estudios",
    },
  },
  {
    id: N400_SECTION_IDS.p8,
    order: 7,
    labels: {
      en: "Part 8. Time Outside the United States",
      es: "Parte 8. Tiempo fuera de los Estados Unidos",
    },
  },
  {
    id: N400_SECTION_IDS.p9,
    order: 8,
    labels: {
      en: "Part 9. Additional Questions (good moral character)",
      es: "Parte 9. Preguntas adicionales (buena conducta moral)",
    },
  },
  {
    id: N400_SECTION_IDS.p10,
    order: 9,
    labels: {
      en: "Part 10. Additional Reasons for Denial",
      es: "Parte 10. Motivos adicionales de denegación",
    },
  },
  {
    id: N400_SECTION_IDS.p11,
    order: 10,
    labels: {
      en: "Part 11. Military Service",
      es: "Parte 11. Servicio militar",
    },
  },
  {
    id: N400_SECTION_IDS.p12,
    order: 11,
    labels: {
      en: "Part 12. Child Support",
      es: "Parte 12. Manutención infantil",
    },
  },
  {
    id: N400_SECTION_IDS.p13,
    order: 12,
    labels: {
      en: "Part 13. Name Change",
      es: "Parte 13. Cambio de nombre",
    },
  },
  {
    id: N400_SECTION_IDS.p14,
    order: 13,
    labels: {
      en: "Part 14. Applicant’s Statement and Declaration",
      es: "Parte 14. Declaración del solicitante",
    },
  },
  {
    id: N400_SECTION_IDS.p15,
    order: 14,
    labels: {
      en: "Part 15. Interpreter",
      es: "Parte 15. Intérprete",
    },
  },
  {
    id: N400_SECTION_IDS.p16,
    order: 15,
    labels: {
      en: "Part 16. Preparer",
      es: "Parte 16. Preparador",
    },
  },
];
