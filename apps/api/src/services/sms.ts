import twilio from "twilio";
import { config } from "../config";

// ─── Twilio client ────────────────────────────────────────────────────────────

const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// ─── Template IDs ─────────────────────────────────────────────────────────────

export type SmsTemplateId = "qualified" | "partial" | "gap_reminder";

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
export function getFollowUpSmsBody(
  templateId: SmsTemplateId,
  firstName: string,
  gap?: { fieldLabel: string }
): string {
  return buildSmsBody(templateId, firstName, gap);
}

/** Subject for GHL email follow-up (same scenarios as SMS templates). */
export function getFollowUpEmailSubject(templateId: SmsTemplateId): string {
  switch (templateId) {
    case "qualified":
      return "Thanks for connecting with us";
    case "partial":
      return "Complete your life insurance intake";
    case "gap_reminder":
      return "One detail to finish your quote";
  }
}

/** Plain HTML body for GHL Conversations email channel — no AI copy. */
export function getFollowUpEmailHtml(
  templateId: SmsTemplateId,
  firstName: string,
  gap?: { fieldLabel: string }
): string {
  const text = getFollowUpSmsBody(templateId, firstName, gap);
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p style="font-family:system-ui,sans-serif;font-size:15px;">${escaped.replace(/\n/g, "<br/>")}</p>`;
}

function buildSmsBody(
  templateId: SmsTemplateId,
  firstName: string,
  gap?: { fieldLabel: string }
): string {
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

    case "gap_reminder": {
      const label = gap?.fieldLabel?.trim() || "details";
      return (
        `Hi ${name}, we're almost done with your life insurance quote. ` +
        `Please reply with your ${label} when you can. ` +
        `Reply STOP to opt out.`
      );
    }
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
  firstName: string,
  gap?: { fieldLabel: string }
): Promise<SendSmsResult> {
  const body = getFollowUpSmsBody(templateId, firstName, gap);

  const message = await twilioClient.messages.create({
    body,
    from: config.twilio.phoneNumber,
    to: phone,
  });

  return { sid: message.sid, status: message.status };
}

/** SMS copy for applicant microsite link (no AI — fixed template + URL from server). */
export function getApplicantPortalReminderBody(
  firstName: string,
  portalUrl: string
): string {
  const name = firstName.trim() || "there";
  const url = portalUrl.trim();
  return (
    `Hi ${name}, please complete your application here: ${url}\n` +
    `Reply STOP to opt out.`
  );
}

export async function sendApplicantPortalReminderSms(
  phone: string,
  firstName: string,
  portalUrl: string
): Promise<SendSmsResult> {
  const body = getApplicantPortalReminderBody(firstName, portalUrl);

  const message = await twilioClient.messages.create({
    body,
    from: config.twilio.phoneNumber,
    to: phone,
  });

  return { sid: message.sid, status: message.status };
}
