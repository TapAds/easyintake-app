import { Router, Request, Response } from "express";
import type { FieldChangeEventV1 } from "@easy-intake/shared";
import { computeCompletenessSnapshot, getVerticalConfigForPackageId } from "@easy-intake/shared";
import { prisma } from "../../db/prisma";
import { requireAuth } from "../middleware/auth";
import { attachOperatorOrgScope } from "../middleware/operatorOrgScope";
import { config } from "../../config";
import {
  sessionOrganizationInScope,
  type OperatorOrgScope,
} from "../../services/operatorOrgScope";
import {
  createApplicantPortalAccess,
  getActivePortalAccessSummary,
} from "../../services/applicantPortalAccess";
import { deliverApplicantPortalReminder } from "../../services/followUpSend";
import { getGhlContactPrimaryPhone } from "../../services/ghl";
import { forkIntakeSessionFromCallTranscript } from "../../services/forkIntakeSessionFromCall";

export const intakeSessionsRouter = Router();
intakeSessionsRouter.use(requireAuth);
intakeSessionsRouter.use(attachOperatorOrgScope);

/** Fallback org when a Call has no primary IntakeSession (align with forkIntakeSessionFromCall). */
const DEFAULT_ORG_FOR_SCOPE =
  process.env.DEFAULT_ORGANIZATION_ID ?? "org_local_dev";

function normalizeLog(raw: unknown): FieldChangeEventV1[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((e) => e && typeof e === "object") as FieldChangeEventV1[];
}

function channelSummary(channels: unknown): string {
  if (!Array.isArray(channels)) return "—";
  return channels
    .map((c) =>
      typeof c === "object" &&
      c !== null &&
      "channel" in c &&
      typeof (c as { channel: unknown }).channel === "string"
        ? (c as { channel: string }).channel
        : "?"
    )
    .join(" · ");
}

function sessionPlainField(fv: Record<string, unknown>, key: string): string | null {
  const cell = fv[key];
  if (!cell || typeof cell !== "object" || !("value" in cell)) return null;
  const v = (cell as { value: unknown }).value;
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

function parseHitl(hitl: unknown): {
  pendingAgentReview: boolean;
  pendingDocumentApproval: boolean;
  pendingFinalSignOff: boolean;
  pendingApplicantSignature: boolean;
  agentRequestedFieldKeys: string[];
} {
  const h = (hitl as Record<string, unknown>) ?? {};
  const agentRequested = h.agentRequestedFieldKeys;
  return {
    pendingAgentReview: Boolean(h.pendingAgentReview),
    pendingDocumentApproval: Boolean(h.pendingDocumentApproval),
    pendingFinalSignOff: Boolean(h.pendingFinalSignOff),
    pendingApplicantSignature: Boolean(h.pendingApplicantSignature),
    agentRequestedFieldKeys: Array.isArray(agentRequested)
      ? agentRequested.filter((k): k is string => typeof k === "string")
      : [],
  };
}

/**
 * GET /api/intake/sessions
 */
intakeSessionsRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const scope = req.operatorScope!;
  const rows = await prisma.intakeSession.findMany({
    where:
      scope.mode === "all"
        ? undefined
        : { organizationId: { in: scope.organizationIds } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  res.json(
    rows.map((r) => {
      const hitl = r.hitl as { pendingAgentReview?: boolean } | null;
      return {
        sessionId: r.id,
        organizationId: r.organizationId,
        verticalId: r.verticalId,
        configPackageId: r.configPackageId,
        status: r.status,
        updatedAt: r.updatedAt.toISOString(),
        completenessScore: r.completenessScore,
        channelSummary: channelSummary(r.channels),
        pendingHitl: Boolean(hitl?.pendingAgentReview),
      };
    })
  );
});

/**
 * POST /api/intake/sessions/from-call-transcript
 * Body: { callSid, configPackageId } — new IntakeSession seeded from stored transcript.
 */
intakeSessionsRouter.post("/from-call-transcript", async (req: Request, res: Response): Promise<void> => {
  const scope = req.operatorScope!;
  const body = req.body as { callSid?: string; configPackageId?: string };
  const callSid = (body.callSid ?? "").trim();
  const configPackageId = (body.configPackageId ?? "").trim();
  if (!callSid || !configPackageId) {
    res.status(400).json({ error: "callSid and configPackageId required" });
    return;
  }

  const callPeek = await prisma.call.findUnique({
    where: { callSid },
    select: { intakeSession: { select: { organizationId: true } } },
  });
  const peekOrg =
    callPeek?.intakeSession?.organizationId?.trim() || DEFAULT_ORG_FOR_SCOPE;
  if (!sessionOrganizationInScope(peekOrg, scope)) {
    res.status(404).json({ error: "Call not found" });
    return;
  }

  const result = await forkIntakeSessionFromCallTranscript({
    callSid,
    configPackageId,
  });
  if ("error" in result && "status" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json({ sessionId: result.sessionId });
});

/**
 * POST /api/intake/sessions/:sessionId/applicant-portal-token
 */
intakeSessionsRouter.post(
  "/:sessionId/applicant-portal-token",
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params.sessionId);
    const scope = req.operatorScope!;
    const row = await prisma.intakeSession.findUnique({ where: { id: sessionId } });
    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (!sessionOrganizationInScope(row.organizationId, scope)) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const body = req.body as { ttlDays?: unknown; locale?: unknown };
    const ttlRaw = body.ttlDays;
    const ttlDays =
      typeof ttlRaw === "number" && Number.isFinite(ttlRaw)
        ? Math.max(1, Math.min(365, Math.floor(ttlRaw)))
        : 30;
    const locale = body.locale === "es" ? "es" : "en";

    const { rawToken, expiresAt } = await createApplicantPortalAccess(sessionId, ttlDays);
    const base = config.applicantPortalBaseUrl;
    const path = `/${locale}/apply/${encodeURIComponent(rawToken)}`;
    const applyUrl = base ? `${base}${path}` : null;

    res.json({
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      applyPath: path,
      applyUrl,
    });
  }
);

/**
 * PATCH /api/intake/sessions/:sessionId
 * Body: { hitl?: { agentRequestedFieldKeys: string[] } }
 */
intakeSessionsRouter.patch("/:sessionId", async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId);
  const scope = req.operatorScope!;
  const body = req.body as { hitl?: { agentRequestedFieldKeys?: unknown } };
  const keys = body.hitl?.agentRequestedFieldKeys;
  if (!Array.isArray(keys) || !keys.every((k) => typeof k === "string")) {
    res.status(400).json({ error: "hitl.agentRequestedFieldKeys must be string[]" });
    return;
  }

  const row = await prisma.intakeSession.findUnique({ where: { id: sessionId } });
  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (!sessionOrganizationInScope(row.organizationId, scope)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const hitl = {
    ...((row.hitl as Record<string, unknown>) ?? {}),
    agentRequestedFieldKeys: keys,
  };

  await prisma.intakeSession.update({
    where: { id: sessionId },
    data: { hitl: hitl as object },
  });

  res.json({
    ok: true,
    hitl: parseHitl(hitl),
  });
});

