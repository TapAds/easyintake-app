import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { URL } from "url";
import { config } from "../config";
import { callEvents } from "../lib/callEvents";
import {
  getEntityCache,
  getEntityFieldSources,
  initEntityCache,
  mergeIntoEntityCache,
  applyAgentFieldConfirm,
  applyAgentFieldEdit,
  stageToScope,
  getMissingFieldsByStage,
  getFieldConfidenceCache,
  type EntityState,
} from "../services/stageManager";
import {
  computeCompletenessScore,
  computeN400CompletenessScore,
} from "../services/scoring";
import {
  generateAgentGuidance,
  generateN400AgentGuidance,
  extractEntities,
  extractN400Entities,
} from "../services/claude";
import {
  listMissingApplicableFieldKeys,
  USCIS_N400_VERTICAL_CONFIG,
} from "@easy-intake/shared";
import { buildV2CurrentStateForPrompt } from "../services/extractionTransform";
import { appendCallFieldChangeLog, agentActor } from "../services/fieldChangeLog";
import { FlowStage } from "@prisma/client";
import { prisma } from "../db/prisma";
import { scheduleDebouncedEntitySnapshot } from "../services/entitySnapshotPersistence";

// ─── WebSocket message types ──────────────────────────────────────────────────

export type AgentMessage =
  | { type: "transcript_chunk"; callSid: string; speaker: string; text: string; offsetMs: number; languageCode: string; confidence?: number }
  | {
      type: "entity_update";
      callSid: string;
      entities: Record<string, unknown>;
      score: { overall: number; tier: string };
      fieldConfidences?: Record<string, number>;
    }
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

