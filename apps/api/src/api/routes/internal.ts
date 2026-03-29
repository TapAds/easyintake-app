import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { config } from "../../config";
import {
  resolveGhlLocationIdFromTwilioTo,
  syncCallToGhl,
  listGhlProposalTemplates,
} from "../../services/ghl";
import { createSignatureRequestAndSend } from "../../services/ghlSignature";
import { deliverFollowUpSms } from "../../services/followUpSend";
import { SmsTemplateId } from "../../services/sms";
import { callEvents } from "../../lib/callEvents";

export const internalRouter = Router();

// ─── POST /internal/token ────────────────────────────────────────────────────

/**
 * Generates a short-lived JWT for agent WebSocket auth.
 * DEV/TEST ONLY — restrict in production (e.g. localhost or specific IP).
 */
internalRouter.post("/token", (req: Request, res: Response): void => {
  const token = jwt.sign(
    { sub: "agent", purpose: "ws" },
    config.auth.jwtSecret,
    { expiresIn: "24h" }
  );
  res.json({ token });
});

// ─── POST /internal/test/call ────────────────────────────────────────────────

/**
 * TEST ONLY — creates a Call record for testing utterance/agent flow.
 * Returns the callSid for use with /internal/test/utterance and agent UI.
 */
internalRouter.post(
  "/test/call",
  async (req: Request, res: Response): Promise<void> => {
    const { from = "+15550000000", to } = req.body as { from?: string; to?: string };
    const toNumber = to ?? process.env.TWILIO_PHONE_NUMBER ?? "+15550000000";

    const call = await prisma.call.create({
      data: {
        callSid: `CA_test_${Date.now()}`,
        from,
        to: toNumber,
        startedAt: new Date(),
        status: "ACTIVE",
      },
    });

    console.log(`[internal/test] call created: ${call.callSid}`);
    res.json({ callSid: call.callSid, callId: call.id });
  }
);

// ─── POST /internal/test/utterance ───────────────────────────────────────────

/**
 * TEST ONLY — simulates a Deepgram utterance event without a live call.
 * Emits the same "utterance" event shape that deepgram.ts produces.
 */
internalRouter.post(
  "/test/utterance",
  (req: Request, res: Response): void => {
    const { callSid, text } = req.body as { callSid?: string; text?: string };

    if (!callSid || !text) {
      res.status(400).json({ error: "callSid and text are required" });
      return;
    }

    const event = {
      callSid,
      speaker: "speaker_0",
      text,
      offsetMs: 0,
      languageCode: "en",
      confidence: 1.0,
    };

    callEvents.emit("utterance", event);
    console.log(`[internal/test] utterance emitted for ${callSid}: "${text}"`);
    res.json({ ok: true, event });
  }
);

// Internal routes are localhost-only with no auth.
// The Express app binds these under /internal; access controls must be
// enforced at the network/firewall level in production.

// ─── POST /internal/ghl/sync/:callSid ────────────────────────────────────────

/**
 * Manually re-triggers GHL sync for a completed call.
 * Useful for recovering from API errors or credential issues.
 */
