/**
 * Pre-LLM guardrails for the onboarding chat BFF. When {@link screenOnboardingTurn}
 * returns `blocked`, the route handler must not call Anthropic.
 */

/** Hard cap on a single user message (characters). */
export const MAX_USER_MESSAGE_CHARS = 2_000;

/** Max tokens for each assistant reply (keeps answers short; tool calls still fit). */
export const ONBOARDING_MAX_OUTPUT_TOKENS = 900;

/** Prevent huge transcripts from burning context. */
export const MAX_TOTAL_USER_CHARS_PER_REQUEST = 24_000;

const JAILBREAK_OR_INJECTION = [
  /\bignore (all )?(previous|prior|above) (instructions?|rules?|prompts?)\b/i,
  /\bdisregard (the )?(system|above|prior)\b/i,
  /\byou are now (a|an|the)\b/i,
  /\bsystem prompt\b/i,
  /\bjailbreak\b/i,
  /\bDAN\b.*\bmode\b/i,
  /\breveal (your|the) (api|secret|key|password|token)\b/i,
  /\bprompt injection\b/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
];

/** Clear non–onboarding requests — block before any LLM call. */
const OFF_TOPIC_STRONG = [
  /\bwrite (me )?(a )?(full )?(essay|story|poem|novel)\b/i,
  /\bdebug (my|this) (code|script|program)\b/i,
  /\bpython (code|script)\b/i,
  /\bwhat (is|are) the (capital|weather|stock price)\b/i,
  /\b(recipe|cryptocurrency|bitcoin|ethereum)\b/i,
  /\b(how to hack|bypass security|sql injection)\b/i,
];

/**
 * Onboarding-relevant themes (EN/ES): pipeline, stages, org intake, templates, labels.
 * Short small-talk / confirmations are allowed separately.
 */
const ONBOARDING_SIGNAL =
  /\b(pipeline|stage|stages|funnel|lead|leads|intake|onboarding|template|templates|organization|organisation|org\b|customer|customers|applicant|signature|submitted|complete|crm\b|vertical|label|labels|translate|translation|english|spanish|espa[nñ]ol|prospect|prospectos|etapa|etapas|solicitud|aplicaci[oó]n|negocio|proceso|embudo|seguro|insurance|carrier|form|forms|rename|reorder|add|remove|delete|step|steps|milestone|milestones|chip|chips|filter|status)\b/i;

const SMALL_TALK_OK =
  /^(ok|okay|yes|no|yeah|yep|nope|thanks?|thank you|gracias|por favor|please|hola|hello|hi\b|hey|s[ií]|claro|vale|next|continue|go ahead|sure|listo)\s*[!.?…]*$/i;

export type OnboardingBlockReason =
  | "MESSAGE_TOO_LONG"
  | "TOPIC_NOT_ALLOWED"
  | "JAILBREAK_OR_POLICY"
  | "TRANSCRIPT_TOO_LARGE";

export type OnboardingScreenResult =
  | { ok: true }
  | { ok: false; reason: OnboardingBlockReason };

function lastUserMessage(messages: { role: string; content: string }[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return null;
}

function totalUserChars(messages: { role: string; content: string }[]): number {
  let n = 0;
  for (const m of messages) {
    if (m.role === "user") n += m.content.length;
  }
  return n;
}

/**
 * Hook: run on each POST **before** calling Anthropic. If not `ok`, do not call the API.
 */
export function screenOnboardingTurn(messages: { role: string; content: string }[]): OnboardingScreenResult {
  const last = lastUserMessage(messages);
  if (!last || !last.trim()) {
    return { ok: false, reason: "MESSAGE_TOO_LONG" };
  }
  if (last.length > MAX_USER_MESSAGE_CHARS) {
    return { ok: false, reason: "MESSAGE_TOO_LONG" };
  }

  if (totalUserChars(messages) > MAX_TOTAL_USER_CHARS_PER_REQUEST) {
    return { ok: false, reason: "TRANSCRIPT_TOO_LARGE" };
  }

  const t = last.trim();
  for (const re of JAILBREAK_OR_INJECTION) {
    if (re.test(t)) return { ok: false, reason: "JAILBREAK_OR_POLICY" };
  }
  for (const re of OFF_TOPIC_STRONG) {
    if (re.test(t)) return { ok: false, reason: "TOPIC_NOT_ALLOWED" };
  }

  if (t.length <= 120 && SMALL_TALK_OK.test(t)) {
    return { ok: true };
  }

  if (ONBOARDING_SIGNAL.test(t)) {
    return { ok: true };
  }

  /** Slightly longer messages must contain at least one onboarding signal. */
  if (t.length <= 160) {
    return { ok: true };
  }

  return { ok: false, reason: "TOPIC_NOT_ALLOWED" };
}
