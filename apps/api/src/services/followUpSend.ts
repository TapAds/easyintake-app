import { config } from "../config";
import {
  sendGhlConversationEmail,
  sendGhlConversationSms,
  sendGhlConversationWhatsApp,
} from "./ghl";
import {
  sendFollowUpSms,
  SmsTemplateId,
  getFollowUpSmsBody,
  getFollowUpEmailSubject,
  getFollowUpEmailHtml,
} from "./sms";

export interface FollowUpDeliveryResult {
  provider: "ghl" | "twilio";
  externalMessageId: string;
}

type StickyChannel = "sms" | "email" | "whatsapp" | "live_chat" | "other" | null;

/**
 * Sends post-call follow-up: GHL Conversations when configured, honoring sticky channel from Phase 2 inbound.
 */
export async function deliverFollowUpSms(params: {
  ghlLocationId: string;
  phone: string;
  ghlContactId: string | null;
  templateId: SmsTemplateId;
  firstName: string;
  /** From IntakeSession.externalIds.lastInboundChannel */
  stickyChannel?: StickyChannel;
  /** For email sticky channel — contact email when known */
  applicantEmail?: string | null;
  /** Template-safe label from FIELD_CONFIG (gap_reminder only) */
  gapFieldLabel?: string;
}): Promise<FollowUpDeliveryResult> {
  const mode = config.followUpSmsProvider.toLowerCase();
  const wantGhl =
    mode === "ghl" || (mode === "auto" && Boolean(params.ghlContactId));
  const forceTwilio = mode === "twilio";

  const sticky = params.stickyChannel ?? null;
  const gapOpt =
    params.templateId === "gap_reminder" && params.gapFieldLabel
      ? { fieldLabel: params.gapFieldLabel }
      : undefined;
  const body = getFollowUpSmsBody(params.templateId, params.firstName, gapOpt);

  if (wantGhl && !forceTwilio && params.ghlContactId) {
    if (sticky === "email" && params.applicantEmail?.trim()) {
      const { messageId } = await sendGhlConversationEmail(params.ghlLocationId, {
        contactId: params.ghlContactId,
        subject: getFollowUpEmailSubject(params.templateId),
        html: getFollowUpEmailHtml(params.templateId, params.firstName, gapOpt),
        email: params.applicantEmail.trim(),
      });
      return {
        provider: "ghl",
        externalMessageId: messageId ?? "unknown",
      };
    }

    if (sticky === "whatsapp") {
      const { messageId } = await sendGhlConversationWhatsApp(params.ghlLocationId, {
        contactId: params.ghlContactId,
        phone: params.phone,
        message: body,
      });
      return {
        provider: "ghl",
        externalMessageId: messageId ?? "unknown",
      };
    }

    const { messageId } = await sendGhlConversationSms(params.ghlLocationId, {
      contactId: params.ghlContactId,
      phone: params.phone,
      message: body,
    });
    return {
      provider: "ghl",
      externalMessageId: messageId ?? "unknown",
    };
  }

  if (mode === "ghl" && !params.ghlContactId) {
    throw new Error("[followUp] FOLLOWUP_SMS_PROVIDER=ghl but call has no ghlContactId — sync to GHL first");
  }

  const twilioResult = await sendFollowUpSms(
    params.phone,
    params.templateId,
    params.firstName,
    gapOpt
  );
  return {
    provider: "twilio",
    externalMessageId: twilioResult.sid,
  };
}
