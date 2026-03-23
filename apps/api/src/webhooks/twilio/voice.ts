import express, { Router, Request, Response, NextFunction } from "express";
import { validateTwilioSignature } from "./validateSignature";
import { buildVoiceTwiml } from "./twiml";
import { prisma } from "../../db/prisma";

export const voiceRouter = Router();

/**
 * POST /webhooks/twilio/voice
 *
 * Twilio calls this endpoint when an inbound call arrives.
 * Creates a Call record in ACTIVE state and returns TwiML that opens
 * a Media Stream to /media-stream for real-time transcription.
 */
voiceRouter.post(
  "/voice",
  express.urlencoded({ extended: false }),
  (req: Request, _res: Response, next: NextFunction) => {
    console.log("[voice] route hit");
    console.log("[voice] body:", req.body);
    next();
  },
  validateTwilioSignature,
  async (req: Request, res: Response): Promise<void> => {
    const { CallSid, From, To } = req.body as {
      CallSid: string;
      From: string;
      To: string;
    };

    console.log(`[voice] inbound call ${CallSid} from ${From}`);

    try {
      await prisma.call.upsert({
        where: { callSid: CallSid },
        create: {
          callSid: CallSid,
          from: From,
          to: To,
          startedAt: new Date(),
          status: "ACTIVE",
        },
        update: {
          from: From,
          to: To,
        },
      });
      console.log(`[voice] call record created for ${CallSid}`);
    } catch (err) {
      // Log but don't block — returning TwiML is the priority
      console.error(`[voice] failed to create call record`, err);
    }

    res.type("text/xml").send(buildVoiceTwiml(CallSid));
  }
);
