import { Router, Request, Response } from "express";
import twilio from "twilio";
import { config } from "../../config";
import { requireBearerJwt } from "../middleware/bearerJwtAuth";

export const operatorRouter = Router();

/** Last 4 digits only — no full numbers (PII). */
function last4Digits(num: string | null | undefined): string {
  if (!num) return "—";
  const d = num.replace(/\D/g, "");
  if (d.length === 0) return "—";
  return d.slice(-4);
}

/**
 * GET /api/operator/twilio/recent-calls
 * Lists recent Twilio calls (server-side credentials). Requires Bearer JWT.
 * Returns up to 10 calls; from/to are last 4 digits only.
 */
operatorRouter.get(
  "/twilio/recent-calls",
  requireBearerJwt,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      const calls = await client.calls.list({ limit: 10 });
      res.json({
        calls: calls.map((c) => ({
          sid: c.sid,
          status: c.status,
          direction: c.direction,
          from: last4Digits(c.from),
          to: last4Digits(c.to),
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