internalRouter.post(
  "/ghl/sync/:callSid",
  async (req: Request, res: Response): Promise<void> => {
    const callSid = String(req.params.callSid);
    const call = await prisma.call.findUnique({
      where: { callSid },
      select: { id: true, completenessScore: true },
    });

    if (!call) {
      res.status(404).json({ error: "Call not found" });
      return;
    }

    try {
      await syncCallToGhl(call.id, call.completenessScore);
      res.json({ ok: true, callId: call.id });
    } catch (err) {
      console.error(`[internal] GHL sync failed for ${req.params.callSid}:`, err);
      res.status(500).json({
        error: "GHL sync failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

// ─── POST /internal/ghl/signature/send ───────────────────────────────────────

/**
 * Queues a GHL template send (Documents & Contracts) and starts signature reminders.
 * Body: { intakeSessionId?, templateId?, locationId?, contactId? }
 * When intakeSessionId is set, location/contact are read from session externalIds.
 */
internalRouter.post(
  "/ghl/signature/send",
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      intakeSessionId?: string;
      templateId?: string;
      locationId?: string;
      contactId?: string;
    };

    let locationId = body.locationId?.trim() ?? "";
    let contactId = body.contactId?.trim() ?? "";
    const templateId =
      (body.templateId?.trim() || config.signature.defaultTemplateId.trim() || "").trim() || "";

    if (body.intakeSessionId) {
      const session = await prisma.intakeSession.findUnique({
        where: { id: body.intakeSessionId },
        select: { externalIds: true },
      });
      if (!session) {
        res.status(404).json({ error: "IntakeSession not found" });
        return;
      }
      const ext = (session.externalIds as Record<string, unknown> | null) ?? {};
      if (!locationId && typeof ext.ghlLocationId === "string") locationId = ext.ghlLocationId;
      if (!contactId && typeof ext.ghlContactId === "string") contactId = ext.ghlContactId;
    }

    if (!locationId || !contactId || !templateId) {
      res.status(400).json({
        error:
          "Requires templateId (or GHL_DEFAULT_SIGNATURE_TEMPLATE_ID) and ghlLocationId + ghlContactId, or intakeSessionId with those external ids",
      });
      return;
    }

    try {
      const result = await createSignatureRequestAndSend({
        intakeSessionId: body.intakeSessionId ?? null,
        ghlLocationId: locationId,
        ghlContactId: contactId,
        templateId,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[internal] signature send failed:", err);
      res.status(500).json({
        error: "GHL template send failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

/**
 * GET /internal/ghl/signature/templates?locationId=
 * Lists proposal/document templates for a sub-account (debug / operator).
 */
internalRouter.get("/ghl/signature/templates", async (req: Request, res: Response): Promise<void> => {
  const locationId = String(req.query.locationId ?? "").trim();
  if (!locationId) {
    res.status(400).json({ error: "locationId query required" });
    return;
  }
  try {
    const data = await listGhlProposalTemplates(locationId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error("[internal] list templates failed:", err);
    res.status(500).json({
      error: "list templates failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── POST /internal/sms/send ──────────────────────────────────────────────────

/**
 * Manually sends the follow-up SMS for a call.
 * Accepts an optional templateId override; defaults to score-based selection.
 */
internalRouter.post(
  "/sms/send",
  async (req: Request, res: Response): Promise<void> => {
    const { callSid, templateId } = req.body as {
      callSid: string;
      templateId?: SmsTemplateId;
    };

    if (!callSid) {
      res.status(400).json({ error: "callSid is required" });
      return;
    }

    const call = await prisma.call.findUnique({
      where: { callSid },
      select: {
        from: true,
        to: true,
        completenessScore: true,
        ghlContactId: true,
        intakeSession: { select: { externalIds: true } },
        entity: { select: { firstName: true, email: true } },
      },
    });

    if (!call) {
      res.status(404).json({ error: "Call not found" });
      return;
    }

    const resolvedTemplateId: SmsTemplateId =
      templateId ??
      (call.completenessScore >= 0.7 ? "qualified" : "partial");

    const firstName = call.entity?.firstName ?? "";

    try {
      const ghlLocationId = await resolveGhlLocationIdFromTwilioTo(call.to);
      const ext = call.intakeSession?.externalIds;
      const extObj =
        ext && typeof ext === "object" && !Array.isArray(ext) ? (ext as Record<string, unknown>) : {};
      const s = extObj.lastInboundChannel;
      const stickyChannel =
        s === "sms" || s === "email" || s === "whatsapp" || s === "live_chat" || s === "other" ? s : null;

      const result = await deliverFollowUpSms({
        ghlLocationId,
        phone: call.from,
        ghlContactId: call.ghlContactId,
        templateId: resolvedTemplateId,
        firstName,
        stickyChannel,
        applicantEmail: call.entity?.email ?? null,
      });
      res.json({
        ok: true,
        provider: result.provider,
        externalMessageId: result.externalMessageId,
      });
    } catch (err) {
      console.error(`[internal] SMS send failed for ${callSid}:`, err);
      res.status(500).json({
        error: "SMS send failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
