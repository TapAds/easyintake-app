import { Router, Request, Response } from "express";
import { config } from "../../config";
import { prisma } from "../../db/prisma";
import { verifyGhlMarketplaceWebhook } from "../../lib/ghlWebhookVerify";
import { processGhlWebhookAfterReceipt } from "../../services/ghlInboundProcessor";

export const ghlEventsWebhookRouter = Router();

/**
 * POST /api/webhooks/ghl
 * GoHighLevel Marketplace webhooks — raw JSON body required for signature verification.
 * Phase 0: verify signature, dedupe by webhookId, acknowledge. Phase 2+: route InboundMessage etc.
 */
ghlEventsWebhookRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const buf = req.body;
  const raw =
    Buffer.isBuffer(buf) ? buf.toString("utf8") : typeof buf === "string" ? buf : "";

  if (!raw) {
    res.status(400).json({ error: "empty body" });
    return;
  }

  const verifyMode = config.ghl.webhookVerify.toLowerCase();
  if (verifyMode !== "off") {
    const v = verifyGhlMarketplaceWebhook(raw, req.headers as Record<string, string | string[] | undefined>);
    if (!v.ok) {
      console.warn(`[ghl-webhook] signature rejected: ${v.reason}`);
      res.status(401).json({ error: "invalid signature" });
      return;
    }
  } else {
    console.warn("[ghl-webhook] GHL_WEBHOOK_VERIFY=off — not verifying signatures (dev only)");
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "invalid json" });
    return;
  }

  const webhookId = typeof body.webhookId === "string" ? body.webhookId : null;
  const eventType = typeof body.type === "string" ? body.type : undefined;

  if (webhookId) {
    try {
      await prisma.ghlWebhookReceipt.create({
        data: { webhookId, eventType: eventType ?? null },
      });
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
      if (code === "P2002") {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      throw err;
    }
  }

  console.log(`[ghl-webhook] accepted type=${eventType ?? "?"} webhookId=${webhookId ?? "none"}`);

  setImmediate(() => {
    processGhlWebhookAfterReceipt(body).catch((err) => {
      console.error("[ghl-webhook] async process failed:", err);
    });
  });

  res.status(200).json({ ok: true });
});
