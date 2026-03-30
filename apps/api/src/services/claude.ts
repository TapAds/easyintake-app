import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import {
  EXTRACTION_SYSTEM_PROMPT_V2,
  EXTRACTION_USER_PROMPT_V2,
} from "../domain/insurance/shared/extraction_v2";
import {
  AGENT_GUIDANCE_SYSTEM,
  agentGuidanceTool,
  buildGuidanceUserMessage,
} from "../prompts/agentGuidance";
import { EntityFieldName } from "../config/fieldStages";
import { runCompliance, ComplianceContext, ComplianceViolation } from "./compliance";
import {
  transformV2ToExtractedEntities,
  V2ExtractionResult,
} from "./extractionTransform";
import { extractionScopeHint } from "./extractionScope";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export type ExtractEntitiesUtterance = {
  speaker: string;
  text: string;
  languageCode: string;
};

export type ExtractEntitiesOptions = {
  /** V2-keyed lock map for agent-verified fields */
  currentState?: Record<string, { value: string; source: string }>;
  /** Overrides last-agent-turn inference */
  agentContext?: string;
  selectedProduct?: string | null;
  /** Overrides `stage` for scope hint when they differ */
  scope?: "quote" | "application" | "all";
};

function roleLabelFromSpeaker(speaker: string): string {
  const s = speaker.toLowerCase();
  if (s.includes("agent")) return "AGENT";
  if (
    s.includes("caller") ||
    s.includes("customer") ||
    s.includes("client") ||
    s.includes("applicant")
  ) {
    return "APPLICANT";
  }
  if (s === "speaker_1") return "AGENT";
  if (s === "speaker_0") return "SPEAKER_0";
  return `SPEAKER(${speaker})`;
}

/**
 * Renders labeled transcript lines for the extraction user prompt.
 */
export function formatUtterancesForExtractionPrompt(
  utterances: ExtractEntitiesUtterance[]
): string {
  return utterances
    .map((u) => {
      const role = roleLabelFromSpeaker(u.speaker);
      const lang = (u.languageCode || "en").trim() || "en";
      return `${role} [${lang}]: ${u.text.trim()}`;
    })
    .join("\n");
}

/**
 * Last clear agent turn, or prior turn when the last line is a short confirmation.
 */
export function deriveAgentContextFromUtterances(
  utterances: ExtractEntitiesUtterance[]
): string | undefined {
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (roleLabelFromSpeaker(utterances[i].speaker) === "AGENT") {
      return utterances[i].text.trim();
    }
  }
  if (utterances.length >= 2) {
    const last = utterances[utterances.length - 1].text.trim();
    if (/^(yes|yeah|yep|correct|right|sí|si|exacto|correcto|ok)\b/i.test(last)) {
      return utterances[utterances.length - 2].text.trim();
    }
  }
  return undefined;
}

// Partial entity fields returned from extraction (all nullable)
export type ExtractedEntities = Partial<Record<EntityFieldName, unknown>>;

export type AgentGuidanceResult = {
  guidanceText: string;            // compliance-sanitized, safe to deliver to agent
  missingFields: EntityFieldName[];
  priorityField: EntityFieldName | null;
  complianceViolations: ComplianceViolation[]; // empty if output was clean
  rawResponse: unknown;            // pre-sanitization Claude output, stored in ComplianceLog
};

/**
 * Extracts life insurance entities from a window of transcript utterances.
 *
 * Uses extraction_v2.1 prompts: speaker-labeled transcript, optional agent context,
 * and agent-locked fields from `options.currentState`.
 */
export async function extractEntities(
  utterances: ExtractEntitiesUtterance[],
  stage: "quote" | "application" | "all" = "quote",
  options: ExtractEntitiesOptions = {}
): Promise<ExtractedEntities> {
  if (utterances.length === 0) return {};

  const formattedTranscript = formatUtterancesForExtractionPrompt(utterances);
  const scopeForHint = options.scope ?? stage;
  const scopeHint = extractionScopeHint(scopeForHint, options.selectedProduct ?? null);
  const systemPrompt = `${EXTRACTION_SYSTEM_PROMPT_V2}\n\n-------------------------\n${scopeHint}\n-------------------------\n`;
  const agentContext =
    options.agentContext ?? deriveAgentContextFromUtterances(utterances);
  const userPrompt = EXTRACTION_USER_PROMPT_V2(
    formattedTranscript,
    options.currentState ?? {},
    agentContext
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  console.log("[extraction] raw response:", JSON.stringify(response.content, null, 2));

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.warn("[claude] extractEntities: no text block in response");
    return {};
  }

  let rawJson = textBlock.text.trim();
  // Strip markdown code fence if present
  const codeFenceMatch = rawJson.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeFenceMatch) rawJson = codeFenceMatch[1].trim();

  let v2Result: V2ExtractionResult;
  try {
    v2Result = JSON.parse(rawJson) as V2ExtractionResult;
  } catch (err) {
    console.warn("[extraction] failed to parse JSON:", err);
    return {};
  }

  const parsed = transformV2ToExtractedEntities(v2Result);
  console.log("[extraction] parsed result:", JSON.stringify(parsed, null, 2));
  return parsed;
}

