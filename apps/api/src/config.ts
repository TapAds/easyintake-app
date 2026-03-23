/**
 * Loads and validates all required environment variables at startup.
 * Throws immediately if any required var is missing so the process
 * fails fast rather than surfacing errors at runtime.
 */

function require(name: string): string {
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
  publicBaseUrl: require("PUBLIC_BASE_URL"),

  db: {
    url: require("DATABASE_URL"),
  },

  auth: {
    jwtSecret: require("API_JWT_SECRET"),
  },

  twilio: {
    accountSid: require("TWILIO_ACCOUNT_SID"),
    authToken: require("TWILIO_AUTH_TOKEN"),
    phoneNumber: require("TWILIO_PHONE_NUMBER"),
  },

  deepgram: {
    apiKey: require("DEEPGRAM_API_KEY"),
  },

  anthropic: {
    apiKey: require("ANTHROPIC_API_KEY"),
  },

  ghl: {
    locationId: require("GHL_LOCATION_ID"),
    clientId: require("GHL_CLIENT_ID"),
    clientSecret: require("GHL_CLIENT_SECRET"),
  },
} as const;
