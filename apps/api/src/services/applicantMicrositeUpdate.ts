import {
  computeCompletenessSnapshot,
  getVerticalConfigForPackageId,
  wrapFieldCell,
} from "@easy-intake/shared";
import { prisma } from "../db/prisma";
import { appendIntakeSessionFieldChangeLog } from "./fieldChangeLog";

function getCellValue(cell: unknown): unknown {
  if (cell && typeof cell === "object" && "value" in cell) {
    return (cell as { value: unknown }).value;
  }
  return undefined;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Merges applicant plain-field updates from the microsite, appends audit log, updates completeness.
 */
export async function applyApplicantMicrositeFieldUpdates(params: {
  intakeSessionId: string;
  updates: Record<string, unknown>;
}): Promise<{
  fieldValues: Record<string, unknown>;
  completenessScore: number;
  missingRequiredKeys: string[];
}> {
  const { intakeSessionId, updates } = params;
  const session = await prisma.intakeSession.findUnique({
    where: { id: intakeSessionId },
  });
  if (!session) {
    throw new Error("Session not found");
  }

  const cfg = getVerticalConfigForPackageId(session.configPackageId);
  const allowedKeys = new Set((cfg?.fields ?? []).map((f) => f.key));

  const badKeys = Object.keys(updates).filter((k) => !allowedKeys.has(k));
  if (badKeys.length > 0) {
    const err = new Error(`Unknown or disallowed field keys: ${badKeys.join(", ")}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  let fv = { ...((session.fieldValues as Record<string, unknown>) ?? {}) };

  for (const [key, newPlain] of Object.entries(updates)) {
    if (newPlain === undefined) continue;

    const prevCell = fv[key];
    const oldValue = getCellValue(prevCell);

    if (valuesEqual(oldValue, newPlain)) continue;

    fv[key] = wrapFieldCell(newPlain, "applicant", "microsite");

    await appendIntakeSessionFieldChangeLog(intakeSessionId, {
      fieldKey: key,
      oldValue,
      newValue: newPlain,
      reason: "applicant_self_service",
      actor: { type: "applicant_channel", channel: "microsite" },
    });
  }

  const snapshot = computeCompletenessSnapshot(cfg, fv);
  const score = snapshot.score;
  const missingRequiredKeys = snapshot.missingRequiredKeys ?? [];

  let channels = session.channels;
  if (Array.isArray(channels)) {
    const ch = channels as { channel?: string }[];
    if (!ch.some((c) => c.channel === "microsite")) {
      channels = [
        ...ch,
        {
          channel: "microsite",
          startedAt: new Date().toISOString(),
        },
      ] as typeof session.channels;
    }
  } else {
    channels = [
      {
        channel: "microsite",
        startedAt: new Date().toISOString(),
      },
    ] as typeof session.channels;
  }

  await prisma.intakeSession.update({
    where: { id: intakeSessionId },
    data: {
      fieldValues: fv as object,
      completenessScore: score,
      channels: channels as object,
    },
  });

  return {
    fieldValues: fv,
    completenessScore: score,
    missingRequiredKeys,
  };
}
