import type { Prisma } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db/prisma";
import {
  addNoteToContact,
  sendGhlProposalTemplate,
  sendGhlConversationSms,
  sendGhlConversationEmail,
  sendGhlConversationWhatsApp,
  updateGhlOpportunityStage,
} from "./ghl";

function unwrapWebhookPayload(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...body, ...(data as Record<string, unknown>) };
  }
  return body;
}

function deepFindStringByKeys(obj: unknown, keys: Set<string>): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const f = deepFindStringByKeys(item, keys);
      if (f) return f;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (keys.has(k) && typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(o)) {
    const f = deepFindStringByKeys(v, keys);
    if (f) return f;
  }
  return null;
}

const CONTACT_ID_KEYS = new Set(["contactId", "contact_id", "recipientContactId"]);
const DOCUMENT_ID_KEYS = new Set([
  "documentId",
  "document_id",
  "proposalId",
  "proposal_id",
  "contractId",
  "contract_id",
]);

export function isGhlSignatureSignedEvent(eventType: string): boolean {
  return config.signature.signedWebhookTypes.has(eventType);
}

function computeNextReminderAt(reminderCount: number): Date {
  const baseMin = config.signature.reminderBaseMinutes;
  const mult = Math.pow(2, reminderCount);
  return new Date(Date.now() + baseMin * mult * 60 * 1000);
}

async function mergeSessionHitl(sessionId: string, patch: Record<string, boolean>): Promise<void> {
  const session = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { hitl: true },
  });
  const prev = (session?.hitl as Record<string, boolean>) ?? {};
  await prisma.intakeSession.update({
    where: { id: sessionId },
    data: { hitl: { ...prev, ...patch } as object },
  });
}

