import { config } from "../../config";

function mediaStreamUrl(): string {
  return `wss://${new URL(config.publicBaseUrl).host}/media-stream`;
}

/**
 * Stream-only inbound leg: Connect keeps the call active while audio flows to /media-stream.
 * Use when no agent forward / conference is configured.
 */
export function buildVoiceTwiml(callSid: string): string {
  const streamUrl = mediaStreamUrl();

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

/**
 * Conference + parallel Media Stream (Twilio &lt;Start&gt;&lt;Stream&gt;).
 * Places the caller into `conferenceName` and starts streaming to Deepgram using the
 * inbound CallSid so `/ws/agent` and transcripts stay keyed to the original leg.
 *
 * After returning this TwiML, dial the agent with `dialAgentIntoConference` so
 * PSTN/SIP agents share the same room while Twilio retains the streaming leg.
 */
export function buildVoiceTwimlConferenceWithStream(
  callSid: string,
  conferenceName: string
): string {
  const streamUrl = mediaStreamUrl();

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${streamUrl}" track="both_tracks">
      <Parameter name="callSid" value="${callSid}" />
    </Stream>
  </Start>
  <Say>Connecting your call.</Say>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">${conferenceName}</Conference>
  </Dial>
</Response>`;
}
