import express, { Router, Request, Response } from "express";
import { validateTwilioSignature } from "./validateSignature";
import { handleCallEnd } from "../../services/callOrchestrator";

export const callStatusRouter = Router();

/**
 * POST /webhooks/twilio/call-status
 *
 * Twilio calls this endpoint when a call ends (StatusCallback URL).
 * Delegates to callOrchestrator.handleCallEnd for all persistence and
 * downstream actions (entity flush, scoring, GHL sync, SMS scheduling).
 *
 * Always returns 204 — Twilio ignores the response body.
 */
callStatusRouter.post(
  "/call-status",
  express.urlencoded({ extended: false }),
  validateTwilioSignature,
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      CallSid: string;
      CallStatus: string;
      CallDuration?: string;
    };

    const { CallSid, CallStatus, CallDuration } = body;

    console.log(`[callStatus] ${CallSid}: status=${CallStatus} duration=${CallDuration ?? "?"}`);

    // Acknowledge immediately — Twilio has a 10-second timeout for callbacks
    res.sendStatus(204);

    // Orchestrate end-of-call actions asynchronously
    handleCallEnd({
      callSid: CallSid,
      callStatus: CallStatus as Parameters<typeof handleCallEnd>[0]["callStatus"],
      durationSeconds: CallDuration ? parseInt(CallDuration, 10) : undefined,
    }).catch((err) => {
      console.error(`[callStatus] ${CallSid}: orchestration error:`, err);
    });
  }
);
