import axios, { AxiosInstance } from "axios";
import { prisma } from "../db/prisma";
import { config } from "../config";

// ─── GHL API client ───────────────────────────────────────────────────────────

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

/**
 * Returns an Axios instance and locationId for the current GHL AgencyConfig.
 * Refreshes the token first if it expires within 5 minutes.
 */
async function getGhlClient(): Promise<{ client: AxiosInstance; locationId: string }> {
  const agencyConfig = await prisma.agencyConfig.findFirst({
    where: config.ghl.locationId
      ? { ghlLocationId: config.ghl.locationId }
      : undefined, // Single-tenant: use first config if locationId not set
  });

  if (!agencyConfig) {
    throw new Error("[ghl] AgencyConfig not found — run setup to configure GHL credentials");
  }

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  const accessToken =
    agencyConfig.ghlTokenExpiresAt <= fiveMinutesFromNow
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
    expires_in: number; // seconds
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

  console.log(`[ghl] token refreshed, expires ${expiresAt.toISOString()}`);
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

/**
 * Creates or updates a GHL contact for the given phone number.
 * GHL deduplicates by phone automatically on contact lookup.
 * Returns the GHL contact ID.
 */
async function upsertContact(
  client: AxiosInstance,
  locationId: string,
  payload: GhlContactPayload
): Promise<string> {
  // GHL v2 contacts API: POST creates or merges by phone/email
  const response = await client.post<GhlContactResponse>(`/contacts/`, {
    ...payload,
    locationId,
  });

  return response.data.contact.id;
}

/**
 * Adds a note to a GHL contact.
 * Used for intake webhook (e.g. quote details on quote.completed).
 */
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

/**
 * Creates a GHL opportunity for the given contact.
 * The pipeline and stage IDs must be configured in AgencyConfig (Phase 2).
 * For Phase 1, we read them from environment variables.
 */
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

// ─── Main sync function ───────────────────────────────────────────────────────

/**
 * Syncs a completed call to GHL:
 *   - Always upserts a contact (score ≥ 0.40 guaranteed by caller)
 *   - Creates an opportunity only if score ≥ 0.70 (qualified tier)
 *
 * Writes ghlContactId, ghlOpportunityId (if created), and ghlSyncedAt
 * back to the Call record.
 *
 * Errors thrown from this function are caught by callOrchestrator.ts.
 */
export async function syncCallToGhl(callId: string, score: number): Promise<void> {
  // Load call + entity data
  const call = await prisma.call.findUniqueOrThrow({
    where: { id: callId },
    include: { entity: true },
  });

  const entity = call.entity;
  const { client, locationId } = await getGhlClient();

  // ── Contact upsert ─────────────────────────────────────────────────────────
  const contactPayload: GhlContactPayload = {
    firstName:   entity?.firstName  ?? undefined,
    lastName:    entity?.lastName   ?? undefined,
    phone:       call.from,          // E.164 caller number is the reliable identifier
    email:       entity?.email      ?? undefined,
    address1:    entity?.address    ?? undefined,
    city:        entity?.city       ?? undefined,
    state:       entity?.state      ?? undefined,
    postalCode:  entity?.zip        ?? undefined,
    tags:        ["life-insurance", "easy-intake"],
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

  // ── Opportunity (qualified only) ───────────────────────────────────────────
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

/**
 * Upserts a contact from intake webhook data. Used by cotizarahora events.
 */
export async function upsertIntakeContact(
  payload: IntakeContactPayload
): Promise<string> {
  const { client, locationId } = await getGhlClient();
  return upsertContact(client, locationId, payload);
}

/**
 * Adds a note to a contact. Exported for intake webhook.
 */
export async function addNoteToContact(contactId: string, body: string): Promise<void> {
  const { client } = await getGhlClient();
  await addContactNote(client, contactId, body);
}

/**
 * Creates an opportunity for a contact. Exported for intake webhook (quote.requested_callback).
 */
export async function createIntakeOpportunity(
  contactId: string,
  name: string,
  monetaryValue?: number
): Promise<string | null> {
  const pipelineId = process.env.GHL_PIPELINE_ID;
  const pipelineStageId = process.env.GHL_PIPELINE_STAGE_ID;
  if (!pipelineId || !pipelineStageId) {
    console.warn("[ghl] GHL_PIPELINE_ID or GHL_PIPELINE_STAGE_ID not set — skipping opportunity");
    return null;
  }
  const { client, locationId } = await getGhlClient();
  return createOpportunity(client, locationId, {
    name,
    pipelineId,
    pipelineStageId,
    contactId,
    monetaryValue,
  });
}

export { SANDBOX_LEAD_ID };
