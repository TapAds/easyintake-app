import { Router, Request, Response } from "express";
import twilio from "twilio";
import { config } from "../../config";
import { requireBearerJwt } from "../middleware/bearerJwtAuth";

export const operatorRouter = Router();

function redactE164(num: string | null | undefined): string {
  if (!num) return "—";
  const d = num.replace(/\D/g, "");
  if (d.length <= 4) return "****";
  return `***…${d.slice(-4)}`;
}

/**
 * GET /api/operator/twilio/recent-calls
 * Lists recent Twilio calls (server-side credentials). Requires Bearer JWT.
 */
operatorRouter.get(
  "/twilio/recent-calls",
  requireBearerJwt,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      const calls = await client.calls.list({ limit: 15 });
      res.json({
        calls: calls.map((c) => ({
          sid: c.sid,
          status: c.status,
          direction: c.direction,
          from: redactE164(c.from),
          to: redactE164(c.to),
          dateCreated: c.dateCreated?.toISOString() ?? null,
          duration: c.duration,
        })),
      });
    } catch (err) {
      console.error("[operator] twilio recent-calls:", err);
      res.status(502).json({ error: "Twilio request failed" });
    }
  }
);
