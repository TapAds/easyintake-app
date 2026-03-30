import express, { Router, Request, Response, NextFunction } from "express";
import { validateTwilioSignature } from "./validateSignature";
import { buildVoiceTwiml, buildVoiceTwimlConferenceWithStream } from "./twiml";
import { prisma } from "../../db/prisma";
import { ensureIntakeSessionForCall } from "../../services/intakeSessionSync";
import { organizationIdForGhlLocation } from "../../services/ghlInboundProcessor";
import { earlyLinkVoiceCallToGhl } from "../../services/ghl";
import { dialAgentIntoConference } from "../../services/twilioConference";

export const voiceRouter = Router();

const DEFAULT_ORG = process.env.DEFAULT_ORGANIZATION_ID ?? "org_local_dev";

/**
 * POST /webhooks/twilio/voice
 *
 * Twilio calls this endpoint when an inbound call arrives.
 * Creates a Call record in ACTIVE state and returns TwiML that opens
 * a Media Stream to /media-stream for real-time transcription.
 *
 * When `AgencyConfig.voiceAgentForwardNumber` or `VOICE_AGENT_FORWARD_NUMBER` is set,
 * TwiML uses `<Start><Stream>` + `<Dial><Conference>` and an outbound REST dial
 * bridges an agent phone into the same conference (transcription keyed to inbound CallSid).
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

    const toNorm = To.trim().replace(/\s/g, "");
    const agency = await prisma.agencyConfig.findFirst({
      where: { twilioPhoneNumber: toNorm },
      select: { ghlLocationId: true, voiceAgentForwardNumber: true },
    });

    const forwardRaw =
      agency?.voiceAgentForwardNumber?.trim() ||
      process.env.VOICE_AGENT_FORWARD_NUMBER?.trim() ||
      "";
    const organizationId = agency
      ? organizationIdForGhlLocation(agency.ghlLocationId)
      : DEFAULT_ORG;

    const conferenceName = forwardRaw ? `ei-${CallSid}` : null;
    const twiml =
      forwardRaw && conferenceName
        ? buildVoiceTwimlConferenceWithStream(CallSid, conferenceName)
        : buildVoiceTwiml(CallSid);

    console.log(
      `[voice] inbound ${CallSid} from ${From} conf=${Boolean(conferenceName)} org=${organizationId}`
    );

    res.type("text/xml").send(twiml);

    prisma.call
      .upsert({
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
      })
      .then(async (call) => {
        await ensureIntakeSessionForCall(
          call.id,
          CallSid,
          call.startedAt,
          To,
          organizationId
        );
        if (agency?.ghlLocationId) {
          try {
            await earlyLinkVoiceCallToGhl({
              callDbId: call.id,
              callerE164: From.trim(),
              ghlLocationId: agency.ghlLocationId,
            });
          } catch (err) {
            console.error(`[voice] early GHL link failed ${CallSid}:`, err);
          }
        }
        if (forwardRaw && conferenceName) {
          try {
            await dialAgentIntoConference({
              agentE164: forwardRaw,
              fromAgencyE164: toNorm,
              conferenceName,
            });
            console.log(`[voice] agent dial placed into ${conferenceName} for ${CallSid}`);
          } catch (err) {
            console.error(`[voice] dialAgentIntoConference failed ${CallSid}:`, err);
          }
        }
        console.log(`[voice] call record + intake session for ${CallSid}`);
      })
      .catch((err) => console.error(`[voice] failed to create call record`, err));
  }
);
