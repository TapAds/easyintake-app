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

export type MergedCallEntityForClient = {
  entities: Record<string, unknown>;
  /** Per field key, confidence in [0, 1] from AI extraction × STT (when present). */
  fieldConfidences: Record<string, number>;
};

/**
 * Merges a LifeInsuranceEntity JSON (from GET /api/calls/:callSid) into the flat
 * map the Live Demo uses (typed columns override extractedByAI keys).
 */
export function mergeCallEntityForClient(
  entity: Record<string, unknown> | null | undefined
): MergedCallEntityForClient {
  if (!entity) return { entities: {}, fieldConfidences: {} };
  const out: Record<string, unknown> = {};
  const fieldConfidences: Record<string, number> = {};
  const ai = entity.extractedByAI;
  if (ai && typeof ai === "object" && !Array.isArray(ai)) {
    const blob = ai as Record<string, unknown>;
    const rawFc = blob.fieldConfidences;
    if (rawFc && typeof rawFc === "object" && !Array.isArray(rawFc)) {
      for (const [k, v] of Object.entries(rawFc)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          fieldConfidences[k] = Math.min(1, Math.max(0, v));
        }
      }
    }
    const restAi = { ...blob };
    delete restAi.fieldConfidences;
    Object.assign(out, restAi);
  }
  for (const [k, v] of Object.entries(entity)) {
    if (ENTITY_ROW_SKIP.has(k) || v === null || v === undefined) continue;
    out[k] = v;
  }
  delete out.fieldConfidences;
  return { entities: out, fieldConfidences };
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