export async function createSignatureRequestAndSend(params: {
  intakeSessionId?: string | null;
  ghlLocationId: string;
  ghlContactId: string;
  templateId: string;
}): Promise<{ signatureRequestId: string }> {
  const row = await prisma.signatureRequest.create({
    data: {
      intakeSessionId: params.intakeSessionId ?? null,
      ghlLocationId: params.ghlLocationId,
      ghlContactId: params.ghlContactId,
      ghlTemplateId: params.templateId,
      status: "pending_send",
      maxReminders: config.signature.reminderMax,
    },
  });

  try {
    const { documentId } = await sendGhlProposalTemplate(params.ghlLocationId, {
      templateId: params.templateId,
      contactId: params.ghlContactId,
    });

    await prisma.signatureRequest.update({
      where: { id: row.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        ghlDocumentId: documentId,
        nextReminderAt: computeNextReminderAt(0),
      },
    });

    if (params.intakeSessionId) {
      await mergeSessionHitl(params.intakeSessionId, { pendingApplicantSignature: true });
    }

    return { signatureRequestId: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.signatureRequest.update({
      where: { id: row.id },
      data: { status: "failed", lastError: msg.slice(0, 2000) },
    });
    throw err;
  }
}

export async function processGhlSignatureWebhook(
  body: Record<string, unknown>,
  webhookId: string | null
): Promise<void> {
  const p = unwrapWebhookPayload(body);
  const type = typeof p.type === "string" ? p.type : "";
  if (!isGhlSignatureSignedEvent(type)) return;

  const contactId = deepFindStringByKeys(p, CONTACT_ID_KEYS);
  const documentId = deepFindStringByKeys(p, DOCUMENT_ID_KEYS);
  const locationId = typeof p.locationId === "string" ? p.locationId : "";

  if (!contactId) {
    console.warn(`[ghl-signature] webhook type=${type} missing contactId in payload`);
    return;
  }

  const baseWhere: Prisma.SignatureRequestWhereInput = {
    ghlContactId: contactId,
    status: "sent",
  };
  if (locationId) {
    baseWhere.ghlLocationId = locationId;
  }

  if (documentId) {
    baseWhere.OR = [{ ghlDocumentId: documentId }, { ghlDocumentId: null }];
  }

  const row = await prisma.signatureRequest.findFirst({
    where: baseWhere,
    orderBy: { sentAt: "desc" },
  });

  if (!row) {
    console.warn(`[ghl-signature] no open SignatureRequest for contact=${contactId} type=${type}`);
    return;
  }

  const updated = await prisma.signatureRequest.updateMany({
    where: { id: row.id, status: "sent" },
    data: {
      status: "signed",
      signedAt: new Date(),
      signedWebhookId: webhookId ?? null,
      nextReminderAt: null,
    },
  });

  if (updated.count === 0) return;

  try {
    await addNoteToContact(
      contactId,
      "Easy Intake: document / contract signed (automated note).",
      row.ghlLocationId
    );
  } catch (e) {
    console.warn("[ghl-signature] addNoteToContact failed:", e);
  }

  if (row.intakeSessionId) {
    await mergeSessionHitl(row.intakeSessionId, { pendingApplicantSignature: false });

    const stageId = config.signature.completedPipelineStageId.trim();
    if (stageId) {
      const session = await prisma.intakeSession.findUnique({
        where: { id: row.intakeSessionId },
        select: { externalIds: true },
      });
      const ext = (session?.externalIds as Record<string, unknown> | null) ?? {};
      const oppId = typeof ext.ghlOpportunityId === "string" ? ext.ghlOpportunityId : null;
      if (oppId) {
        try {
          await updateGhlOpportunityStage(row.ghlLocationId, oppId, stageId);
        } catch (e) {
          console.warn(`[ghl-signature] opportunity stage update failed opp=${oppId}:`, e);
        }
      }
    }
  }

  console.log(`[ghl-signature] completed id=${row.id} contact=${contactId} webhookType=${type}`);
}

type Sticky = "sms" | "email" | "whatsapp" | "live_chat" | "other" | null;

function getScalarField(fv: Record<string, unknown>, key: string): string | null {
  const v = fv[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object" && "value" in v) {
    const val = (v as { value: unknown }).value;
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function getPhoneFromFieldValues(fv: Record<string, unknown>): string | null {
  for (const key of ["phone", "phoneNumber", "mobile", "mobilePhone"]) {
    const s = getScalarField(fv, key);
    if (s) return s;
  }
  return null;
}

function getEmailFromFieldValues(fv: Record<string, unknown>): string | null {
  return getScalarField(fv, "email");
}

/**
 * Sends one reminder nudge for a sent SignatureRequest (sticky channel when session is linked).
 */
export async function sendOneSignatureReminder(row: {
  id: string;
  ghlLocationId: string;
  ghlContactId: string;
  reminderCount: number;
  maxReminders: number;
  intakeSessionId: string | null;
}): Promise<void> {
  let phone = "";
  let email: string | null = null;
  let firstName = "";
  let sticky: Sticky = null;

  if (row.intakeSessionId) {
    const s = await prisma.intakeSession.findUnique({
      where: { id: row.intakeSessionId },
      select: { fieldValues: true, externalIds: true },
    });
    if (s) {
      const fv = (s.fieldValues as Record<string, unknown>) ?? {};
      phone = getPhoneFromFieldValues(fv) ?? "";
      email = getEmailFromFieldValues(fv);
      firstName = getScalarField(fv, "firstName") ?? "";
      const ext = (s.externalIds as Record<string, unknown> | null) ?? {};
      const ch = ext.lastInboundChannel;
      sticky =
        ch === "sms" || ch === "email" || ch === "whatsapp" || ch === "live_chat" || ch === "other"
          ? ch
          : null;
    }
  }

  const message = config.signature.reminderSms.replace(/\{\{firstName\}\}/gi, firstName || "there");

  if (!phone.trim() && !email?.trim()) {
    await prisma.signatureRequest.update({
      where: { id: row.id },
      data: {
        nextReminderAt: null,
        lastError: "reminder skipped: no phone or email on session for Conversations API",
      },
    });
    return;
  }

  try {
    if (sticky === "email" && email?.trim()) {
      await sendGhlConversationEmail(row.ghlLocationId, {
        contactId: row.ghlContactId,
        subject: "Reminder: signature requested",
        html: `<p>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
        email: email.trim(),
      });
    } else if (sticky === "whatsapp" && phone.trim()) {
      await sendGhlConversationWhatsApp(row.ghlLocationId, {
        contactId: row.ghlContactId,
        phone: phone.trim(),
        message,
      });
    } else if (phone.trim()) {
      await sendGhlConversationSms(row.ghlLocationId, {
        contactId: row.ghlContactId,
        phone: phone.trim(),
        message,
      });
    } else if (email?.trim()) {
      await sendGhlConversationEmail(row.ghlLocationId, {
        contactId: row.ghlContactId,
        subject: "Reminder: signature requested",
        html: `<p>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
        email: email.trim(),
      });
    }

    const nextCount = row.reminderCount + 1;
    const nextAt = nextCount >= row.maxReminders ? null : computeNextReminderAt(nextCount);

    await prisma.signatureRequest.update({
      where: { id: row.id },
      data: {
        reminderCount: nextCount,
        nextReminderAt: nextAt,
        lastError: null,
      },
    });

    console.log(
      `[signature-reminder] sent id=${row.id} count=${nextCount}/${row.maxReminders} ` +
        `channel=${sticky ?? "sms-fallback"}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.signatureRequest.update({
      where: { id: row.id },
      data: { lastError: msg.slice(0, 2000) },
    });
    throw err;
  }
}
