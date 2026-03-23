import twilio from "twilio";
import { config } from "../config";

// ─── Twilio client ────────────────────────────────────────────────────────────

const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// ─── Template IDs ─────────────────────────────────────────────────────────────

export type SmsTemplateId = "qualified" | "partial";

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Returns the hardcoded SMS body for the given template.
 *
 * Templates are intentionally hardcoded here — AI output MUST NOT reach
 * this function. The two templates cover both post-call scenarios:
 *   "qualified" — score ≥ 0.70, full lead, ready to work
 *   "partial"   — score 0.40–0.69, incomplete intake, invite to continue
 *
 * Opt-out footer is required for TCPA compliance and always appended.
 */
function buildSmsBody(templateId: SmsTemplateId, firstName: string): string {
  const name = firstName.trim() || "there";

  switch (templateId) {
    case "qualified":
      return (
        `Hi ${name}, thanks for speaking with us about life insurance today. ` +
        `We have your information and will be in touch shortly. ` +
        `Reply STOP to opt out.`
      );

    case "partial":
      return (
        `Hi ${name}, thanks for calling about life insurance. ` +
        `We'd love to help you complete your intake — reply here with any questions. ` +
        `Reply STOP to opt out.`
      );
  }
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export interface SendSmsResult {
  sid: string;
  status: string;
}

/**
 * Sends a templated SMS to the given phone number.
 *
 * @param phone      — E.164 recipient phone number
 * @param templateId — "qualified" | "partial" (drives message copy)
 * @param firstName  — applicant first name for personalisation
 *
 * This function accepts ONLY typed template parameters — no raw AI text
 * can reach the Twilio API through this path.
 */
export async function sendFollowUpSms(
  phone: string,
  templateId: SmsTemplateId,
  firstName: string
): Promise<SendSmsResult> {
  const body = buildSmsBody(templateId, firstName);

  const message = await twilioClient.messages.create({
    body,
    from: config.twilio.phoneNumber,
    to: phone,
  });

  return { sid: message.sid, status: message.status };
}
