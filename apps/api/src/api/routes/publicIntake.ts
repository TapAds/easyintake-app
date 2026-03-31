import { Router, Request, Response } from "express";
import type { FieldChangeEventV1 } from "@easy-intake/shared";
import { computeCompletenessSnapshot, getVerticalConfigForPackageId } from "@easy-intake/shared";
import {
  resolvePortalToken,
  touchPortalAccessLastUsed,
} from "../../services/applicantPortalAccess";
import { applyApplicantMicrositeFieldUpdates } from "../../services/applicantMicrositeUpdate";
import { prisma } from "../../db/prisma";

export const publicIntakeRouter = Router();

function normalizeLog(raw: unknown): FieldChangeEventV1[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((e) => e && typeof e === "object") as FieldChangeEventV1[];
}

async function portalFromRequest(req: Request): Promise<
  | { ok: true; intakeSessionId: string; accessId: string }
  | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing or malformed Authorization header" };
  }
  const raw = authHeader.slice(7).trim();
  if (!raw) {
    return { ok: false, status: 401, error: "Missing portal token" };
  }
  const resolved = await resolvePortalToken(raw);
  if (!resolved) {
    return { ok: false, status: 403, error: "Invalid or expired portal token" };
  }
  return {
    ok: true,
    intakeSessionId: resolved.intakeSessionId,
    accessId: resolved.accessId,
  };
}

/**
 * GET /api/public/intake/session
 */
publicIntakeRouter.get("/session", async (req: Request, res: Response): Promise<void> => {
  const auth = await portalFromRequest(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  await touchPortalAccessLastUsed(auth.accessId);

  const row = await prisma.intakeSession.findUnique({
    where: { id: auth.intakeSessionId },
  });
  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const cfg = getVerticalConfigForPackageId(row.configPackageId);
  const fieldValues = (row.fieldValues as Record<string, unknown>) ?? {};
  const snapshot = computeCompletenessSnapshot(cfg, fieldValues);
  const hitlRaw = (row.hitl as Record<string, unknown>) ?? {};
  const agentRequested = hitlRaw.agentRequestedFieldKeys;
  const agentRequestedFieldKeys = Array.isArray(agentRequested)
    ? agentRequested.filter((k): k is string => typeof k === "string")
    : [];

  const hitl = {
    pendingAgentReview: Boolean(hitlRaw.pendingAgentReview),
    pendingDocumentApproval: Boolean(hitlRaw.pendingDocumentApproval),
    pendingFinalSignOff: Boolean(hitlRaw.pendingFinalSignOff),
    pendingApplicantSignature: Boolean(hitlRaw.pendingApplicantSignature),
    agentRequestedFieldKeys,
  };

  res.json({
    sessionId: row.id,
    configPackageId: row.configPackageId,
    status: row.status,
    fieldValues,
    completeness: {
      score: snapshot.score,
      missingRequiredKeys: snapshot.missingRequiredKeys ?? [],
    },
    hitl,
    fieldChangeLog: normalizeLog(row.fieldChangeLog),
    updatedAt: row.updatedAt.toISOString(),
  });
});

/**
 * PATCH /api/public/intake/session
 * Body: { updates: Record<string, unknown> } — plain values per field key.
 */
publicIntakeRouter.patch("/session", async (req: Request, res: Response): Promise<void> => {
  const auth = await portalFromRequest(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const body = req.body as { updates?: unknown };
  if (
    !body ||
    typeof body !== "object" ||
    !body.updates ||
    typeof body.updates !== "object" ||
    Array.isArray(body.updates)
  ) {
    res.status(400).json({ error: "Expected body { updates: { fieldKey: value, ... } }" });
    return;
  }

  const updates = body.updates as Record<string, unknown>;

  try {
    const result = await applyApplicantMicrositeFieldUpdates({
      intakeSessionId: auth.intakeSessionId,
      updates,
    });
    await touchPortalAccessLastUsed(auth.accessId);

    const row = await prisma.intakeSession.findUnique({
      where: { id: auth.intakeSessionId },
    });
    const cfg = row ? getVerticalConfigForPackageId(row.configPackageId) : null;
    const fv = (row?.fieldValues as Record<string, unknown>) ?? result.fieldValues;
    const snapshot = computeCompletenessSnapshot(cfg, fv);
    const hitlRaw = (row?.hitl as Record<string, unknown>) ?? {};
    const agentRequested = hitlRaw.agentRequestedFieldKeys;
    const agentRequestedFieldKeys = Array.isArray(agentRequested)
      ? agentRequested.filter((k): k is string => typeof k === "string")
      : [];

    res.json({
      sessionId: auth.intakeSessionId,
      fieldValues: fv,
      completeness: {
        score: result.completenessScore,
        missingRequiredKeys: snapshot.missingRequiredKeys ?? [],
      },
      hitl: {
        pendingAgentReview: Boolean(hitlRaw.pendingAgentReview),
        pendingDocumentApproval: Boolean(hitlRaw.pendingDocumentApproval),
        pendingFinalSignOff: Boolean(hitlRaw.pendingFinalSignOff),
        pendingApplicantSignature: Boolean(hitlRaw.pendingApplicantSignature),
        agentRequestedFieldKeys,
      },
      updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString(),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[public intake PATCH]", e);
    res.status(500).json({ error: "Update failed" });
  }
});
