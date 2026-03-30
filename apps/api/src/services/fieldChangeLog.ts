import { randomUUID } from "crypto";
import { prisma } from "../db/prisma";
import type { FieldChangeEventV1, FieldChangeActor, FieldChangeReason } from "../types/fieldChangeLog";

function normalizeLog(raw: unknown): FieldChangeEventV1[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((e) => e && typeof e === "object") as FieldChangeEventV1[];
}

/**
 * Appends one event to Call.fieldChangeLog (JSON array).
 */
export async function appendCallFieldChangeLog(
  callId: string,
  event: Omit<FieldChangeEventV1, "id" | "at"> & { id?: string; at?: string }
): Promise<void> {
  const row = await prisma.call.findUnique({
    where: { id: callId },
    select: { fieldChangeLog: true },
  });
  const log = normalizeLog(row?.fieldChangeLog);
  const full: FieldChangeEventV1 = {
    id: event.id ?? randomUUID(),
    at: event.at ?? new Date().toISOString(),
    fieldKey: event.fieldKey,
    oldValue: event.oldValue,
    newValue: event.newValue,
    reason: event.reason,
    actor: event.actor,
    evidence: event.evidence,
  };
  log.push(full);
  await prisma.call.update({
    where: { id: callId },
    data: { fieldChangeLog: log as object },
  });
}

/**
 * Appends one event to IntakeSession.fieldChangeLog.
 */
export async function appendIntakeSessionFieldChangeLog(
  intakeSessionId: string,
  event: Omit<FieldChangeEventV1, "id" | "at"> & { id?: string; at?: string }
): Promise<void> {
  const row = await prisma.intakeSession.findUnique({
    where: { id: intakeSessionId },
    select: { fieldChangeLog: true },
  });
  const log = normalizeLog(row?.fieldChangeLog);
  const full: FieldChangeEventV1 = {
    id: event.id ?? randomUUID(),
    at: event.at ?? new Date().toISOString(),
    fieldKey: event.fieldKey,
    oldValue: event.oldValue,
    newValue: event.newValue,
    reason: event.reason,
    actor: event.actor,
    evidence: event.evidence,
  };
  log.push(full);
  await prisma.intakeSession.update({
    where: { id: intakeSessionId },
    data: { fieldChangeLog: log as object },
  });
}

export function systemActor(): FieldChangeActor {
  return { type: "system" };
}

export function agentActor(subject: string): FieldChangeActor {
  return { type: "agent", subject };
}

export type { FieldChangeActor, FieldChangeReason };
