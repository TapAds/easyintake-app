import type { LifeInsuranceEntity } from "@prisma/client";
import { prisma } from "../db/prisma";
import { EntityFieldName } from "../config/fieldStages";
import {
  buildEntityPayload,
  entityRowToFlatState,
} from "./entityPayload";
import { extractEntities, type ExtractedEntities } from "./claude";
import { computeCompletenessScore } from "./scoring";
import type { EntityState } from "./stageManager";

/** Max characters of joined utterance text per Claude extraction call (input budget). */
const CHUNK_CHAR_TARGET = 45_000;

function isFieldEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/**
 * Merges a batch extraction into the flat entity state.
 * When agentCorrected, only fills fields that are currently empty.
 */
export function mergeExtractIntoFlatState(
  base: EntityState,
  extracted: ExtractedEntities,
  agentCorrected: boolean
): {
  merged: EntityState;
  appliedKeys: string[];
  skippedDueToCorrection: string[];
} {
  const merged: EntityState = { ...base };
  const appliedKeys: string[] = [];
  const skippedDueToCorrection: string[] = [];

  for (const [key, value] of Object.entries(extracted)) {
    if (value === null || value === undefined) continue;
    const k = key as EntityFieldName;
    if (agentCorrected && !isFieldEmpty(merged[k])) {
      skippedDueToCorrection.push(key);
      continue;
    }
    (merged as Record<string, unknown>)[key] = value;
    appliedKeys.push(key);
  }

  return { merged, appliedKeys, skippedDueToCorrection };
}

function utterancesToExtractInput(
  segments: { speaker: string; text: string; languageCode: string }[]
): { speaker: string; text: string; languageCode: string }[] {
  return segments.map((s) => ({
    speaker: s.speaker,
    text: s.text.trim(),
    languageCode: s.languageCode || "es",
  }));
}

/**
 * Splits utterances into chunks where joined text length stays under target.
 */
export function chunkUtterancesForExtraction(
  utterances: { speaker: string; text: string; languageCode: string }[]
): { speaker: string; text: string; languageCode: string }[][] {
  if (utterances.length === 0) return [];
  const chunks: { speaker: string; text: string; languageCode: string }[][] =
    [];
  let current: { speaker: string; text: string; languageCode: string }[] = [];
  let size = 0;

  for (const u of utterances) {
    const line = u.text;
    const delta = line.length + 1;
    if (current.length > 0 && size + delta > CHUNK_CHAR_TARGET) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(u);
    size += delta;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function mergeChunkExtractions(
  a: ExtractedEntities,
  b: ExtractedEntities
): ExtractedEntities {
  return { ...a, ...b };
}

async function loadAllTranscriptUtterances(callId: string): Promise<
  { speaker: string; text: string; languageCode: string }[]
> {
  const utterances: { speaker: string; text: string; languageCode: string }[] =
    [];
  const pageSize = 500;
  let cursor: number | undefined;

  for (;;) {
    const segments = await prisma.transcriptSegment.findMany({
      where: {
        callId,
        ...(cursor !== undefined ? { offsetMs: { gt: cursor } } : {}),
      },
      orderBy: { offsetMs: "asc" },
      take: pageSize,
      select: {
        speaker: true,
        text: true,
        languageCode: true,
        offsetMs: true,
      },
    });

    if (segments.length === 0) break;

    for (const s of segments) {
      const t = s.text?.trim() ?? "";
      if (!t) continue;
      utterances.push({
        speaker: s.speaker,
        text: t,
        languageCode: s.languageCode?.trim() || "es",
      });
    }

    if (segments.length < pageSize) break;
    cursor = segments[segments.length - 1].offsetMs;
  }

  return utterances;
}

export type TranscriptExtractResult = {
  callSid: string;
  utteranceCount: number;
  chunkCount: number;
  entities: EntityState;
  completenessScore: number;
  tier: string;
  appliedKeys: string[];
  skippedDueToCorrection: string[];
};

/**
 * Loads full transcript, runs V2 extraction (chunked), merges with DB entity,
 * persists, returns flat entity for clients.
 */
export async function runTranscriptExtractAndPersist(
  callSid: string
): Promise<TranscriptExtractResult | { error: string; status: number }> {
  const call = await prisma.call.findUnique({
    where: { callSid },
    select: {
      id: true,
      entity: true,
    },
  });

  if (!call) {
    return { error: "Call not found", status: 404 };
  }

  const utterances = utterancesToExtractInput(
    await loadAllTranscriptUtterances(call.id)
  );

  if (utterances.length === 0) {
    return { error: "No transcript segments for this call", status: 400 };
  }

  const chunks = chunkUtterancesForExtraction(utterances);
  let extracted: ExtractedEntities = {};

  for (const chunk of chunks) {
    const part = await extractEntities(chunk, "all", { scope: "all" });
    extracted = mergeChunkExtractions(extracted, part);
  }

  const existingRow: LifeInsuranceEntity | null = call.entity;
  const agentCorrected = existingRow?.agentCorrected ?? false;
  const base: EntityState = existingRow
    ? entityRowToFlatState(existingRow)
    : {};

  const { merged, appliedKeys, skippedDueToCorrection } =
    mergeExtractIntoFlatState(base, extracted, agentCorrected);

  if (
    merged.existingCoverageAmount != null &&
    (merged.existingCoverage === undefined || merged.existingCoverage === null)
  ) {
    merged.existingCoverage = true;
  }

  const payload = buildEntityPayload(merged);
  await prisma.lifeInsuranceEntity.upsert({
    where: { callId: call.id },
    create: { callId: call.id, ...payload },
    update: payload,
  });

  const { overall, tier } = computeCompletenessScore(merged);
  await prisma.call.update({
    where: { id: call.id },
    data: { completenessScore: overall },
  });

  const row = await prisma.lifeInsuranceEntity.findUnique({
    where: { callId: call.id },
  });

  const entities: EntityState = row ? entityRowToFlatState(row) : merged;

  return {
    callSid,
    utteranceCount: utterances.length,
    chunkCount: chunks.length,
    entities,
    completenessScore: overall,
    tier,
    appliedKeys,
    skippedDueToCorrection,
  };
}
