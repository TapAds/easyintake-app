import crypto from "crypto";

/** Legacy RSA-SHA256 — X-WH-Signature (deprecated by GHL after 2026-07-01). */
const GHL_LEGACY_RSA_PUBLIC_KEY_PEM =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSCFrm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfBcsedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpvuxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKUJ062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXpIocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzNh/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhCHULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJPQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAykT1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==\n" +
  "-----END PUBLIC KEY-----";

/** Ed25519 — X-GHL-Signature (preferred). Source: GHL Webhook Integration Guide. */
const GHL_ED25519_PUBLIC_KEY_PEM =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=\n" +
  "-----END PUBLIC KEY-----";

export interface GhlWebhookVerifyResult {
  ok: boolean;
  reason?: string;
}

function verifyLegacyRsaSha256(rawBodyUtf8: string, signatureB64: string): GhlWebhookVerifyResult {
  if (!signatureB64 || signatureB64 === "N/A") {
    return { ok: false, reason: "no legacy signature" };
  }
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawBodyUtf8);
    verifier.end();
    const ok = verifier.verify(GHL_LEGACY_RSA_PUBLIC_KEY_PEM, signatureB64, "base64");
    return ok ? { ok: true } : { ok: false, reason: "legacy RSA verify failed" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: msg };
  }
}

function verifyEd25519(rawBodyUtf8: string, signatureB64: string): GhlWebhookVerifyResult {
  if (!signatureB64 || signatureB64 === "N/A") {
    return { ok: false, reason: "no Ed25519 signature" };
  }
  try {
    const payloadBuffer = Buffer.from(rawBodyUtf8, "utf8");
    const signatureBuffer = Buffer.from(signatureB64, "base64");
    const ok = crypto.verify(null, payloadBuffer, GHL_ED25519_PUBLIC_KEY_PEM, signatureBuffer);
    return ok ? { ok: true } : { ok: false, reason: "Ed25519 verify failed" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: msg };
  }
}

/**
 * Verifies GoHighLevel marketplace webhook authenticity using official public keys.
 * Pass the **raw** JSON string exactly as received (same bytes GHL signed).
 */
export function verifyGhlMarketplaceWebhook(
  rawBodyUtf8: string,
  headers: Record<string, string | string[] | undefined>
): GhlWebhookVerifyResult {
  const ghlSig =
    (typeof headers["x-ghl-signature"] === "string" ? headers["x-ghl-signature"] : undefined) ??
    (typeof headers["X-GHL-Signature"] === "string" ? headers["X-GHL-Signature"] : undefined);

  const legacySig =
    (typeof headers["x-wh-signature"] === "string" ? headers["x-wh-signature"] : undefined) ??
    (typeof headers["X-WH-Signature"] === "string" ? headers["X-WH-Signature"] : undefined);

  if (typeof ghlSig === "string" && ghlSig.length > 0) {
    return verifyEd25519(rawBodyUtf8, ghlSig);
  }
  if (typeof legacySig === "string" && legacySig.length > 0) {
    return verifyLegacyRsaSha256(rawBodyUtf8, legacySig);
  }
  return { ok: false, reason: "missing X-GHL-Signature and X-WH-Signature" };
}
