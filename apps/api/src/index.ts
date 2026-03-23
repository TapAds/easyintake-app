import "dotenv/config";
import path from "path";
import { config } from "./config";

import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { handleMediaStream } from "./webhooks/twilio/mediaStream";
import { createAgentWss } from "./ws/agentHub";

import { healthRouter } from "./api/routes/health";
import { callsRouter } from "./api/routes/calls";
import { transcriptRouter } from "./api/routes/transcript";
import { internalRouter } from "./api/routes/internal";
import { voiceRouter } from "./webhooks/twilio/voice";
import { callStatusRouter } from "./webhooks/twilio/callStatus";
import { errorHandler } from "./api/middleware/errorHandler";
import { startFollowUpPoller, stopFollowUpPoller } from "./services/followUpPoller";
import { prisma } from "./db/prisma";

const app = express();

// Required for correct URL when behind ngrok/proxy (Twilio signature validation)
app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files (agent UI)
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api", healthRouter);
app.use("/api/calls", callsRouter);
app.use("/api/calls", transcriptRouter);
app.use("/internal", internalRouter);
app.use("/webhooks/twilio", voiceRouter);
app.use("/webhooks/twilio", callStatusRouter);

// ─── Error handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────

const server = createServer(app);

// ─── WebSocket servers ────────────────────────────────────────────────────────

// Twilio Media Stream (binary audio)
const mediaWss = new WebSocketServer({ noServer: true });
mediaWss.on("connection", handleMediaStream);

// Agent browser WebSocket
const agentWss = createAgentWss();

server.on("upgrade", (req, socket, head) => {
  const pathname = req.url?.split("?")[0];

  if (pathname === "/media-stream") {
    mediaWss.handleUpgrade(req, socket, head, (ws) => {
      mediaWss.emit("connection", ws, req);
    });
  } else if (pathname === "/ws/agent") {
    agentWss.handleUpgrade(req, socket, head, (ws) => {
      agentWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);

  prisma.$queryRaw`SELECT 1`
    .then(() => console.log("[db] connected"))
    .catch((err: unknown) => console.error("[db] connection failed:", err));

  startFollowUpPoller();
});

// ─── Graceful shutdown (from Deepgram starter pattern) ───────────────────────

function gracefulShutdown(signal: string) {
  console.log(`\n[server] ${signal} received, shutting down...`);
  stopFollowUpPoller();
  server.close(() => {
    console.log("[server] closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { server, app };
