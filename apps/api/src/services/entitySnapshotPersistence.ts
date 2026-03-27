import { prisma } from "../db/prisma";
import { buildEntityPayload, mergeDbEntityWithCache } from "./entityPayload";
import { computeCompletenessScore } from "./scoring";
import { getEntityCache, type EntityState } from "./stageManager";

const DEBOUNCE_MS = 2500;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Debounced mid-call upsert of LifeInsuranceEntity from the in-memory cache.
 * Reduces data loss if the Twilio status callback is delayed or fails.
 */
export function scheduleDebouncedEntitySnapshot(callSid: string): void {
  const prev = timers.get(callSid);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    timers.delete(callSid);
    void flushEntitySnapshot(callSid);
  }, DEBOUNCE_MS);
  timers.set(callSid, t);
}

async function flushEntitySnapshot(callSid: string): Promise<void> {
  try {
    const call = await prisma.call.findUnique({
      where: { callSid },
      select: { id: true, status: true },
    });
    if (!call || call.status !== "ACTIVE") return;

    const existing = await prisma.lifeInsuranceEntity.findUnique({
      where: { callId: call.id },
    });
    const cached = getEntityCache(callSid);
    const merged = mergeDbEntityWithCache(existing, cached);
    const payload = buildEntityPayload(merged);
    await prisma.lifeInsuranceEntity.upsert({
      where: { callId: call.id },
      create: { callId: call.id, ...payload },
      update: payload,
    });
    const { overall } = computeCompletenessScore(merged as EntityState);
    await prisma.call.update({
      where: { id: call.id },
      data: { completenessScore: overall },
    });
  } catch (err) {
    console.error(`[entitySnapshot] ${callSid}:`, err);
  }
}
