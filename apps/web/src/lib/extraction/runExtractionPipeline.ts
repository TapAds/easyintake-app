/**
 * Pluggable extraction pipeline.
 * Vertical-agnostic: extractFn and persistFn are injected.
 */

export interface ExtractionInput {
  segments: Array<{ speaker: string; text: string; languageCode?: string }>;
  sessionId?: string;
}

export interface ExtractionOutput {
  fields: Record<string, unknown>;
  confidence?: number;
}

export interface RunExtractionPipelineOptions {
  extractFn: (input: ExtractionInput) => Promise<ExtractionOutput>;
  persistFn?: (output: ExtractionOutput, sessionId?: string) => Promise<void>;
}

/**
 * Runs extraction and optionally persists.
 */
export async function runExtractionPipeline(
  input: ExtractionInput,
  options: RunExtractionPipelineOptions
): Promise<ExtractionOutput> {
  const output = await options.extractFn(input);
  if (options.persistFn) {
    await options.persistFn(output, input.sessionId);
  }
  return output;
}
