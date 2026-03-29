import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { config } from "../../config";
import { findIntakeSessionForContact } from "../../services/ghlInboundProcessor";
import { CallStatus } from "@prisma/client";

export const ghlEmbedApiRouter = Router();

let loggedMissingSecret = false;

function requireGhlEmbedSecret(req: Request, res: Response, next: NextFunction): void {
  const required = config.ghl.customPageSecret;
  if (!required) {
    if (config.nodeEnv === "production") {
      res.status(503).json({
        error:
          "GHL_CUSTOM_PAGE_SECRET is not set. Set it in production to enable the GHL embed API.",
      });
      return;
    }
    if (!loggedMissingSecret) {
      loggedMissingSecret = true;
      console.warn(
        "[ghl-embed] GHL_CUSTOM_PAGE_SECRET unset — embed API open (development only)."
      );
    }
    next();
    return;
  }

  const rawQ = req.query.page_secret;
  const fromQuery =
    typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? String(rawQ[0]) : "";
  const fromHeader = req.get("X-EasyIntake-Embed-Secret") ?? "";
  if (fromQuery !== required && fromHeader !== required) {
    res.status(401).json({ error: "Invalid or missing embed secret" });
    return;
  }
  next();
}

ghlEmbedApiRouter.use(requireGhlEmbedSecret);

/**
 * GET /ghl/api/session?location_id=&contact_id=
 * Snapshot for GHL iframe command center (Phase 6).
 */
ghlEmbedApiRouter.get("/session", async (req: Request, res: Response): Promise<void> => {
  const locationId = String(req.query.location_id ?? "").trim();
  const contactId = String(req.query.contact_id ?? "").trim();
  if (!locationId || !contactId) {
    res.status(400).json({ error: "location_id and contact_id are required" });
    return;
  }

  const agency = await prisma.agencyConfig.findUnique({
    where: { ghlLocationId: locationId },
    select: { ghlLocationId: true, agencyName: true },
  });
  if (!agency) {
    res.status(404).json({ error: "No AgencyConfig for this location — install the GHL app" });
    return;
  }

  const stub = await findIntakeSessionForContact(locationId, contactId);
  if (!stub) {
    res.json({
      agency: { locationId: agency.ghlLocationId, name: agency.agencyName },
      session: null,
    });
    return;
  }

  const row = await prisma.intakeSession.findUnique({
    where: { id: stub.id },
    include: {
      attachments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          mimeType: true,
          inboundChannel: true,
          createdAt: true,
        },
      },
      signatureRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          ghlTemplateId: true,
          reminderCount: true,
          maxReminders: true,
          sentAt: true,
          signedAt: true,
        },
      },
    },
  });

  if (!row) {
    res.json({ agency, session: null });
    return;
  }

  const hitl = (row.hitl as Record<string, boolean>) ?? {};
  const fieldValues = (row.fieldValues as Record<string, unknown>) ?? {};
  const channels = Array.isArray(row.channels) ? row.channels : [];
  const externalIds = (row.externalIds as Record<string, unknown>) ?? {};

  res.json({
    agency: { locationId: agency.ghlLocationId, name: agency.agencyName },
    session: {
      sessionId: row.id,
      organizationId: row.organizationId,
      verticalId: row.verticalId,
      configPackageId: row.configPackageId,
      status: row.status,
      substatus: row.substatus ?? undefined,
      primaryChannel: row.primaryChannel ?? undefined,
      channels,
      fieldValues,
      completenessScore: row.completenessScore,
      hitl: {
        pendingAgentReview: hitl.pendingAgentReview ?? false,
        pendingDocumentApproval: hitl.pendingDocumentApproval ?? false,
        pendingFinalSignOff: hitl.pendingFinalSignOff ?? false,
        pendingApplicantSignature: hitl.pendingApplicantSignature ?? false,
      },
      externalIds,
      attachments: row.attachments,
      signatureRequests: row.signatureRequests.map((s) => ({
        id: s.id,
        status: s.status,
        ghlTemplateId: s.ghlTemplateId,
        reminderCount: s.reminderCount,
        maxReminders: s.maxReminders,
        sentAt: s.sentAt?.toISOString(),
        signedAt: s.signedAt?.toISOString(),
      })),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
});

/**
 * GET /ghl/api/active-call?location_id=&contact_id=
 */
ghlEmbedApiRouter.get("/active-call", async (req: Request, res: Response): Promise<void> => {
  const locationId = String(req.query.location_id ?? "").trim();
  const contactId = String(req.query.contact_id ?? "").trim();
  if (!locationId || !contactId) {
    res.status(400).json({ error: "location_id and contact_id are required" });
    return;
  }

  const agency = await prisma.agencyConfig.findUnique({
    where: { ghlLocationId: locationId },
    select: { ghlLocationId: true },
  });
  if (!agency) {
    res.status(404).json({ error: "No AgencyConfig for this location" });
    return;
  }

  const active: CallStatus[] = [CallStatus.ACTIVE];
  const call = await prisma.call.findFirst({
    where: {
      ghlContactId: contactId,
      status: { in: active },
    },
    orderBy: { startedAt: "desc" },
    select: { callSid: true, id: true, startedAt: true },
  });

  res.json({
    callSid: call?.callSid ?? null,
    callId: call?.id ?? null,
    startedAt: call?.startedAt?.toISOString() ?? null,
  });
});

/**
 * POST /ghl/api/ws-token { locationId, contactId }
 * Short-lived JWT for /ws/agent (same secret as agent UI).
 */
ghlEmbedApiRouter.post("/ws-token", (req: Request, res: Response): void => {
  const { locationId, contactId } = req.body as {
    locationId?: string;
    contactId?: string;
  };
  if (!locationId?.trim() || !contactId?.trim()) {
    res.status(400).json({ error: "locationId and contactId are required" });
    return;
  }

  const token = jwt.sign(
    {
      sub: "ghl_embed",
      purpose: "ws",
      locationId: locationId.trim(),
      contactId: contactId.trim(),
    },
    config.auth.jwtSecret,
    { expiresIn: "2h" }
  );

  res.json({ token, expiresInSec: 7200 });
});
