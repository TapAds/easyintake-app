import type { FieldMeta } from "./fieldState";

/** Field config with name, for vertical-agnostic config. */
export interface VerticalFieldConfig extends FieldMeta {
  name: string;
}

/**
 * Vertical-agnostic config interface for intake UI.
 * Supports hierarchy: vertical → organization → productType → product.
 */
export interface VerticalConfig {
  vertical: string;
  organizationId?: string;
  productType?: string;
  productId?: string;
  fields: VerticalFieldConfig[];
  requiredFields?: string[];
}