/**
 * POST /api/intake/sessions/:sessionId/remind-applicant
 * Sends SMS (or GHL conversation) with a fresh applicant portal link.
 */
intakeSessionsRouter.post(
  "/:sessionId/remind-applicant",
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params.sessionId);
    const scope = req.operatorScope!;
    const body = req.body as { locale?: unknown };
    const locale = body.locale === "es" ? "es" : "en";

    const row = await prisma.intakeSession.findUnique({ where: { id: sessionId } });
    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (!sessionOrganizationInScope(row.organizationId, scope)) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const base = config.applicantPortalBaseUrl;
    if (!base) {
      res.status(503).json({
        error: "APPLICANT_PORTAL_BASE_URL is not configured on the API server",
      });
      return;
    }

    const fv = (row.fieldValues as Record<string, unknown>) ?? {};
    const ext = (row.externalIds as Record<string, unknown>) ?? {};
    const ghlLocationId = typeof ext.ghlLocationId === "string" ? ext.ghlLocationId : "";
    const ghlContactId = typeof ext.ghlContactId === "string" ? ext.ghlContactId : null;

    let phone = sessionPlainField(fv, "phone");
    if (!phone && ghlLocationId && ghlContactId) {
      try {
        phone = await getGhlContactPrimaryPhone(ghlLocationId, ghlContactId);
      } catch (err) {
        console.warn("[remind-applicant] GHL phone lookup failed:", err);
      }
    }

    if (!phone) {
      res.status(400).json({
        error: "No phone number on session and GHL lookup unavailable — add phone to field values or link GHL contact",
      });
      return;
    }

    const firstName = sessionPlainField(fv, "firstName") ?? "";
    const stickyRaw = ext.lastInboundChannel;
    const stickyChannel =
      stickyRaw === "sms" ||
      stickyRaw === "email" ||
      stickyRaw === "whatsapp" ||
      stickyRaw === "live_chat" ||
      stickyRaw === "other"
        ? stickyRaw
        : null;
    const applicantEmail = sessionPlainField(fv, "email");

    const { rawToken } = await createApplicantPortalAccess(sessionId, 30);
    const portalUrl = `${base}/${locale}/apply/${encodeURIComponent(rawToken)}`;

    try {
      const delivered = await deliverApplicantPortalReminder({
        ghlLocationId: ghlLocationId || "",
        phone,
        ghlContactId,
        firstName,
        portalUrl,
        stickyChannel,
        applicantEmail,
      });
      res.json({
        ok: true,
        provider: delivered.provider,
        externalMessageId: delivered.externalMessageId,
        portalUrl,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      console.error("[remind-applicant]", e);
      res.status(502).json({ error: msg });
    }
  }
);


async function relatedApplicationsForSession(
  sessionId: string,
  sourceCallId: string | null,
  externalIds: Record<string, unknown>,
  scope: OperatorOrgScope
): Promise<
  {
    sessionId: string;
    configPackageId: string;
    createdAt: string;
    updatedAt: string;
    completenessScore: number;
    isDerived: boolean;
  }[]
