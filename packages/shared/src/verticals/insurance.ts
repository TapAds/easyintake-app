import type { VerticalConfig } from "../verticalConfig";

const S_IDENTITY = "identity";
const S_CONTACT = "contact";
const S_COVERAGE = "coverage";
const S_UNDERWRITING = "underwriting";
const S_BENEFICIARY = "beneficiary";

/**
 * Insurance vertical — reference config package proving the VerticalConfig schema.
 * Field keys align with historical LifeInsuranceEntity / fieldStages naming in apps/api.
 */
export const INSURANCE_VERTICAL_CONFIG: VerticalConfig = {
  id: "insurance-default-v1",
  version: "1.0.0",
  vertical: "insurance",
  configPackageId: "insurance",
  sections: [
    {
      id: S_IDENTITY,
      order: 0,
      labels: {
        en: "Identity",
        es: "Identidad",
      },
      description: {
        en: "Legal name and basic demographics.",
        es: "Nombre legal y datos demográficos básicos.",
      },
      hitl: { requiresAgentReview: false },
    },
    {
      id: S_CONTACT,
      order: 1,
      labels: {
        en: "Contact",
        es: "Contacto",
      },
      description: {
        en: "How we reach the applicant.",
        es: "Cómo contactamos al solicitante.",
      },
    },
    {
      id: S_COVERAGE,
      order: 2,
      labels: {
        en: "Coverage needs",
        es: "Necesidades de cobertura",
      },
      description: {
        en: "Product interest and budget.",
        es: "Interés en producto y presupuesto.",
      },
      hitl: { requiresAgentReview: true },
    },
    {
      id: S_UNDERWRITING,
      order: 3,
      labels: {
        en: "Health & underwriting",
        es: "Salud y suscripción",
      },
      description: {
        en: "Underwriting signals for quoting.",
        es: "Señales de suscripción para cotización.",
      },
      hitl: {
        requiresAgentReview: true,
        requiresDocumentApproval: false,
      },
    },
    {
      id: S_BENEFICIARY,
      order: 4,
      labels: {
        en: "Beneficiary",
        es: "Beneficiario",
      },
      description: {
        en: "Primary beneficiary (if collected on intake).",
        es: "Beneficiario principal (si se recopila en la captación).",
      },
      hitl: { requiresFinalSignOff: true },
    },
  ],
  fields: [
    {
      key: "firstName",
      type: "text",
      sectionId: S_IDENTITY,
      order: 0,
      labels: { en: "First name", es: "Nombre" },
      validation: [{ kind: "required" }, { kind: "minLength", value: 1 }],
      weight: 10,
      stage: "quote",
    },
    {
      key: "lastName",
      type: "text",
      sectionId: S_IDENTITY,
      order: 1,
      labels: { en: "Last name", es: "Apellido" },
      validation: [{ kind: "required" }, { kind: "minLength", value: 1 }],
      weight: 10,
      stage: "quote",
    },
    {
      key: "dateOfBirth",
      type: "date",
      sectionId: S_IDENTITY,
      order: 2,
      labels: { en: "Date of birth", es: "Fecha de nacimiento" },
      validation: [{ kind: "required" }],
      weight: 20,
      stage: "quote",
    },
    {
      key: "gender",
      type: "enum",
      sectionId: S_IDENTITY,
      order: 3,
      labels: { en: "Gender", es: "Género" },
      validation: [{ kind: "required" }],
      weight: 25,
      stage: "quote",
    },
    {
      key: "phone",
      type: "phone",
      sectionId: S_CONTACT,
      order: 0,
      labels: { en: "Phone", es: "Teléfono" },
      validation: [{ kind: "required" }],
      weight: 5,
      stage: "quote",
    },
    {
      key: "email",
      type: "email",
      sectionId: S_CONTACT,
      order: 1,
      labels: { en: "Email", es: "Correo electrónico" },
      weight: 15,
      stage: "quote",
    },
    {
      key: "preferredContactMethod",
      type: "enum",
      sectionId: S_CONTACT,
      order: 2,
      labels: {
        en: "Preferred contact method",
        es: "Método de contacto preferido",
      },
      validation: [
        { kind: "enum", value: ["sms", "whatsapp", "email", "phone"] },
      ],
      weight: 6,
      stage: "quote",
    },
    {
      key: "address",
      type: "address",
      sectionId: S_CONTACT,
      order: 3,
      labels: { en: "Street address", es: "Dirección" },
      stage: "application",
    },
    {
      key: "city",
      type: "text",
      sectionId: S_CONTACT,
      order: 4,
      labels: { en: "City", es: "Ciudad" },
      stage: "application",
    },
    {
      key: "state",
      type: "text",
      sectionId: S_CONTACT,
      order: 5,
      labels: { en: "State", es: "Estado" },
      validation: [{ kind: "required" }],
      weight: 18,
      stage: "quote",
    },
    {
      key: "zip",
      type: "text",
      sectionId: S_CONTACT,
      order: 6,
      labels: { en: "ZIP code", es: "Código postal" },
      stage: "application",
    },
    {
      key: "coverageAmountDesired",
      type: "currency",
      sectionId: S_COVERAGE,
      order: 0,
      labels: {
        en: "Coverage amount desired",
        es: "Monto de cobertura deseado",
      },
      validation: [{ kind: "required" }, { kind: "min", value: 0 }],
      hitl: { requiresAgentReview: true },
      weight: 8,
      stage: "quote",
    },
    {
      key: "productTypeInterest",
      type: "enum",
      sectionId: S_COVERAGE,
      order: 1,
      labels: {
        en: "Product type interest",
        es: "Tipo de producto de interés",
      },
      validation: [{ kind: "required" }],
      weight: 12,
      stage: "quote",
    },
    {
      key: "termLengthDesired",
      type: "number",
      sectionId: S_COVERAGE,
      order: 2,
      labels: {
        en: "Term length (years)",
        es: "Plazo (años)",
      },
      stage: "quote",
    },
    {
      key: "budgetMonthly",
      type: "currency",
      sectionId: S_COVERAGE,
      order: 3,
      labels: {
        en: "Monthly budget",
        es: "Presupuesto mensual",
      },
      stage: "quote",
    },
    {
      key: "tobaccoUse",
      type: "boolean",
      sectionId: S_UNDERWRITING,
      order: 0,
      labels: { en: "Tobacco use", es: "Uso de tabaco" },
      hitl: { requiresAgentReview: true },
      weight: 22,
      stage: "application",
    },
    {
      key: "tobaccoLastUsed",
      type: "enum",
      sectionId: S_UNDERWRITING,
      order: 1,
      labels: {
        en: "Last tobacco use",
        es: "Último uso de tabaco",
      },
      stage: "application",
    },
    {
      key: "heightFeet",
      type: "number",
      sectionId: S_UNDERWRITING,
      order: 2,
      labels: { en: "Height (feet)", es: "Estatura (pies)" },
      stage: "application",
    },
    {
      key: "heightInches",
      type: "number",
      sectionId: S_UNDERWRITING,
      order: 3,
      labels: { en: "Height (inches)", es: "Estatura (pulgadas)" },
      stage: "application",
    },
    {
      key: "weightLbs",
      type: "number",
      sectionId: S_UNDERWRITING,
      order: 4,
      labels: { en: "Weight (lbs)", es: "Peso (lb)" },
      stage: "application",
    },
    {
      key: "existingCoverage",
      type: "boolean",
      sectionId: S_UNDERWRITING,
      order: 5,
      labels: {
        en: "Existing coverage",
        es: "Cobertura existente",
      },
      stage: "application",
    },
    {
      key: "existingCoverageAmount",
      type: "currency",
      sectionId: S_UNDERWRITING,
      order: 6,
      labels: {
        en: "Existing coverage amount",
        es: "Monto de cobertura existente",
      },
      stage: "application",
    },
    {
      key: "beneficiaryName",
      type: "text",
      sectionId: S_BENEFICIARY,
      order: 0,
      labels: {
        en: "Beneficiary name",
        es: "Nombre del beneficiario",
      },
      hitl: { requiresAgentReview: true, requiresApplicantSignature: false },
      stage: "application",
    },
    {
      key: "beneficiaryRelation",
      type: "text",
      sectionId: S_BENEFICIARY,
      order: 1,
      labels: {
        en: "Relation to insured",
        es: "Relación con el asegurado",
      },
      hitl: { requiresFinalSignOff: true },
      stage: "application",
    },
  ],
  requiredFieldKeys: [
    "firstName",
    "lastName",
    "phone",
    "preferredContactMethod",
    "dateOfBirth",
    "state",
    "coverageAmountDesired",
    "productTypeInterest",
  ],
  outputMappings: [
    {
      fieldKey: "firstName",
      destinationKey: "contact.first_name",
      destinationKind: "crm",
    },
    {
      fieldKey: "lastName",
      destinationKey: "contact.last_name",
      destinationKind: "crm",
    },
    {
      fieldKey: "phone",
      destinationKey: "contact.phone",
      destinationKind: "crm",
    },
    {
      fieldKey: "email",
      destinationKey: "contact.email",
      destinationKind: "crm",
    },
    {
      fieldKey: "coverageAmountDesired",
      destinationKey: "opportunity.monetary_value",
      destinationKind: "crm",
    },
    {
      fieldKey: "firstName",
      destinationKey: "pdf.applicant.firstName",
      destinationKind: "pdf",
    },
    {
      fieldKey: "lastName",
      destinationKey: "pdf.applicant.lastName",
      destinationKind: "pdf",
    },
    {
      fieldKey: "dateOfBirth",
      destinationKey: "rest.payload.applicant.dob",
      destinationKind: "rest",
    },
  ],
};
