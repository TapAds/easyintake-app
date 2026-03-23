import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { URL } from "url";
import { config } from "../config";
import { callEvents } from "../lib/callEvents";
import { getEntityCache, stageToScope, getMissingFieldsByStage } from "../services/stageManager";
import { computeCompletenessScore } from "../services/scoring";
import { generateAgentGuidance } from "../services/claude";
import { extractEntities } from "../services/claude";
import { FlowStage } from "@prisma/client";
import { prisma } from "../db/prisma";

// ─── WebSocket message types ──────────────────────────────────────────────────

export type AgentMessage =
  | { type: "transcript_chunk"; callSid: string; speaker: string; text: string; offsetMs: number; languageCode: string; confidence?: number }
  | { type: "entity_update"; callSid: string; entities: Record<string, unknown>; score: { overall: number; tier: string } }
  | { type: "guidance"; callSid: string; guidanceText: string; missingFields: string[]; priorityField: string | null }
  | { type: "score_update"; callSid: string; overall: number; tier: string }
  | { type: "stage_transition"; callSid: string; from: string; to: string; flow?: string }
  | { type: "call_ended"; callSid: string };

// ─── Client registry ──────────────────────────────────────────────────────────
//
// Map<callSid, Set<WebSocket>> — multiple agent tabs can subscribe to one call.

const subscribers = new Map<string, Set<WebSocket>>();

function subscribe(callSid: string, ws: WebSocket): void {
  const set = subscribers.get(callSid) ?? new Set();
  set.add(ws);
  subscribers.set(callSid, set);
}

function unsubscribe(ws: WebSocket): void {
  for (const [callSid, set] of subscribers) {
    set.delete(ws);
    if (set.size === 0) subscribers.delete(callSid);
  }
}

function broadcast(callSid: string, message: AgentMessage): void {
  const set = subscribers.get(callSid);
  if (!set || set.size === 0) return;

  const json = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }
}

// ─── JWT auth from query param ────────────────────────────────────────────────

function extractToken(req: IncomingMessage): string | null {
  try {
    const url = new URL(req.url ?? "", "ws://localhost");
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, config.auth.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

// ─── callEvents listeners ─────────────────────────────────────────────────────
//
// Wired once when agentHub.ts is first imported. All call events fan out to
// subscribed agent browser WebSockets.

callEvents.on(
  "utterance",
  (event: {
    callSid: string;
    speaker: string;
    text: string;
    offsetMs: number;
    languageCode: string;
    confidence?: number;
    allUtterances?: { speaker: string; text: string; languageCode: string }[];
  }) => {
    const { callSid } = event;

    // ── 1. Push raw transcript chunk to agent UI (if any agents watching) ────
    broadcast(callSid, {
      type: "transcript_chunk",
      callSid,
      speaker:      event.speaker,
      text:         event.text,
      offsetMs:     event.offsetMs,
      languageCode: event.languageCode,
      confidence:   event.confidence,
    });

    // ── 2. Entity extraction + guidance — run async, never let rejections crash server
    void (async () => {
      try {
        console.log(`[agentHub] utterance received for ${callSid}, processing...`);
        const call = await prisma.call.findUnique({
          where: { callSid },
          select: { id: true, flowStage: true, selectedProduct: true },
        });

        if (!call) return;

        const scope = stageToScope(call.flowStage as FlowStage);
        const utterances = event.allUtterances ?? [
          { speaker: event.speaker, text: event.text, languageCode: event.languageCode },
        ];

        console.log(`[agentHub] calling extractEntities for ${callSid}`);
        const extracted = await extractEntities(utterances, scope);
        console.log(`[agentHub] extractEntities done for ${callSid}`);

        const { mergeIntoEntityCache } = await import("../services/stageManager");
        const fullEntity = mergeIntoEntityCache(callSid, extracted);

        const scoreResult = computeCompletenessScore(fullEntity);

        broadcast(callSid, {
          type: "entity_update",
          callSid,
          entities: fullEntity as Record<string, unknown>,
          score: { overall: scoreResult.overall, tier: scoreResult.tier },
        });

        broadcast(callSid, {
          type: "score_update",
          callSid,
          overall: scoreResult.overall,
          tier:    scoreResult.tier,
        });

        const missingFields = getMissingFieldsByStage(fullEntity, scope);
        const guidance = await generateAgentGuidance(
          fullEntity,
          missingFields,
          scope,
          { callId: call.id, callSid }
        );

        broadcast(callSid, {
          type: "guidance",
          callSid,
          guidanceText:  guidance.guidanceText,
          missingFields: guidance.missingFields,
          priorityField: guidance.priorityField,
        });
        console.log(`[agentHub] utterance processing complete for ${callSid}`);
      } catch (err) {
        console.error(`[agentHub] ${callSid}: utterance processing error:`, err);
      }
    })();
  }
);

callEvents.on(
  "stage:transition",
  (event: { callSid: string; from: string; to: string; flow?: string }) => {
    broadcast(event.callSid, {
      type:    "stage_transition",
      callSid: event.callSid,
      from:    event.from,
      to:      event.to,
      flow:    event.flow,
    });
  }
);

callEvents.on("call:ended", (event: { callSid: string }) => {
  broadcast(event.callSid, {
    type:    "call_ended",
    callSid: event.callSid,
  });

  // Clean up subscribers after a short delay (allow last message to land)
  setTimeout(() => {
    subscribers.delete(event.callSid);
  }, 5000);
});

// ─── WebSocket connection handler ─────────────────────────────────────────────

/**
 * Handles a new WebSocket connection on /ws/agent.
 *
 * URL format: /ws/agent?token=<jwt>&callSid=<sid>
 *   token   — required: JWT for authentication
 *   callSid — optional: subscribe to a specific call immediately
 *
 * After connection, the client may send { type: "subscribe", callSid: "..." }
 * to start receiving events for a call.
 */
export function handleAgentConnection(
  ws: WebSocket,
  req: IncomingMessage
): void {
  const token = extractToken(req);

  if (!token || !verifyToken(token)) {
    ws.close(4001, "Unauthorized");
    return;
  }

  // Optionally subscribe to a callSid from the query string immediately
  try {
    const url = new URL(req.url ?? "", "ws://localhost");
    const callSid = url.searchParams.get("callSid");
    if (callSid) {
      subscribe(callSid, ws);
      console.log(`[agentHub] client subscribed to ${callSid} (${subscribers.get(callSid)?.size ?? 0} total)`);
    }
  } catch {
    // no callSid in query — client will subscribe via message
  }

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(String(data)) as { type: string; callSid?: string };

      if (msg.type === "subscribe" && msg.callSid) {
        subscribe(msg.callSid, ws);
        console.log(
          `[agentHub] client subscribed to ${msg.callSid} ` +
          `(${subscribers.get(msg.callSid)?.size ?? 0} total)`
        );
      }

      if (msg.type === "unsubscribe" && msg.callSid) {
        const set = subscribers.get(msg.callSid);
        set?.delete(ws);
        if (set?.size === 0) subscribers.delete(msg.callSid);
      }
    } catch {
      // ignore malformed frames
    }
  });

  ws.on("close", () => {
    unsubscribe(ws);
  });

  ws.on("error", (err) => {
    console.error("[agentHub] WebSocket error:", err);
    unsubscribe(ws);
  });
}

// ─── WebSocket server factory ─────────────────────────────────────────────────

/**
 * Creates and returns the agent WebSocket server.
 * Called once from index.ts; the server handles upgrade routing.
 */
export function createAgentWss(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", handleAgentConnection);
  return wss;
}