const DOCUMENT_EXTRACTION_USER_INSTRUCTION = `The attached file was sent by an insurance applicant via SMS, WhatsApp, or email (e.g. government ID, intake form, application PDF, declaration page, or screenshot).

Extract structured field values using the SAME rules and strict JSON OUTPUT FORMAT as for voice transcripts (only the single JSON object with an "updates" array; no markdown).

Rules:
- Only extract data clearly visible as belonging to the applicant or proposed insured.
- If the file is illegible, unrelated, or has no extractable applicant fields, return {"updates":[]}.
- Handwritten or poor-quality text: only include fields you are confident about (confidence >= 0.75 in each update).`;

export type DocumentMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

/**
 * Vision / PDF extraction for applicant documents (Phase 3). Uses beta Messages API for PDF support.
 * Maps V2 JSON → entity fields the same way as transcript extraction.
 */
export async function extractEntitiesFromDocument(
  base64Data: string,
  mediaType: DocumentMediaType
): Promise<ExtractedEntities> {
  const systemPrompt = EXTRACTION_SYSTEM_PROMPT_V2;

  const mediaBlock =
    mediaType === "application/pdf"
      ? ({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Data,
          },
        } as const);

  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: DOCUMENT_EXTRACTION_USER_INSTRUCTION }, mediaBlock],
      },
    ],
  });

  console.log("[doc-extraction] raw response:", JSON.stringify(response.content, null, 2));

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.warn("[claude] extractEntitiesFromDocument: no text block in response");
    return {};
  }

  let rawJson = textBlock.text.trim();
  const codeFenceMatch = rawJson.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeFenceMatch) rawJson = codeFenceMatch[1].trim();

  let v2Result: V2ExtractionResult;
  try {
    v2Result = JSON.parse(rawJson) as V2ExtractionResult;
  } catch (err) {
    console.warn("[doc-extraction] failed to parse JSON:", err);
    return {};
  }

  const parsed = transformV2ToExtractedEntities(v2Result);
  console.log("[doc-extraction] parsed result:", JSON.stringify(parsed, null, 2));
  return parsed;
}

/**
 * Generates a next-best-question suggestion for the agent.
 *
 * @param collectedFields — entity fields already collected for this stage
 * @param missingFields   — field names still null for the current stage
 * @param stage           — current flow stage ("quote" | "application")
 *
 * The raw output is returned alongside the filtered guidance text so the
 * compliance layer can log and inspect the original before delivery.
 */
/**
 * Generates a next-best-question suggestion for the agent.
 *
 * @param collectedFields — entity fields already collected for this stage
 * @param missingFields   — field names still null for the current stage
 * @param stage           — current flow stage ("quote" | "application")
 * @param context         — if provided, compliance result is written to ComplianceLog
 *
 * All guidance text passes through the compliance layer before being returned.
 * The returned guidanceText is always safe to deliver to the agent UI.
 */
export async function generateAgentGuidance(
  collectedFields: Partial<Record<EntityFieldName, unknown>>,
  missingFields: EntityFieldName[],
  stage: "quote" | "application",
  context?: ComplianceContext
): Promise<AgentGuidanceResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: AGENT_GUIDANCE_SYSTEM,
    tools: [agentGuidanceTool],
    tool_choice: { type: "tool", name: "generate_agent_guidance" },
    messages: [
      {
        role: "user",
        content: buildGuidanceUserMessage(collectedFields, missingFields, stage),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    console.warn("[claude] generateAgentGuidance: no tool_use block in response");
    return {
      guidanceText: "Note for agent: continue collecting applicant information.",
      missingFields,
      priorityField: null,
      complianceViolations: [],
      rawResponse: response,
    };
  }

  const input = toolUse.input as {
    guidanceText: string;
    missingFields: string[];
    priorityField?: string | null;
  };

  // All guidance text must pass through compliance before reaching the agent
  const compliance = await runCompliance(input.guidanceText, context);

  return {
    guidanceText: compliance.sanitizedText,
    missingFields: (input.missingFields ?? missingFields) as EntityFieldName[],
    priorityField: (input.priorityField ?? null) as EntityFieldName | null,
    complianceViolations: compliance.violations,
    rawResponse: toolUse.input,
  };
}
