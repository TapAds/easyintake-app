#!/usr/bin/env npx tsx
/**
 * Seeds AgencyConfig for GHL sync.
 * Run: npx tsx scripts/seed-agency-config.ts
 *
 * Required env: GHL_LOCATION_ID, GHL_ACCESS_TOKEN, GHL_REFRESH_TOKEN,
 *               TWILIO_ACCOUNT_SID, TWILIO_PHONE_NUMBER
 *
 * GHL token expiry: defaults to 1 hour from now.
 * Use GHL_TOKEN_EXPIRES_AT (ISO string) to override.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ghlLocationId = process.env.GHL_LOCATION_ID;
  const ghlAccessToken = process.env.GHL_ACCESS_TOKEN;
  const ghlRefreshToken = process.env.GHL_REFRESH_TOKEN;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!ghlLocationId || !ghlAccessToken || !ghlRefreshToken) {
    console.error(
      "Missing GHL env vars: GHL_LOCATION_ID, GHL_ACCESS_TOKEN, GHL_REFRESH_TOKEN"
    );
    process.exit(1);
  }

  if (!twilioAccountSid || !twilioPhoneNumber) {
    console.error(
      "Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_PHONE_NUMBER"
    );
    process.exit(1);
  }

  const ghlTokenExpiresAt = process.env.GHL_TOKEN_EXPIRES_AT
    ? new Date(process.env.GHL_TOKEN_EXPIRES_AT)
    : new Date(Date.now() + 60 * 60 * 1000); // +1 hour

  const config = await prisma.agencyConfig.upsert({
    where: { ghlLocationId },
    create: {
      ghlLocationId,
      ghlAccessToken,
      ghlRefreshToken,
      ghlTokenExpiresAt,
      twilioAccountSid,
      twilioPhoneNumber,
    },
    update: {
      ghlAccessToken,
      ghlRefreshToken,
      ghlTokenExpiresAt,
      twilioAccountSid,
      twilioPhoneNumber,
    },
  });

  console.log(`[seed] AgencyConfig upserted for ghlLocationId=${ghlLocationId} (id=${config.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
