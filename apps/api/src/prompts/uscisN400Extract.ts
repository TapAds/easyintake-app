import Anthropic from "@anthropic-ai/sdk";
import {
  USCIS_N400_VERTICAL_CONFIG,
  type VerticalFieldDefinition,
} from "@easy-intake/shared";

function propertyForField(f: VerticalFieldDefinition): object {
  const desc = `${f.labels.en} / ${f.labels.es}`;
  switch (f.type) {
    case "boolean":
      return {
        type: ["boolean", "null"] as const,
        description: desc,
      };
    case "number":
    case "currency":
      return {
        type: ["number", "null"] as const,
        description: desc,
      };
    case "date":
      return {
        type: ["string", "null"] as const,
        description: `${desc} — ISO date YYYY-MM-DD only`,
      };
    default:
      return {
        type: ["string", "null"] as const,
        description: desc,
      };
  }
}

export const USCIS_N400_EXTRACTION_SYSTEM = `You are an internal extraction tool for USCIS Form N-400 (naturalization) intake.
You read labeled transcripts between an agent and an applicant (English and/or Spanish).

Rules:
- Only extract information explicitly stated. Use null for anything not clearly mentioned.
- Do not infer, guess, or complete optional sections the applicant did not discuss.
- For yes/no questions: true only if the applicant clearly affirmed; false only if they clearly denied; otherwise null.
- Dates must be YYYY-MM-DD when a full date was stated; otherwise null.
- States: prefer 2-letter US codes when the state was identified.
- You never speak to the applicant — internal use only.`;

export function buildN400ExtractionTool(): Anthropic.Tool {
  const properties: Record<string, object> = {};
  for (const f of USCIS_N400_VERTICAL_CONFIG.fields) {
    properties[f.key] = propertyForField(f);
  }
  return {
    name: "extract_uscis_n400_entities",
    description:
      "Extract N-400 catalog fields mentioned in the transcript. Use null for absent information.",
    input_schema: {
      type: "object" as const,
      properties,
      required: [],
    },
  };
}

export function buildN400ExtractionUserMessage(
  formattedTranscript: string
): string {
  return `Extract N-400 intake fields from this transcript (all properties nullable):\n\n${formattedTranscript}`;
}
