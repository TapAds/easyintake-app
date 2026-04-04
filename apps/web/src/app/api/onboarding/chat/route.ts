import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  coerceOrgPipelineConfig,
  getPipelinePreset,
  PIPELINE_PRESET_IDS,
  type OrgPipelineConfig,
} from "@easy-intake/shared";
import { auth } from "@clerk/nextjs/server";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import {
  MAX_USER_MESSAGE_CHARS,
  ONBOARDING_MAX_OUTPUT_TOKENS,
  screenOnboardingTurn,
  type OnboardingBlockReason,
} from "@/lib/onboarding/onboardingGuardrails";

const MODEL = "claude-sonnet-4-6";
const MAX_MESSAGES = 36;


const tools: Anthropic.Tool[] = [
  {
    name: "submit_pipeline_config",
    description:
      "Call when the organization has agreed on the ordered list of pipeline stages. Each stage needs a stable id (lowercase slug) and English + Spanish labels.",
    input_schema: {
      type: "object",
      properties: {
        stages: {
          type: "array",
          description: "Ordered stages from first customer touchpoint through completion.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Lowercase slug, e.g. leads, application_started",
              },
              label: {
                type: "object",
                properties: {
                  en: { type: "string" },
                  es: { type: "string" },
                },
                required: ["en", "es"],
              },
            },
            required: ["id", "label"],
          },
        },
      },
      required: ["stages"],
    },
  },
];

function presetSummary(): string {
  const lines: string[] = [];
  for (const id of PIPELINE_PRESET_IDS) {
    const p = getPipelinePreset(id);
    lines.push(
      `- ${id}: ${p.stages.map((s) => s.label.en).join(" → ")}`,
    );
  }
  return lines.join("\n");
}

const SYSTEM = `You are an onboarding assistant for Easy Intake. Help an organization admin describe their business and define an ordered pipeline of stages for leads and customers.

Scope (strict): Only discuss this organization's intake pipeline setup for Easy Intake (stages, labels EN/ES, templates). Do not answer general knowledge, coding, other products, politics, or unrelated advice — politely refuse in one short sentence and redirect to pipeline setup.

Rules:
- Be concise and professional; keep each reply short (roughly two short paragraphs max). Ask one or two questions at a time when you need clarification.
- Every stage must have English and Spanish labels (es can be a careful translation of en if the user only speaks one language).
- Stage ids must be lowercase slugs (letters, digits, underscore, hyphen), unique, in funnel order.
- When the user is satisfied with the list, call the tool submit_pipeline_config with the full ordered stages array. Do not call the tool until the list is ready.
- Reference templates only as examples — the user may customize freely.

Preset templates (examples):
${presetSummary()}`;

type ClientMessage = { role: "user" | "assistant"; content: string };

function toAnthropicMessages(messages: ClientMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const text = m.content.slice(0, MAX_USER_MESSAGE_CHARS);
    if (!text.trim()) continue;
    out.push({ role, content: text });
  }
  return out;
}

function assistantVisibleText(content: Anthropic.ContentBlock[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n\n").trim();
}

function extractPipelineFromTool(
  content: Anthropic.ContentBlock[],
): OrgPipelineConfig | null {
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    if (block.name !== "submit_pipeline_config") continue;
    const input = block.input as { stages?: unknown };
    if (!input?.stages) continue;
    return coerceOrgPipelineConfig({ version: 1, stages: input.stages });
  }
  return null;
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!(await userCanEditOrganizationProfile())) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages)) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const messages: ClientMessage[] = [];
  for (const m of rawMessages.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") continue;
    const r = m as { role?: unknown; content?: unknown };
    if (r.role !== "user" && r.role !== "assistant") continue;
    if (typeof r.content !== "string") continue;
    messages.push({ role: r.role, content: r.content });
  }

  const screen = screenOnboardingTurn(messages);
  if (!screen.ok) {
    const reason: OnboardingBlockReason = screen.reason;
    return NextResponse.json({
      blocked: true,
      blockReason: reason,
      assistantMessage: "",
      pipelineConfig: null,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "LLM_NOT_CONFIGURED" }, { status: 503 });
  }

  const anthropicMessages = toAnthropicMessages(messages);
  if (anthropicMessages.length === 0) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: ONBOARDING_MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      tools,
      messages: anthropicMessages,
    });

    const assistantText = assistantVisibleText(response.content);
    const pipelineConfig = extractPipelineFromTool(response.content);

    return NextResponse.json({
      assistantMessage: assistantText,
      pipelineConfig,
      stopReason: response.stop_reason,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "LLM error";
    console.error("[onboarding/chat]", e);
    return NextResponse.json({ error: "LLM_FAILED", message: msg }, { status: 502 });
  }
}