function broadcastEntityUpdate(
  callSid: string,
  entities: Record<string, unknown>,
  score: { overall: number; tier: string }
): void {
  broadcast(callSid, {
    type: "entity_update",
    callSid,
    entities,
    score,
    fieldConfidences: getFieldConfidenceCache(callSid),
  });
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

function decodeJwtSub(token: string | null): string {
  if (!token) return "unknown_agent";
  try {
    const p = jwt.decode(token) as { sub?: string } | null;
    return typeof p?.sub === "string" ? p.sub : "unknown_agent";
  } catch {
    return "unknown_agent";
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
          select: {
            id: true,
            flowStage: true,
            selectedProduct: true,
            intakeSession: { select: { configPackageId: true } },
          },
        });

        if (!call) return;

        const scope = stageToScope(call.flowStage as FlowStage);
        const configPackageId = call.intakeSession?.configPackageId ?? null;
        const utterances = event.allUtterances ?? [
          { speaker: event.speaker, text: event.text, languageCode: event.languageCode },
        ];

        initEntityCache(callSid);
        const entitySnapshot = getEntityCache(callSid);
        const sourcesSnapshot = getEntityFieldSources(callSid);
        const currentState = buildV2CurrentStateForPrompt({
          entity: entitySnapshot,
          sources: sourcesSnapshot,
        });

        console.log(`[agentHub] calling extraction for ${callSid}`);
        const extraction =
          configPackageId === "uscis-n400"
            ? await extractN400Entities(utterances)
            : await extractEntities(utterances, scope, {
                currentState,
                selectedProduct: call.selectedProduct,
                scope,
              });
        console.log(`[agentHub] extraction done for ${callSid}`);

        const fullEntity = mergeIntoEntityCache(
          callSid,
          extraction.entities as EntityState,
          {
            fieldConfidences: extraction.fieldConfidences,
            sttConfidence:   event.confidence,
          }
        );

        const scoreResult =
          configPackageId === "uscis-n400"
            ? computeN400CompletenessScore(fullEntity as Record<string, unknown>)
            : computeCompletenessScore(fullEntity);

        broadcastEntityUpdate(callSid, fullEntity as Record<string, unknown>, {
          overall: scoreResult.overall,
          tier:    scoreResult.tier,
        });

        broadcast(callSid, {
          type: "score_update",
          callSid,
          overall: scoreResult.overall,
          tier:    scoreResult.tier,
        });

        const missingFields =
          configPackageId === "uscis-n400"
            ? listMissingApplicableFieldKeys(
                USCIS_N400_VERTICAL_CONFIG,
                fullEntity as Record<string, unknown>
              )
            : getMissingFieldsByStage(fullEntity, scope);
        const guidance =
          configPackageId === "uscis-n400"
            ? await generateN400AgentGuidance(
                fullEntity as Record<string, unknown>,
                { callId: call.id, callSid }
              )
            : await generateAgentGuidance(
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
        scheduleDebouncedEntitySnapshot(callSid);
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

  const agentSubject = decodeJwtSub(token);

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
      const msg = JSON.parse(String(data)) as {
        type: string;
        callSid?: string;
        field?: string;
        value?: unknown;
      };

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

      if (msg.type === "field_confirm" && msg.callSid && msg.field) {
        const confirmSid = msg.callSid;
        const confirmField = msg.field;
        void (async () => {
          try {
            initEntityCache(confirmSid);
            const prev = (getEntityCache(confirmSid) as Record<string, unknown>)[
              confirmField
            ];
            applyAgentFieldConfirm(confirmSid, confirmField);
            const call = await prisma.call.findUnique({
              where: { callSid: confirmSid },
              select: { id: true, intakeSessionId: true },
            });
            if (call) {
              await appendCallFieldChangeLog(call.id, {
                fieldKey: confirmField,
                oldValue: prev,
                newValue: prev,
                reason: "agent_confirm",
                actor: agentActor(agentSubject),
                evidence: { callSid: confirmSid },
              });
            }
            const fullEntity = getEntityCache(confirmSid);
            const callRow = await prisma.call.findUnique({
              where: { callSid: confirmSid },
              select: { intakeSession: { select: { configPackageId: true } } },
            });
            const pkg = callRow?.intakeSession?.configPackageId ?? null;
            const scoreResult =
              pkg === "uscis-n400"
                ? computeN400CompletenessScore(fullEntity as Record<string, unknown>)
                : computeCompletenessScore(fullEntity);
            broadcastEntityUpdate(confirmSid, fullEntity as Record<string, unknown>, {
              overall: scoreResult.overall,
              tier:    scoreResult.tier,
            });
            scheduleDebouncedEntitySnapshot(confirmSid);
          } catch (e) {
            console.error("[agentHub] field_confirm:", e);
          }
        })();
      }

      if (
        msg.type === "field_edit" &&
        msg.callSid &&
        msg.field &&
        msg.value !== undefined
      ) {
        const editSid = msg.callSid;
        const editField = msg.field;
        const editValue = msg.value;
        void (async () => {
          try {
            initEntityCache(editSid);
            const prev = (getEntityCache(editSid) as Record<string, unknown>)[
              editField
            ];
            const fullEntity = applyAgentFieldEdit(
              editSid,
              editField,
              editValue
            );
            const call = await prisma.call.findUnique({
              where: { callSid: editSid },
              select: { id: true, intakeSessionId: true },
            });
            if (call) {
              await appendCallFieldChangeLog(call.id, {
                fieldKey: editField,
                oldValue: prev,
                newValue: editValue,
                reason: "agent_edit",
                actor: agentActor(agentSubject),
                evidence: { callSid: editSid },
              });
            }
            const callRow = await prisma.call.findUnique({
              where: { callSid: editSid },
              select: { intakeSession: { select: { configPackageId: true } } },
            });
            const pkg = callRow?.intakeSession?.configPackageId ?? null;
            const scoreResult =
              pkg === "uscis-n400"
                ? computeN400CompletenessScore(fullEntity as Record<string, unknown>)
                : computeCompletenessScore(fullEntity);
            broadcastEntityUpdate(editSid, fullEntity as Record<string, unknown>, {
              overall: scoreResult.overall,
              tier:    scoreResult.tier,
            });
            scheduleDebouncedEntitySnapshot(editSid);
          } catch (e) {
            console.error("[agentHub] field_edit:", e);
          }
        })();
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
