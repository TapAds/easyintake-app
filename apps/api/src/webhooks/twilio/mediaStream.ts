import { WebSocket } from "ws";
import { startDeepgramSession } from "../../services/deepgram";
import { callEvents } from "../../lib/callEvents";

interface TwilioMediaMessage {
  event: string;
  sequenceNumber?: string;
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64-encoded mulaw audio
  };
  start?: {
    callSid: string;
    streamSid: string;
    accountSid: string;
    tracks: string[];
    customParameters?: Record<string, string>;
  };
  stop?: {
    callSid: string;
    streamSid: string;
    accountSid: string;
  };
}

/**
 * Handles a Twilio Media Stream WebSocket connection.
 *
 * Twilio sends JSON-framed messages over the WebSocket:
 *   - "connected" — handshake, no callSid yet
 *   - "start"     — stream metadata including callSid
 *   - "media"     — base64 mulaw audio chunk
 *   - "stop"      — call ended
 *
 * Audio chunks are forwarded to the Deepgram session for this call.
 * Deepgram transcripts are emitted on callEvents as "utterance" events.
 */
export function handleMediaStream(ws: WebSocket): void {
  let callSid: string | null = null;
  let deepgramSession: ReturnType<typeof startDeepgramSession> | null = null;

  ws.on("message", (data: Buffer | string) => {
    let msg: TwilioMediaMessage;

    try {
      msg = JSON.parse(data.toString()) as TwilioMediaMessage;
    } catch {
      return; // ignore malformed frames
    }

    switch (msg.event) {
      case "connected":
        console.log("[media-stream] Twilio connected");
        break;

      case "start": {
        callSid =
          msg.start?.customParameters?.callSid ??
          msg.start?.callSid ??
          null;

        if (!callSid) {
          console.error("[media-stream] start event missing callSid");
          ws.close();
          return;
        }

        console.log(`[media-stream] stream started for call ${callSid}`);
        deepgramSession = startDeepgramSession(callSid);
        break;
      }

      case "media": {
        if (!deepgramSession || !msg.media?.payload) return;

        const audioBuffer = Buffer.from(msg.media.payload, "base64");
        deepgramSession.sendAudio(audioBuffer);
        break;
      }

      case "stop": {
        console.log(`[media-stream] stream stopped for call ${callSid}`);
        deepgramSession?.stop();

        if (callSid) {
          callEvents.emit("call:ended", { callSid });
        }

        ws.close();
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => {
    deepgramSession?.stop();
    if (callSid) {
      callEvents.emit("call:ended", { callSid });
    }
  });

  ws.on("error", (err) => {
    console.error(`[media-stream] WebSocket error for call ${callSid}:`, err);
    deepgramSession?.stop();
  });
}
