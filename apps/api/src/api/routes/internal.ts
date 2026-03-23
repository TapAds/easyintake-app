import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { config } from "../../config";
import { syncCallToGhl } from "../../services/ghl";
import { sendFollowUpSms, SmsTemplateId } from "../../services/sms";
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
        from:             true,
        completenessScore: true,
        entity: { select: { firstName: true } },
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
      const result = await sendFollowUpSms(call.from, resolvedTemplateId, firstName);
      res.json({ ok: true, sid: result.sid, status: result.status });
    } catch (err) {
      console.error(`[internal] SMS send failed for ${callSid}:`, err);
      res.status(500).json({
        error: "SMS send failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
