import Anthropic from "@anthropic-ai/sdk";
import { FIELD_CONFIG, EntityFieldName } from "../config/fieldStages";

/**
 * System prompt for agent guidance generation.
 *
 * Compliance constraints (enforced at the prompt layer):
 * - All output is addressed to the AGENT, never the applicant.
 * - No direct advice, product recommendations, or pricing to the applicant.
 * - No dollar amounts (quoting not in scope for Phase 1).
 */
export const AGENT_GUIDANCE_SYSTEM = `You are an internal AI assistant helping an insurance agent complete a life insurance intake call.
You are NOT communicating with the applicant. Your output is shown only to the agent.

Your job is to suggest the single most important next question the agent should ask, based on the current stage of the call and what information is still missing.

Rules:
- Always frame output as guidance to the agent (e.g. "Ask the applicant...", "Confirm with the applicant...", "Note for agent:").
- Never address the applicant directly.
- Never recommend a specific product or carrier.
- Never include dollar amounts or premium estimates.
- Never use the words: guarantee, guaranteed, promise, certain, cheapest, best policy.
- Stay focused on the fields relevant to the current stage — do not ask for application fields during quote collection.
- Keep the suggestion to 1-2 sentences maximum.
- If all fields for the current stage are collected, say: "All [stage] fields are collected. The agent may advance to the next stage."`;

/**
 * Tool definition for structured agent guidance output.
 */
export const agentGuidanceTool: Anthropic.Tool = {
  name: "generate_agent_guidance",
  description:
    "Generate a single next-best-question suggestion for the agent based on the current flow stage and missing fields.",
  input_schema: {
    type: "object" as const,
    properties: {
      missingFields: {
        type: "array",
        items: { type: "string" },
        description: "List of field names still null for the current stage",
      },
      guidanceText: {
        type: "string",
        description:
          "The suggestion text shown to the agent. Must be addressed to the agent, not the applicant.",
      },
      priorityField: {
        type: ["string", "null"],
        description: "The single highest-priority missing field this guidance targets",
      },
    },
    required: ["missingFields", "guidanceText"],
  },
};

/**
 * Builds the user message for agent guidance.
 * Only includes fields and labels relevant to the current stage.
 */
export function buildGuidanceUserMessage(
  collectedFields: Partial<Record<EntityFieldName, unknown>>,
  missingFields: EntityFieldName[],
  stage: "quote" | "application"
): string {
  const stageLabel = stage === "quote" ? "QUOTE_COLLECTION" : "FULL_APPLICATION";

  const collected = (Object.keys(collectedFields) as EntityFieldName[])
    .filter((k) => collectedFields[k] !== null && collectedFields[k] !== undefined)
    .map((k) => `${FIELD_CONFIG[k].label}: ${String(collectedFields[k])}`)
    .join("\n");

  const missing = missingFields
    .map((k) => `- ${FIELD_CONFIG[k].label} (${k})`)
    .join("\n");

  return `Current stage: ${stageLabel}

Collected so far:
${collected || "(none yet)"}

Missing fields for this stage:
${missing || "(none — stage complete)"}

Generate the next best question for the agent to ask.`;
}
