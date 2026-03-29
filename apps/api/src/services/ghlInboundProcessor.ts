import type { EntityFieldName } from "../config/fieldStages";
import { prisma } from "../db/prisma";
import { extractEntities } from "./claude";
import { processInboundAttachments } from "./intakeDocumentPipeline";
import { computeCompletenessScore } from "./scoring";
import type { EntityState } from "./stageManager";
import type { InboundCanonicalChannel } from "../types/ghlInbound";
import { isGhlSignatureSignedEvent, processGhlSignatureWebhook } from "./ghlSignature";
import { scheduleGapChaserIfNeeded } from "./smartChaser";

export type { InboundCanonicalChannel } from "../types/ghlInbound";

const DEFAULT_VERTICAL = process.env.DEFAULT_VERTICAL_ID ?? "insurance";
const DEFAULT_PACKAGE = process.env.DEFAULT_CONFIG_PACKAGE_ID ?? "insurance";

/** Organization namespace for GHL-sub-account–scoped intake sessions. */
export function organizationIdForGhlLocation(locationId: string): string {
  return `ghl:${locationId}`;
}

export interface NormalizedGhlInbound {
  locationId: string;
  contactId: string;
  conversationId: string | null;
  messageId: string | null;
  channel: InboundCanonicalChannel;
  rawMessageType: string;
  bodyText: string;
  attachments: unknown[];
  receivedAt: string | null;
}

function unwrapWebhookPayload(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...body, ...(data as Record<string, unknown>) };
  }
  return body;
}

