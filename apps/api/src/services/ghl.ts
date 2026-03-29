import axios, { AxiosInstance } from "axios";
import { prisma } from "../db/prisma";
import { config } from "../config";

// ─── GHL API client ───────────────────────────────────────────────────────────

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

/** Refresh access token if it expires within this window (30 minutes). */
const TOKEN_REFRESH_BUFFER_MS = 30 * 60 * 1000;

/**
 * Returns an Axios instance authorized for a specific sub-account (location).
 * Refreshes the token if it expires within TOKEN_REFRESH_BUFFER_MS.
 */
export async function getGhlClientForLocation(
  ghlLocationId: string
): Promise<{ client: AxiosInstance; locationId: string }> {
  const agencyConfig = await prisma.agencyConfig.findUnique({
    where: { ghlLocationId },
  });

  if (!agencyConfig) {
    throw new Error(
      `[ghl] No AgencyConfig for GHL location ${ghlLocationId} — install the app for this sub-account`
    );
  }

  const refreshThreshold = new Date(Date.now() + TOKEN_REFRESH_BUFFER_MS);
  const accessToken =
    agencyConfig.ghlTokenExpiresAt <= refreshThreshold
      ? await refreshToken(agencyConfig)
      : agencyConfig.ghlAccessToken;

  const client = axios.create({
    baseURL: GHL_BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
    },
  });

  return { client, locationId: agencyConfig.ghlLocationId };
}

/**
 * Maps the agency Twilio inbound number (Call.to) to the GHL location that owns this install.
 */
export async function resolveGhlLocationIdFromTwilioTo(toE164: string): Promise<string> {
  const agency = await prisma.agencyConfig.findFirst({
    where: { twilioPhoneNumber: toE164 },
    select: { ghlLocationId: true },
  });
  if (!agency) {
    throw new Error(
      `[ghl] No AgencyConfig with twilioPhoneNumber=${toE164} — check OAuth seed or Twilio number`
    );
  }
  return agency.ghlLocationId;
}

/**
 * Resolves GHL location for partner webhooks (e.g. cotizarahora).
 * Order: explicit header > GHL_LOCATION_ID env > exactly one AgencyConfig row.
 */
export async function resolveGhlLocationIdForIntake(explicitLocationId?: string): Promise<string> {
  if (explicitLocationId) {
    const row = await prisma.agencyConfig.findUnique({
      where: { ghlLocationId: explicitLocationId },
      select: { ghlLocationId: true },
    });
    if (!row) {
      throw new Error(`[ghl] X-GHL-Location-Id ${explicitLocationId} has no AgencyConfig`);
    }
    return explicitLocationId;
  }

  if (config.ghl.locationId) {
    const row = await prisma.agencyConfig.findUnique({
      where: { ghlLocationId: config.ghl.locationId },
      select: { ghlLocationId: true },
    });
    if (row) return row.ghlLocationId;
  }

  const all = await prisma.agencyConfig.findMany({ select: { ghlLocationId: true } });
  if (all.length === 1) {
    console.warn("[ghl] intake: using sole AgencyConfig row — set X-GHL-Location-Id for multi-tenant");
    return all[0].ghlLocationId;
  }

  throw new Error(
    "[ghl] Cannot resolve GHL location for intake — pass X-GHL-Location-Id header or set GHL_LOCATION_ID"
  );
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshToken(agencyConfig: {
  ghlRefreshToken: string;
  ghlLocationId: string;
}): Promise<string> {
  if (!config.ghl.clientId || !config.ghl.clientSecret) {
    throw new Error("[ghl] GHL_CLIENT_ID and GHL_CLIENT_SECRET required for token refresh");
  }

  const redirectUri = config.publicBaseUrl
    ? `${config.publicBaseUrl.replace(/\/$/, "")}/oauth/callback`
    : undefined;

  const params: Record<string, string> = {
    client_id: config.ghl.clientId,
    client_secret: config.ghl.clientSecret,
    grant_type: "refresh_token",
    refresh_token: agencyConfig.ghlRefreshToken,
  };
  if (redirectUri) params.redirect_uri = redirectUri;

  const response = await axios.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>("https://services.leadconnectorhq.com/oauth/token", new URLSearchParams(params), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });

  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.agencyConfig.update({
    where: { ghlLocationId: agencyConfig.ghlLocationId },
    data: {
      ghlAccessToken: access_token,
      ghlRefreshToken: refresh_token,
      ghlTokenExpiresAt: expiresAt,
    },
  });

  console.log(`[ghl] token refreshed for ${agencyConfig.ghlLocationId}, expires ${expiresAt.toISOString()}`);
  return access_token;
}