> {
  let call:
    | { id: string; intakeSessionId: string | null; callSid: string }
    | null = null;

  if (sourceCallId) {
    call = await prisma.call.findUnique({
      where: { id: sourceCallId },
      select: { id: true, intakeSessionId: true, callSid: true },
    });
  } else {
    const sid =
      typeof externalIds.callSid === "string" ? externalIds.callSid.trim() : "";
    if (sid) {
      call = await prisma.call.findUnique({
        where: { callSid: sid },
        select: { id: true, intakeSessionId: true, callSid: true },
      });
    }
    if (!call) {
      call = await prisma.call.findFirst({
        where: { intakeSessionId: sessionId },
        select: { id: true, intakeSessionId: true, callSid: true },
      });
    }
  }

  if (!call) return [];

  const orClause: { id: string }[] = [];
  if (call.intakeSessionId) {
    orClause.push({ id: call.intakeSessionId });
  }
  const rows = await prisma.intakeSession.findMany({
    where: {
      OR: [{ sourceCallId: call.id }, ...orClause],
    },
    select: {
      id: true,
      organizationId: true,
      configPackageId: true,
      createdAt: true,
      updatedAt: true,
      completenessScore: true,
      sourceCallId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Set<string>();
  const out: {
    sessionId: string;
    configPackageId: string;
    createdAt: string;
    updatedAt: string;
    completenessScore: number;
    isDerived: boolean;
  }[] = [];
  for (const s of rows) {
    if (!sessionOrganizationInScope(s.organizationId, scope)) continue;
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({
      sessionId: s.id,
      configPackageId: s.configPackageId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      completenessScore: s.completenessScore,
      isDerived: Boolean(s.sourceCallId),
    });
  }
  return out;
}

/**
 * GET /api/intake/sessions/:sessionId
 */
intakeSessionsRouter.get(
  "/:sessionId",
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params.sessionId);
    const scope = req.operatorScope!;
    const row = await prisma.intakeSession.findUnique({
      where: { id: sessionId },
      include: {
        attachments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            sourceUrl: true,
            mimeType: true,
            byteSize: true,
            status: true,
            inboundChannel: true,
            createdAt: true,
            errorMessage: true,
          },
        },
        signatureRequests: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            ghlTemplateId: true,
            reminderCount: true,
            maxReminders: true,
            sentAt: true,
            signedAt: true,
            lastError: true,
          },
        },
      },
    });

    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (!sessionOrganizationInScope(row.organizationId, scope)) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const hitlParsed = parseHitl(row.hitl);
    const fieldValues = (row.fieldValues as Record<string, unknown>) ?? {};
    const channels = Array.isArray(row.channels) ? row.channels : [];
    const externalIds = (row.externalIds as Record<string, unknown>) ?? {};
    const cfg = getVerticalConfigForPackageId(row.configPackageId);
    const snapshot = computeCompletenessSnapshot(cfg, fieldValues);

    const { attachments: attachmentRows, signatureRequests: sigRows, ...sessionRest } = row;

    const portalSummary = await getActivePortalAccessSummary(sessionId);
    const relatedApplications = await relatedApplicationsForSession(
      sessionId,
      sessionRest.sourceCallId ?? null,
      externalIds,
      scope
    );

    res.json({
      sessionId: sessionRest.id,
      organizationId: sessionRest.organizationId,
      verticalId: sessionRest.verticalId,
      configPackageId: sessionRest.configPackageId,
      status: sessionRest.status,
      substatus: sessionRest.substatus ?? undefined,
      primaryChannel: sessionRest.primaryChannel ?? "voice",
      channels,
      fieldValues,
      completeness: {
        score: sessionRest.completenessScore,
        missingRequiredKeys: snapshot.missingRequiredKeys ?? [],
      },
      hitl: hitlParsed,
      fieldChangeLog: normalizeLog(row.fieldChangeLog),
      applicantPortal: portalSummary,
      attachments: attachmentRows.map((a) => ({
        id: a.id,
        mimeType: a.mimeType,
        byteSize: a.byteSize,
        status: a.status,
        inboundChannel: a.inboundChannel,
        createdAt: a.createdAt.toISOString(),
        sourceUrl: a.sourceUrl.length > 200 ? `${a.sourceUrl.slice(0, 200)}…` : a.sourceUrl,
        errorPreview: a.errorMessage ? a.errorMessage.slice(0, 240) : undefined,
      })),
      signatureRequests: sigRows.map((s) => ({
        id: s.id,
        status: s.status,
        ghlTemplateId: s.ghlTemplateId,
        reminderCount: s.reminderCount,
        maxReminders: s.maxReminders,
        sentAt: s.sentAt?.toISOString(),
        signedAt: s.signedAt?.toISOString(),
        lastError: s.lastError ? s.lastError.slice(0, 240) : undefined,
      })),
      externalIds:
        Object.keys(externalIds).length > 0 ? externalIds : undefined,
      relatedApplications,
      createdAt: sessionRest.createdAt.toISOString(),
      updatedAt: sessionRest.updatedAt.toISOString(),
    });
  }
);