function mapMessageTypeToChannel(messageType: string): InboundCanonicalChannel {
  const t = messageType.toUpperCase();
  if (t === "SMS" || t.includes("SMS")) return "sms";
  if (t === "EMAIL" || t.includes("EMAIL")) return "email";
  if (t.includes("WHATSAPP") || t === "WHATSAPP") return "whatsapp";
  if (t.includes("LIVE_CHAT") || t === "LIVE_CHAT") return "live_chat";
  return "other";
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses HighLevel InboundMessage webhook shape (flat or wrapped in `data`).
 */
export function parseInboundMessagePayload(body: Record<string, unknown>): NormalizedGhlInbound | null {
  const p = unwrapWebhookPayload(body);
  const type = typeof p.type === "string" ? p.type : "";
  if (type !== "InboundMessage") return null;

  const locationId = typeof p.locationId === "string" ? p.locationId : "";
  const contactId = typeof p.contactId === "string" ? p.contactId : "";
  if (!locationId || !contactId) {
    console.warn("[ghl-inbound] missing locationId or contactId");
    return null;
  }

  const messageType = typeof p.messageType === "string" ? p.messageType : "UNKNOWN";
  const channel = mapMessageTypeToChannel(messageType);

  let bodyText = typeof p.body === "string" ? p.body : "";
  if (channel === "email" && bodyText.includes("<")) {
    bodyText = htmlToPlainText(bodyText);
  }

  const conversationId = typeof p.conversationId === "string" ? p.conversationId : null;
  const messageId = typeof p.messageId === "string" ? p.messageId : null;
  const dateAdded = typeof p.dateAdded === "string" ? p.dateAdded : null;
  const attachments = Array.isArray(p.attachments) ? p.attachments : [];

  return {
    locationId,
    contactId,
    conversationId,
    messageId,
    channel,
    rawMessageType: messageType,
    bodyText: bodyText.trim(),
    attachments,
    receivedAt: dateAdded,
  };
}

function fieldValuesToEntityState(fv: Record<string, unknown>): EntityState {
  const out: EntityState = {};
  for (const [k, v] of Object.entries(fv)) {
    if (v && typeof v === "object" && "value" in v) {
      const val = (v as { value: unknown }).value;
      if (val !== undefined && val !== null) {
        (out as Record<string, unknown>)[k] = val;
      }
    }
  }
  return out;
}

function mergeExtractedIntoFieldValues(
  existing: Record<string, unknown>,
  extracted: Partial<Record<EntityFieldName, unknown>>,
  provenanceChannel: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  const now = new Date().toISOString();

  for (const [k, v] of Object.entries(extracted)) {
    if (v === undefined || v === null) continue;
    const prev = out[k];
    const prevVal =
      prev && typeof prev === "object" && prev !== null && "value" in prev
        ? (prev as { value: unknown }).value
        : undefined;
    if (prevVal !== undefined && prevVal !== null && String(prevVal).trim() !== "") {
      continue;
    }
    out[k] = {
      value: v,
      provenance: { source: "ai", channel: provenanceChannel, updatedAt: now },
    };
  }
  return out;
}

/** Resolve intake session for GHL contact (voice + messaging). Exported for GHL embed / Phase 6. */
export async function findIntakeSessionForContact(
  locationId: string,
  contactId: string
): Promise<{ id: string; fieldValues: unknown; channels: unknown; externalIds: unknown } | null> {
  const orgId = organizationIdForGhlLocation(locationId);

  const byExternal = await prisma.intakeSession.findFirst({
    where: {
      organizationId: orgId,
      externalIds: {
        path: ["ghlContactId"],
        equals: contactId,
      },
    },
    select: { id: true, fieldValues: true, channels: true, externalIds: true },
  });
  if (byExternal) return byExternal;

  const byAnyOrg = await prisma.intakeSession.findFirst({
    where: {
      externalIds: {
        path: ["ghlContactId"],
        equals: contactId,
      },
    },
    select: { id: true, fieldValues: true, channels: true, externalIds: true },
  });
  if (byAnyOrg) return byAnyOrg;

  const call = await prisma.call.findFirst({
    where: { ghlContactId: contactId },
    select: { intakeSessionId: true },
  });
  if (call?.intakeSessionId) {
    return prisma.intakeSession.findUnique({
      where: { id: call.intakeSessionId },
      select: { id: true, fieldValues: true, channels: true, externalIds: true },
    });
  }

  return null;
}

/**
 * Handles a verified InboundMessage webhook: session link, channel timeline, optional AI extraction, sticky channel.
 */
export async function processGhlInboundMessage(
  body: Record<string, unknown>
): Promise<void> {
  const inbound = parseInboundMessagePayload(body);
  if (!inbound) return;

  const agency = await prisma.agencyConfig.findUnique({
    where: { ghlLocationId: inbound.locationId },
    select: { ghlLocationId: true },
  });
  if (!agency) {
    console.warn(`[ghl-inbound] no AgencyConfig for location ${inbound.locationId}`);
    return;
  }

  if (inbound.messageId) {
    try {
      await prisma.ghlProcessedInboundMessage.create({
        data: {
          messageId: inbound.messageId,
          locationId: inbound.locationId,
          contactId: inbound.contactId,
        },
      });
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code: string }).code
          : "";
      if (code === "P2002") {
        console.log(`[ghl-inbound] skip duplicate messageId=${inbound.messageId}`);
        return;
      }
      throw err;
    }
  }

  const skipExtractionTypes = new Set(["CALL", "VOICEMAIL"]);
  if (skipExtractionTypes.has(inbound.rawMessageType.toUpperCase())) {
    await appendInboundChannelOnly(inbound);
    return;
  }

  const hasText = inbound.bodyText.length > 0;
  const hasAttachments = inbound.attachments.length > 0;
  if (!hasText && !hasAttachments) {
    await appendInboundChannelOnly(inbound);
    return;
  }

  const orgId = organizationIdForGhlLocation(inbound.locationId);
  let session = await findIntakeSessionForContact(inbound.locationId, inbound.contactId);

  if (!session) {
    session = await prisma.intakeSession.create({
      data: {
        organizationId: orgId,
        verticalId: DEFAULT_VERTICAL,
        configPackageId: DEFAULT_PACKAGE,
        status: "collecting",
        primaryChannel:
          inbound.channel === "email"
            ? "email"
            : inbound.channel === "whatsapp"
              ? "whatsapp"
              : inbound.channel === "live_chat"
                ? "live_chat"
                : "sms",
        completenessScore: 0,
        fieldValues: {},
        channels: [],
        hitl: {},
        externalIds: {
          ghlContactId: inbound.contactId,
          ghlLocationId: inbound.locationId,
          conversationId: inbound.conversationId,
          lastInboundChannel: inbound.channel,
        },
      },
      select: { id: true, fieldValues: true, channels: true, externalIds: true },
    });
    console.log(`[ghl-inbound] created IntakeSession ${session.id} for contact ${inbound.contactId}`);
  }

  const textProvenance =
    inbound.channel === "other" ? "sms" : inbound.channel;

  let mergedFv = (session.fieldValues as Record<string, unknown>) ?? {};

  let extractedText: Partial<Record<EntityFieldName, unknown>> = {};
  if (hasText) {
    try {
      extractedText = await extractEntities(
        [
          {
            speaker: "caller",
            text: inbound.bodyText,
            languageCode: "es",
          },
        ],
        "all"
      );
    } catch (err) {
      console.error("[ghl-inbound] text extraction failed:", err);
    }
    mergedFv = mergeExtractedIntoFieldValues(mergedFv, extractedText, textProvenance);
  }

  let extractedDocs: Partial<Record<EntityFieldName, unknown>> = {};
  if (hasAttachments) {
    try {
      extractedDocs = await processInboundAttachments({
        intakeSessionId: session.id,
        ghlLocationId: inbound.locationId,
        ghlContactId: inbound.contactId,
        ghlMessageId: inbound.messageId,
        inboundChannel: inbound.channel,
        attachments: inbound.attachments,
      });
    } catch (err) {
      console.error("[ghl-inbound] document pipeline failed:", err);
    }
    mergedFv = mergeExtractedIntoFieldValues(mergedFv, extractedDocs, "document");
  }

  const entityState = fieldValuesToEntityState(mergedFv);
  const score = computeCompletenessScore(entityState).overall;

  const prevExt = (session.externalIds as Record<string, unknown>) ?? {};
  const nextExternalIds = {
    ...prevExt,
    ghlContactId: inbound.contactId,
    ghlLocationId: inbound.locationId,
    conversationId: inbound.conversationId ?? prevExt.conversationId,
    lastInboundChannel: inbound.channel,
  };

  const prevChannels = Array.isArray(session.channels) ? [...(session.channels as unknown[])] : [];
  prevChannels.push({
    channel: inbound.channel,
    direction: "inbound",
    bodyPreview: hasText ? inbound.bodyText.slice(0, 500) : "",
    messageId: inbound.messageId,
    conversationId: inbound.conversationId,
    rawMessageType: inbound.rawMessageType,
    at: inbound.receivedAt ?? new Date().toISOString(),
    attachmentCount: inbound.attachments.length,
    documentKeysExtracted: Object.keys(extractedDocs).length,
  });

  const hitl = {
    pendingAgentReview: score < 0.85 && score > 0,
    pendingDocumentApproval: hasAttachments,
    pendingFinalSignOff: false,
    pendingApplicantSignature: false,
  };

  await prisma.intakeSession.update({
    where: { id: session.id },
    data: {
      fieldValues: mergedFv as object,
      channels: prevChannels as object,
      externalIds: nextExternalIds as object,
      completenessScore: score,
      status: score >= 0.7 ? "ready_to_submit" : score >= 0.4 ? "awaiting_hitl" : "collecting",
      hitl: hitl as object,
    },
  });

  const callLink = await prisma.call.findFirst({
    where: { ghlContactId: inbound.contactId, intakeSessionId: null },
    select: { id: true },
  });
  if (callLink) {
    await prisma.call.update({
      where: { id: callLink.id },
      data: { intakeSessionId: session.id },
    });
  }

  console.log(
    `[ghl-inbound] session=${session.id} contact=${inbound.contactId} ` +
      `channel=${inbound.channel} score=${score.toFixed(3)} ` +
      `textKeys=${Object.keys(extractedText).length} docKeys=${Object.keys(extractedDocs).length}`
  );

  void scheduleGapChaserIfNeeded({ intakeSessionId: session.id }).catch((err) => {
    console.error("[smart-chaser] schedule failed:", err);
  });
}

