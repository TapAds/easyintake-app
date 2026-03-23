import { config } from "../../config";

/**
 * Builds the TwiML XML response for an inbound voice call.
 *
 * Opens a bidirectional Media Stream to this server's /media-stream WebSocket
 * endpoint so Deepgram can receive raw audio in real time.
 *
 * The <Say> element provides a brief pause while the stream connects — Twilio
 * requires at least one verb before <Connect> in some configurations.
 */
export function buildVoiceTwiml(callSid: string): string {
  const streamUrl = `wss://${new URL(config.publicBaseUrl).host}/media-stream`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call.</Say>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="callSid" value="${callSid}" />
    </Stream>
  </Connect>
</Response>`;
}
