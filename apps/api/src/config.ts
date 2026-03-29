/**
 * Loads and validates all required environment variables at startup.
 * Throws immediately if any required var is missing so the process
 * fails fast rather than surfacing errors at runtime.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(process.env.PORT) || 3001,
  publicBaseUrl: requireEnv("PUBLIC_BASE_URL"),

  db: {
    url: requireEnv("DATABASE_URL"),
  },

  auth: {
    jwtSecret: requireEnv("API_JWT_SECRET"),
  },

  twilio: {
    accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
    authToken: requireEnv("TWILIO_AUTH_TOKEN"),
    phoneNumber: requireEnv("TWILIO_PHONE_NUMBER"),
  },

  deepgram: {
    apiKey: requireEnv("DEEPGRAM_API_KEY"),
  },

  anthropic: {
    apiKey: requireEnv("ANTHROPIC_API_KEY"),
  },

  ghl: {
    locationId: optional("GHL_LOCATION_ID", ""), // Default location for webhooks without X-GHL-Location-Id
    clientId: optional("GHL_CLIENT_ID", ""),
    clientSecret: optional("GHL_CLIENT_SECRET", ""),
    /** strict = require valid X-GHL-Signature / X-WH-Signature; off = skip verify (local dev only) */
    webhookVerify: optional("GHL_WEBHOOK_VERIFY", "strict"),
    /**
     * Phase 6 — GHL custom page iframe. When set, `/ghl/api/*` requires matching
     * query `page_secret` or header `X-EasyIntake-Embed-Secret`. Add the same value to your
     * Custom Page URL in GHL (e.g. `&page_secret=...`). Leave empty for local dev only.
     */
    customPageSecret: optional("GHL_CUSTOM_PAGE_SECRET", ""),
  },

  /** FOLLOWUP_SMS_PROVIDER: auto | ghl | twilio — see followUpPoller */
  followUpSmsProvider: optional("FOLLOWUP_SMS_PROVIDER", "auto"),

  intakeWebhook: {
    secret: optional("COTIZARAHORA_WEBHOOK_SECRET", ""),
  },

  /** Phase 3 — inbound documents from GHL (SMS/WhatsApp/email attachments) */
  documents: {
    maxBytesPerFile: Number(process.env.DOCUMENT_MAX_BYTES) || 5_000_000,
    fetchTimeoutMs: Number(process.env.DOCUMENT_FETCH_TIMEOUT_MS) || 45_000,
    maxPerMessage: Number(process.env.DOCUMENT_MAX_PER_MESSAGE) || 5,
  },

  /** Phase 4 — GHL Documents & Contracts (templates/send, signature webhooks, reminders) */
  signature: {
    reminderMax: Number(process.env.GHL_SIGNATURE_REMINDER_MAX) || 5,
    reminderBaseMinutes: Number(process.env.GHL_SIGNATURE_REMINDER_BASE_MINUTES) || 120,
    defaultTemplateId: optional("GHL_DEFAULT_SIGNATURE_TEMPLATE_ID", ""),
    /** Comma-separated GHL webhook `type` values that mean “document signed” for your app subscription */
    signedWebhookTypes: new Set(
      optional("GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES", "ProposalSigned,DocumentSigned")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
    reminderSms: optional(
      "GHL_SIGNATURE_REMINDER_SMS",
      "Reminder: please complete the signature for your documents. Reply if you need help."
    ),
    /** When set, moves opportunity to this pipeline stage after a matched signature webhook */
    completedPipelineStageId: optional("GHL_SIGNATURE_COMPLETED_STAGE_ID", ""),
  },
} as const;
