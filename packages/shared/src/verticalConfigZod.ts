import { z } from "zod";
import type { VerticalConfig } from "./verticalConfig";

const localizedStringSchema = z.object({
  en: z.string(),
  es: z.string(),
});

const visibilityConditionSchema = z.object({
  fieldKey: z.string(),
  equals: z.unknown(),
});

const fieldVisibilityRuleSchema = z.object({
  allOf: z.array(visibilityConditionSchema).optional(),
});

const validationRuleSchema = z.object({
  kind: z.string(),
  value: z.unknown().optional(),
  messageKey: z.string().optional(),
});

const fieldOutputMappingSchema = z.object({
  destinationKey: z.string(),
  destinationKind: z.enum(["crm", "pdf", "rest", "database"]).optional(),
});

const verticalFieldSchema = z.object({
  key: z.string(),
  type: z.enum([
    "text",
    "number",
    "date",
    "boolean",
    "enum",
    "phone",
    "email",
    "address",
    "file",
    "currency",
  ]),
  sectionId: z.string(),
  order: z.number(),
  labels: localizedStringSchema,
  description: localizedStringSchema.optional(),
  placeholder: localizedStringSchema.optional(),
  validation: z.array(validationRuleSchema).optional(),
  hitl: z
    .object({
      requiresAgentReview: z.boolean().optional(),
      requiresDocumentApproval: z.boolean().optional(),
      requiresFinalSignOff: z.boolean().optional(),
      requiresApplicantSignature: z.boolean().optional(),
    })
    .optional(),
  weight: z.number().optional(),
  stage: z.string().optional(),
  visibility: fieldVisibilityRuleSchema.optional(),
  sourceRef: z.string().optional(),
  outputMappings: z.array(fieldOutputMappingSchema).optional(),
});

const sectionSchema = z.object({
  id: z.string(),
  order: z.number(),
  labels: localizedStringSchema,
  description: localizedStringSchema.optional(),
  hitl: z
    .object({
      requiresAgentReview: z.boolean().optional(),
      requiresDocumentApproval: z.boolean().optional(),
      requiresFinalSignOff: z.boolean().optional(),
    })
    .optional(),
});

const outputMappingStubSchema = z.object({
  fieldKey: z.string(),
  destinationKey: z.string(),
  destinationKind: z.enum(["crm", "pdf", "rest", "database"]).optional(),
});

export const verticalConfigSchema: z.ZodType<VerticalConfig> = z.object({
  id: z.string(),
  version: z.string(),
  vertical: z.string(),
  configPackageId: z.string(),
  organizationId: z.string().optional(),
  productType: z.string().optional(),
  productId: z.string().optional(),
  sections: z.array(sectionSchema),
  fields: z.array(verticalFieldSchema),
  requiredFieldKeys: z.array(z.string()).optional(),
  outputMappings: z.array(outputMappingStubSchema).optional(),
}) as z.ZodType<VerticalConfig>;

/** Runtime check (e.g. tests, CI). Throws ZodError on failure. */
export function parseVerticalConfig(data: unknown): VerticalConfig {
  return verticalConfigSchema.parse(data);
}
