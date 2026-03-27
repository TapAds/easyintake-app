const ENTITY_ROW_SKIP = new Set([
  "id",
  "callId",
  "createdAt",
  "updatedAt",
  "extractedByAI",
  "rawExtractedText",
  "agentCorrected",
  "lastCorrectedAt",
  "originalLanguages",
]);

/**
 * Merges a LifeInsuranceEntity JSON (from GET /api/calls/:callSid) into the flat
 * map the Live Demo uses (typed columns override extractedByAI keys).
 */
export function mergeCallEntityForClient(
  entity: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!entity) return {};
  const out: Record<string, unknown> = {};
  const ai = entity.extractedByAI;
  if (ai && typeof ai === "object" && !Array.isArray(ai)) {
    Object.assign(out, ai as Record<string, unknown>);
  }
  for (const [k, v] of Object.entries(entity)) {
    if (ENTITY_ROW_SKIP.has(k) || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function tierFromOverall(overall: number): string {
  if (overall >= 0.7) return "qualified";
  if (overall >= 0.4) return "partial";
  return "incomplete";
}

export function transcriptSegmentsToText(
  segments: { speaker: string; text: string }[]
): string {
  if (segments.length === 0) return "";
  return segments.map((s) => `[${s.speaker}] ${s.text}`).join("\n") + "\n";
}
