import { EventEmitter } from "events";

/**
 * In-process event bus for call lifecycle events.
 *
 * All services emit and listen here instead of using Redis pub/sub.
 * Phase 2: swap this singleton for a Redis pub/sub client — no other
 * files change.
 *
 * Event contracts:
 *
 *   "utterance"  — { callSid, speaker, text, offsetMs, languageCode, confidence }
 *   "call:ended" — { callSid }
 */
class CallEventEmitter extends EventEmitter {}

export const callEvents = new CallEventEmitter();
callEvents.setMaxListeners(50); // allow multiple services to subscribe per call

// Prevent uncaught 'error' events from crashing the process
callEvents.on("error", (err) => {
  console.error("[callEvents] error:", err);
});