async function appendInboundChannelOnly(inbound: NormalizedGhlInbound): Promise<void> {
  const session =
    (await findIntakeSessionForContact(inbound.locationId, inbound.contactId)) ??
    (await prisma.intakeSession.create({
      data: {
        organizationId: organizationIdForGhlLocation(inbound.locationId),
        verticalId: DEFAULT_VERTICAL,
        configPackageId: DEFAULT_PACKAGE,
        status: "collecting",
        primaryChannel: "voice",
        completenessScore: 0,
        fieldValues: {},
        channels: [],
        hitl: {},
        externalIds: {
          ghlContactId: inbound.contactId,
          ghlLocationId: inbound.locationId,
          conversationId: inbound.conversationId,
          lastInboundChannel: inbound.channel,
        },
      },
      select: { id: true, channels: true, externalIds: true },
    }));

  const prevChannels = Array.isArray(session.channels) ? [...(session.channels as unknown[])] : [];
  prevChannels.push({
    channel: inbound.channel,
    direction: "inbound",
    bodyPreview: inbound.bodyText.slice(0, 200),
    messageId: inbound.messageId,
    rawMessageType: inbound.rawMessageType,
    at: inbound.receivedAt ?? new Date().toISOString(),
    attachmentCount: inbound.attachments.length,
    note: inbound.rawMessageType,
  });

  const prevExt = (session.externalIds as Record<string, unknown>) ?? {};
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: {
      channels: prevChannels as object,
      externalIds: {
        ...prevExt,
        ghlContactId: inbound.contactId,
        ghlLocationId: inbound.locationId,
        conversationId: inbound.conversationId ?? prevExt.conversationId,
        lastInboundChannel: inbound.channel,
      } as object,
    },
  });
}

/**
 * Process any supported GHL webhook types after HTTP receipt.
 */
export async function processGhlWebhookAfterReceipt(body: Record<string, unknown>): Promise<void> {
  const p = unwrapWebhookPayload(body);
  const type = typeof p.type === "string" ? p.type : typeof body.type === "string" ? body.type : "";

  if (isGhlSignatureSignedEvent(type)) {
    const webhookId = typeof body.webhookId === "string" ? body.webhookId : null;
    await processGhlSignatureWebhook(body, webhookId);
    return;
  }

  if (type === "InboundMessage") {
    await processGhlInboundMessage(body);
    return;
  }

  console.log(`[ghl-webhook] async: no handler for type=${type || "unknown"}`);
}
