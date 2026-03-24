/**
 * Extraction types for V2 extraction output.
 * Aligned with API extractionTransform.
 */

export interface V2Update {
  field: string;
  value: string | number | boolean;
  confidence?: number;
}

export interface V2ExtractionResult {
  updates?: V2Update[];
}
