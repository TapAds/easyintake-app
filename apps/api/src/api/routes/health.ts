import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { config } from "../../config";

export const healthRouter = Router();

/**
 * Voice pipeline readiness (no secrets). Helps validate Slice 1 / demo prep.
 * GET /api/health/voice
 */
healthRouter.get("/health/voice", async (_req: Request, res: Response) => {
  try {
    let dbRecent: {
      callSid: string;
      status: string;
      startedAt: string;
    }[] = [];
    try {
      const rows = await prisma.call.findMany({
        take: 8,
        orderBy: { startedAt: "desc" },
        select: { callSid: true, status: true, startedAt: true },
      });
      dbRecent = rows.map((r) => ({
        callSid: r.callSid,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
      }));
    } catch {
      dbRecent = [];
    }

    const host = (() => {
      try {
        return new URL(config.publicBaseUrl).host;
      } catch {
        return null;
      }
    })();

    res.json({
      ts: new Date().toISOString(),
      publicBaseUrlHost: host,
      endpoints: {
        voiceWebhook: "/webhooks/twilio/voice",
        mediaStreamWs: host ? `wss://${host}/media-stream` : null,
        agentWs: host ? `wss://${host}/ws/agent` : null,
        agentStatic: "/public/agent.html",
      },
      engine: {
        twilioConfigured: Boolean(config.twilio.accountSid && config.twilio.authToken),
        deepgramConfigured: Boolean(config.deepgram.apiKey),
        anthropicConfigured: Boolean(config.anthropic.apiKey),
      },
      recentCallsFromDb: dbRecent,
    });
  } catch (err) {
    console.error("[health/voice]", err);
    res.status(500).json({ error: "voice health failed" });
  }
});

healthRouter.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "ok", ts: new Date().toISOString() });
  } catch (err) {
    res
      .status(503)
      .json({ status: "error", db: "unreachable", ts: new Date().toISOString() });
  }
});
