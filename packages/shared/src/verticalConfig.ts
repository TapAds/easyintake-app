import type { FieldKey } from "./fieldState";

/** Supported UI locales for labels (extend as product adds languages). */
export type LocaleCode = "en" | "es";

/** User-facing copy in English and Spanish. */
export interface LocalizedString {
  en: string;
  es: string;
}

/** Human-in-the-loop gates at section level. */
export interface SectionHitlFlags {
  /** Agent must review extracted/captured data in this section before proceed. */
  requiresAgentReview?: boolean;
  /** Uploaded documents tied to this section need agent approval. */
  requiresDocumentApproval?: boolean;
  /** Final agent sign-off required before submission. */
  requiresFinalSignOff?: boolean;
}

/** HITL at field granularity (overrides or augments section defaults). */
export interface FieldHitlFlags {
  requiresAgentReview?: boolean;
  requiresDocumentApproval?: boolean;
  requiresFinalSignOff?: boolean;
  /** E-sign or applicant attestation step. */
  requiresApplicantSignature?: boolean;
}

/** Logical field types for rendering and validation. */
export type VerticalFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "phone"
  | "email"
  | "address"
  | "file"
  | "currency";

/**
 * Declarative validation (evaluated authoritatively in apps/api; web may mirror for UX).
 */
export interface ValidationRule {
  kind:
    | "required"
    | "min"
    | "max"
    | "pattern"
    | "minLength"
    | "maxLength"
    | "enum";
  /** Rule parameter (min length, regex string, allowed enum values, etc.). */
  value?: unknown;
  /** Optional next-intl message key for errors. */
  messageKey?: string;
}

/** Ordered grouping for multi-step forms and agent guidance. */
export interface VerticalSection {
  id: string;
  order: number;
  labels: LocalizedString;
  description?: LocalizedString;
  hitl?: SectionHitlFlags;
}

/** Single field in a vertical catalog. */
export interface VerticalFieldDefinition {
  key: FieldKey;
  type: VerticalFieldType;
  sectionId: string;
  /** Order within the section. */
  order: number;
  labels: LocalizedString;
  description?: LocalizedString;
  placeholder?: LocalizedString;
  validation?: ValidationRule[];
  hitl?: FieldHitlFlags;
  /** Lower = higher priority for guidance / extraction (optional). */
  weight?: number;
  /** Flow hint (e.g. quote vs application) — vertical-defined strings. */
  stage?: string;
}

/** Stub for mapping logical keys to CRM, PDF, REST, or DB columns. */
export interface OutputMappingStub {
  fieldKey: FieldKey;
  /** Destination identifier (GHL custom field id, Anvil field id, JSON path, etc.). */
  destinationKey: string;
  destinationKind?: "crm" | "pdf" | "rest" | "database";
}

/**
 * Vertical-agnostic intake catalog.
 * Hierarchy: vertical → optional org → optional product overrides (merge at load time).
 */
export interface VerticalConfig {
  /** Stable id for this config document. */
  id: string;
  /** Config version or semver string. */
  version: string;
  vertical: string;
  /** Package id for session binding (e.g. insurance, uscis-i90). */
  configPackageId: string;
  organizationId?: string;
  productType?: string;
  productId?: string;
  sections: VerticalSection[];
  fields: VerticalFieldDefinition[];
  /** Subset of field keys required for “complete enough” intake. */
  requiredFieldKeys?: FieldKey[];
  outputMappings?: OutputMappingStub[];
}
