import Anthropic from "@anthropic-ai/sdk";
import { listMissingApplicableFieldKeys, USCIS_N400_VERTICAL_CONFIG } from "@easy-intake/shared";

export const USCIS_N400_GUIDANCE_SYSTEM = `You are an internal assistant for an immigration intake agent completing USCIS N-400 information.
Output is shown only to the agent — never address the applicant directly.

Suggest the single best next question to collect missing N-400 fields.
Keep guidance to 1–2 sentences, in English, addressed to the agent (e.g. "Ask whether…", "Confirm…").
Do not provide legal advice or guarantee case outcomes.`;

export const uscisN400GuidanceTool: Anthropic.Tool = {
  name: "generate_uscis_n400_guidance",
  description: "Next-step guidance for N-400 field collection.",
  input_schema: {
    type: "object" as const,
    properties: {
      missingFields: {
        type: "array",
        items: { type: "string" },
        description: "Logical field keys still null in the current applicable set",
      },
      guidanceText: {
        type: "string",
        description: "Suggestion for the agent",
      },
      priorityField: {
        type: ["string", "null"],
        description: "Highest-priority missing key, if any",
      },
    },
    required: ["missingFields", "guidanceText"],
  },
};

export function buildN400GuidanceUserMessage(
  collectedFields: Record<string, unknown>
): string {
  const collected = Object.entries(collectedFields)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");

  const missing = listMissingApplicableFieldKeys(USCIS_N400_VERTICAL_CONFIG, collectedFields);

  return `Collected so far:
${collected || "(none)"}

Missing applicable fields:
${missing.length ? missing.map((k: string) => `- ${k}`).join("\n") : "(none — may advance or confirm)"}`;
}
