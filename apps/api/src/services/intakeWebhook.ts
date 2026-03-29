import { prisma } from "../db/prisma";
import {
  upsertIntakeContact,
  addNoteToContact,
  createIntakeOpportunity,
  SANDBOX_LEAD_ID,
  IntakeContactPayload,
} from "./ghl";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntakeEvent = "lead.captured" | "quote.completed" | "quote.requested_callback";

export interface IntakeWebhookPayload {
  event: IntakeEvent;
  timestamp: string;
  source: string;
  vertical: string;
  data: {
    lead_id: string;
    quote_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone: string;
    preferred_language?: string;
    zip_code?: string;
    insurance_type?: string;
    quote_amount_monthly?: number;
    quote_amount_annual?: number;
    carrier?: string;
    quote_url?: string;
    preferred_callback_time?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
}

// ─── Idempotency ───────────────────────────────────────────────────────────────

/**
 * For lead.captured: return 409 if we've already processed this lead_id.
 * For quote.*: we update the existing contact; 409 only if it's a true duplicate.
 */
async function checkDuplicate(leadId: string, event: IntakeEvent): Promise<boolean> {
  const existing = await prisma.intakeLead.findUnique({
    where: { leadId },
  });
  if (!existing) return false;
  // lead.captured is the only event that must not be duplicated
  if (event === "lead.captured") return true;
  return false;
}

// ─── Processing ───────────────────────────────────────────────────────────────

function buildContactPayload(data: IntakeWebhookPayload["data"], tags: string[]): IntakeContactPayload {
  const payload: IntakeContactPayload = {
    phone: data.phone,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    postalCode: data.zip_code,
    tags: ["cotizarahora", "insurance", ...tags],
    customFields: [
      { key: "lead_id", field_value: data.lead_id },
      { key: "preferred_language", field_value: data.preferred_language ?? "en" },
      { key: "insurance_type", field_value: data.insurance_type ?? "" },
    ],
  };
  return payload;
}

function buildQuoteNote(data: IntakeWebhookPayload["data"]): string {
  const parts: string[] = [`Quote completed. Insurance: ${data.insurance_type ?? "—"}`];
  if (data.quote_amount_monthly != null) {
    parts.push(`Monthly: $${data.quote_amount_monthly}`);
  }
  if (data.quote_amount_annual != null) {
    parts.push(`Annual: $${data.quote_amount_annual}`);
  }
  if (data.carrier) parts.push(`Carrier: ${data.carrier}`);
  if (data.quote_url) parts.push(`URL: ${data.quote_url}`);
  return parts.join(" | ");
}

/**
 * Processes an intake webhook event. Returns ghlContactId or null for sandbox.
 */
export async function processIntakeEvent(
  event: IntakeEvent,
  data: IntakeWebhookPayload["data"],
  ghlLocationId: string
): Promise<{ ghlContactId: string | null; duplicate: boolean }> {
  const leadId = data.lead_id;
  const isSandbox = leadId === SANDBOX_LEAD_ID;

  const duplicate = await checkDuplicate(leadId, event);
  if (duplicate) {
    return { ghlContactId: null, duplicate: true };
  }

  let ghlContactId: string | null = null;

  if (!isSandbox) {
    const tags: string[] = [];
    if (event === "lead.captured") tags.push("lead");
    if (event === "quote.requested_callback") tags.push("callback-requested");

    const contactPayload = buildContactPayload(data, tags);
    ghlContactId = await upsertIntakeContact(contactPayload, ghlLocationId);
    console.log(`[intake] ${event} lead_id=${leadId} ghlContactId=${ghlContactId}`);

    if (event === "quote.completed" && ghlContactId) {
      const noteBody = buildQuoteNote(data);
      await addNoteToContact(ghlContactId, noteBody, ghlLocationId);
    }

    if (event === "quote.requested_callback" && ghlContactId) {
      const name =
        data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name} — Insurance`
          : `${data.phone} — Insurance`;
      const oppId = await createIntakeOpportunity(
        ghlContactId,
        name,
        data.quote_amount_monthly,
        ghlLocationId
      );
      if (oppId) {
        console.log(`[intake] quote.requested_callback opportunity created id=${oppId}`);
      }
    }
  } else {
    console.log(`[intake] ${event} lead_id=${leadId} SANDBOX — skip GHL sync`);
  }

  await prisma.intakeLead.upsert({
    where: { leadId },
    create: {
      leadId,
      ghlContactId,
      lastEvent: event,
    },
    update: {
      ghlContactId: ghlContactId ?? undefined,
      lastEvent: event,
    },
  });

  return { ghlContactId, duplicate: false };
}