// ─── Contact upsert ───────────────────────────────────────────────────────────

interface GhlContactPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  tags?: string[];
  customFields?: { key: string; field_value: string }[];
}

interface GhlContactResponse {
  contact: { id: string };
}

async function upsertContact(
  client: AxiosInstance,
  locationId: string,
  payload: GhlContactPayload
): Promise<string> {
  const response = await client.post<GhlContactResponse>(`/contacts/`, {
    ...payload,
    locationId,
  });

  return response.data.contact.id;
}

async function addContactNote(
  client: AxiosInstance,
  contactId: string,
  body: string
): Promise<void> {
  await client.post(`/contacts/${contactId}/notes`, { body });
}

// ─── Opportunity create ───────────────────────────────────────────────────────

interface GhlOpportunityPayload {
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  monetaryValue?: number;
}

async function createOpportunity(
  client: AxiosInstance,
  locationId: string,
  payload: GhlOpportunityPayload
): Promise<string> {
  const response = await client.post<{ opportunity: { id: string } }>("/opportunities/", {
    ...payload,
    locationId,
    status: "open",
  });

  return response.data.opportunity.id;
}

// ─── Conversations — outbound SMS (Phase 1) ────────────────────────────────────

export interface SendGhlConversationSmsResult {
  messageId: string | null;
  status: number;
}

/**
 * Sends SMS via GoHighLevel Conversations so the thread appears in the agency inbox.
 * @see https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message
 */
export async function sendGhlConversationSms(
  ghlLocationId: string,
  params: { contactId: string; phone: string; message: string }
): Promise<SendGhlConversationSmsResult> {
  const { client } = await getGhlClientForLocation(ghlLocationId);

  const body: Record<string, string> = {
    type: "SMS",
    contactId: params.contactId,
    phone: params.phone,
    message: params.message,
    locationId: ghlLocationId,
  };

  const response = await client.post<{
    messageId?: string;
    id?: string;
    msg?: { id?: string };
  }>("/conversations/messages", body);

  const data = response.data;
  const messageId = data.messageId ?? data.id ?? data.msg?.id ?? null;
  return { messageId, status: response.status };
}

/**
 * WhatsApp via Conversations API (LC WhatsApp). Confirm `type` with current GHL docs if requests fail.
 */
export async function sendGhlConversationWhatsApp(
  ghlLocationId: string,
  params: { contactId: string; phone: string; message: string }
): Promise<SendGhlConversationSmsResult> {
  const { client } = await getGhlClientForLocation(ghlLocationId);

  const body: Record<string, string> = {
    type: "WhatsApp",
    contactId: params.contactId,
    phone: params.phone,
    message: params.message,
    locationId: ghlLocationId,
  };

  const response = await client.post<{
    messageId?: string;
    id?: string;
  }>("/conversations/messages", body);

  const data = response.data;
  const messageId = data.messageId ?? data.id ?? null;
  return { messageId, status: response.status };
}

/**
 * Sends email via Conversations (long-form). Shape may vary by API version — callers should handle 4xx.
 */
