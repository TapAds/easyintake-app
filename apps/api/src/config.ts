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
    locationId: optional("GHL_LOCATION_ID", ""), // Set via OAuth callback or manually
    clientId: optional("GHL_CLIENT_ID", ""),
    clientSecret: optional("GHL_CLIENT_SECRET", ""),
  },
} as const;
