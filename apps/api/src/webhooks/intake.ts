import { Router, Request, Response } from "express";
import { config } from "../config";
import { processIntakeEvent, IntakeWebhookPayload, IntakeEvent } from "../services/intakeWebhook";

export const intakeWebhookRouter = Router();

const VALID_EVENTS: IntakeEvent[] = [
  "lead.captured",
  "quote.completed",
  "quote.requested_callback",
];

function validateAuth(req: Request): boolean {
  const secret = req.get("X-Webhook-Secret");
  const source = req.get("X-Source");
  const configuredSecret = config.intakeWebhook.secret;

  if (!configuredSecret) {
    console.warn("[intake] COTIZARAHORA_WEBHOOK_SECRET not set — rejecting all requests");
    return false;
  }

  if (secret !== configuredSecret) return false;
  if (source !== "cotizarahora") return false;
  return true;
}

function validatePayload(body: unknown): { ok: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;
  if (typeof b.event !== "string" || !VALID_EVENTS.includes(b.event as IntakeEvent)) {
    return { ok: false, error: `event must be one of: ${VALID_EVENTS.join(", ")}` };
  }
  if (typeof b.timestamp !== "string") {
    return { ok: false, error: "timestamp is required (ISO 8601)" };
  }
  if (typeof b.source !== "string") {
    return { ok: false, error: "source is required" };
  }
  if (typeof b.vertical !== "string") {
    return { ok: false, error: "vertical is required" };
  }
  if (!b.data || typeof b.data !== "object") {
    return { ok: false, error: "data is required" };
  }

  const data = b.data as Record<string, unknown>;
  if (typeof data.lead_id !== "string") {
    return { ok: false, error: "data.lead_id is required (UUID)" };
  }
  if (typeof data.phone !== "string") {
    return { ok: false, error: "data.phone is required (E.164)" };
  }

  return { ok: true };
}

intakeWebhookRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  if (!validateAuth(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const validation = validatePayload(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const payload = req.body as IntakeWebhookPayload;

  try {
    const { duplicate } = await processIntakeEvent(payload.event, payload.data);

    if (duplicate) {
      res.status(409).json({ error: "Duplicate — lead already exists" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[intake] processing failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