export async function sendGhlConversationEmail(
  ghlLocationId: string,
  params: {
    contactId: string;
    subject: string;
    html: string;
    email?: string;
  }
): Promise<SendGhlConversationSmsResult> {
  const { client } = await getGhlClientForLocation(ghlLocationId);

  const body: Record<string, string> = {
    type: "Email",
    contactId: params.contactId,
    subject: params.subject,
    html: params.html,
    locationId: ghlLocationId,
  };
  if (params.email) body.email = params.email;

  const response = await client.post<{
    messageId?: string;
    id?: string;
  }>("/conversations/messages", body);

  const data = response.data;
  const messageId = data.messageId ?? data.id ?? null;
  return { messageId, status: response.status };
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncCallToGhl(callId: string, score: number): Promise<void> {
  const call = await prisma.call.findUniqueOrThrow({
    where: { id: callId },
    include: { entity: true },
  });

  const ghlLocationId = await resolveGhlLocationIdFromTwilioTo(call.to);
  const { client, locationId } = await getGhlClientForLocation(ghlLocationId);

  const entity = call.entity;
  const contactPayload: GhlContactPayload = {
    firstName: entity?.firstName ?? undefined,
    lastName: entity?.lastName ?? undefined,
    phone: call.from,
    email: entity?.email ?? undefined,
    address1: entity?.address ?? undefined,
    city: entity?.city ?? undefined,
    state: entity?.state ?? undefined,
    postalCode: entity?.zip ?? undefined,
    tags: ["life-insurance", "easy-intake"],
    customFields: buildCustomFields(entity, call.completenessScore),
  };

  const ghlContactId = await upsertContact(client, locationId, contactPayload);
  console.log(`[ghl] ${call.callSid}: contact upserted id=${ghlContactId}`);

  const updateData: {
    ghlContactId: string;
    ghlSyncedAt: Date;
    ghlOpportunityId?: string;
  } = {
    ghlContactId,
    ghlSyncedAt: new Date(),
  };

  if (score >= 0.7) {
    const pipelineId = process.env.GHL_PIPELINE_ID;
    const pipelineStageId = process.env.GHL_PIPELINE_STAGE_ID;

    if (!pipelineId || !pipelineStageId) {
      console.warn(
        `[ghl] ${call.callSid}: GHL_PIPELINE_ID or GHL_PIPELINE_STAGE_ID not set — ` +
          `skipping opportunity creation`
      );
    } else {
      const name =
        entity?.firstName && entity?.lastName
          ? `${entity.firstName} ${entity.lastName} — Life Insurance`
          : `${call.from} — Life Insurance`;

      const opportunityId = await createOpportunity(client, locationId, {
        name,
        pipelineId,
        pipelineStageId,
        contactId: ghlContactId,
        monetaryValue: entity?.coverageAmountDesired ?? undefined,
      });

      console.log(`[ghl] ${call.callSid}: opportunity created id=${opportunityId}`);
      updateData.ghlOpportunityId = opportunityId;
    }
  }

  await prisma.call.update({
    where: { id: callId },
    data: updateData,
  });

  if (call.intakeSessionId) {
    const sess = await prisma.intakeSession.findUnique({
      where: { id: call.intakeSessionId },
      select: { externalIds: true },
    });
    const prevExt =
      sess?.externalIds &&
      typeof sess.externalIds === "object" &&
      !Array.isArray(sess.externalIds)
        ? { ...(sess.externalIds as Record<string, unknown>) }
        : {};
    await prisma.intakeSession.update({
      where: { id: call.intakeSessionId },
      data: {
        externalIds: {
          ...prevExt,
          ghlContactId: updateData.ghlContactId,
          ghlLocationId: locationId,
          ...(updateData.ghlOpportunityId
            ? { ghlOpportunityId: updateData.ghlOpportunityId }
            : {}),
        } as object,
      },
    });
  }
}

// ─── Custom fields helper ─────────────────────────────────────────────────────

type EntityWithOptionalFields = {
  coverageAmountDesired?: number | null;
  productTypeInterest?: string | null;
  tobaccoUse?: boolean | null;
  dateOfBirth?: Date | null;
} | null;

function buildCustomFields(
  entity: EntityWithOptionalFields,
  score: number
): { key: string; field_value: string }[] {
  const fields: { key: string; field_value: string }[] = [
    { key: "completeness_score", field_value: score.toFixed(3) },
  ];

  if (entity?.coverageAmountDesired) {
    fields.push({
      key: "coverage_amount_desired",
      field_value: String(entity.coverageAmountDesired),
    });
  }

  if (entity?.productTypeInterest) {
    fields.push({
      key: "product_type_interest",
      field_value: entity.productTypeInterest,
    });
  }

  if (entity?.tobaccoUse !== null && entity?.tobaccoUse !== undefined) {
    fields.push({
      key: "tobacco_use",
      field_value: entity.tobaccoUse ? "yes" : "no",
    });
  }

  if (entity?.dateOfBirth) {
    fields.push({
      key: "date_of_birth",
      field_value: entity.dateOfBirth.toISOString().slice(0, 10),
    });
  }

  return fields;
}

// ─── Intake webhook (cotizarahora) ───────────────────────────────────────────

const SANDBOX_LEAD_ID = "00000000-0000-0000-0000-000000000001";

export interface IntakeContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  postalCode?: string;
  tags?: string[];
  customFields?: { key: string; field_value: string }[];
}

