import twilio from "twilio";
import { config } from "../config";

/**
 * Dials an agent (or hunt group / forwarded PSTN) into an existing Twilio Conference.
 * The inbound caller should already be in `conferenceName` via TwiML from the voice webhook.
 */
export async function dialAgentIntoConference(args: {
  agentE164: string;
  fromAgencyE164: string;
  conferenceName: string;
}): Promise<void> {
  const client = twilio(config.twilio.accountSid, config.twilio.authToken);
  const { conferenceName, agentE164, fromAgencyE164 } = args;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">${conferenceName}</Conference>
  </Dial>
</Response>`;

  await client.calls.create({
    to: agentE164,
    from: fromAgencyE164,
    twiml,
  });
}