export async function upsertIntakeContact(
  payload: IntakeContactPayload,
  ghlLocationId: string
): Promise<string> {
  const { client, locationId } = await getGhlClientForLocation(ghlLocationId);
  return upsertContact(client, locationId, payload);
}

export async function addNoteToContact(
  contactId: string,
  body: string,
  ghlLocationId: string
): Promise<void> {
  const { client } = await getGhlClientForLocation(ghlLocationId);
  await addContactNote(client, contactId, body);
}

export async function createIntakeOpportunity(
  contactId: string,
  name: string,
  monetaryValue: number | undefined,
  ghlLocationId: string
): Promise<string | null> {
  const pipelineId = process.env.GHL_PIPELINE_ID;
  const pipelineStageId = process.env.GHL_PIPELINE_STAGE_ID;
  if (!pipelineId || !pipelineStageId) {
    console.warn("[ghl] GHL_PIPELINE_ID or GHL_PIPELINE_STAGE_ID not set — skipping opportunity");
    return null;
  }
  const { client, locationId } = await getGhlClientForLocation(ghlLocationId);
  return createOpportunity(client, locationId, {
    name,
    pipelineId,
    pipelineStageId,
    contactId,
    monetaryValue,
  });
}

// ─── Proposals / documents (Phase 4) ─────────────────────────────────────────

export interface SendGhlProposalTemplateResult {
  documentId: string | null;
  raw: unknown;
}

/**
 * Sends a document/contract template to a contact via GHL Documents & Contracts API.
 * @see https://marketplace.gohighlevel.com/docs/ghl/proposals/send-documents-contracts-template
 */
export async function sendGhlProposalTemplate(
  ghlLocationId: string,
  params: { templateId: string; contactId: string }
): Promise<SendGhlProposalTemplateResult> {
  const { client } = await getGhlClientForLocation(ghlLocationId);

  const bodies: Record<string, unknown>[] = [
    {
      locationId: ghlLocationId,
      templateId: params.templateId,
      contactId: params.contactId,
    },
    {
      locationId: ghlLocationId,
      templateId: params.templateId,
      contactIds: [params.contactId],
    },
  ];

  let lastErr: unknown;
  for (const body of bodies) {
    try {
      const response = await client.post<Record<string, unknown>>("/proposals/templates/send", body);
      const data = response.data;
      const doc =
        (typeof data.document === "object" &&
          data.document !== null &&
          typeof (data.document as { id?: string }).id === "string" &&
          (data.document as { id: string }).id) ||
        null;
      const proposal =
        (typeof data.proposal === "object" &&
          data.proposal !== null &&
          typeof (data.proposal as { id?: string }).id === "string" &&
          (data.proposal as { id: string }).id) ||
        null;
      const documentId =
        (typeof data.documentId === "string" && data.documentId) ||
        (typeof data.id === "string" && data.id) ||
        doc ||
        proposal ||
        null;
      return { documentId, raw: data };
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** @see https://marketplace.gohighlevel.com/docs/ghl/proposals/list-documents-contracts-templates */
export async function listGhlProposalTemplates(ghlLocationId: string): Promise<unknown> {
  const { client } = await getGhlClientForLocation(ghlLocationId);
  const response = await client.get("/proposals/templates", {
    params: { locationId: ghlLocationId },
  });
  return response.data;
}

/**
 * Moves an opportunity to a new stage (e.g. after e-sign completes). Ignores HTTP errors — callers may log.
 */
export async function updateGhlOpportunityStage(
  ghlLocationId: string,
  opportunityId: string,
  pipelineStageId: string
): Promise<void> {
  const { client } = await getGhlClientForLocation(ghlLocationId);
  await client.put(`/opportunities/${opportunityId}`, {
    pipelineStageId,
    locationId: ghlLocationId,
  });
}

export { SANDBOX_LEAD_ID };
