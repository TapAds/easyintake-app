import { Request, Response, NextFunction } from "express";
import twilio from "twilio";
import { config } from "../../config";

/**
 * Middleware that validates the X-Twilio-Signature header on inbound Twilio
 * webhooks. Rejects with 403 if the signature is invalid.
 *
 * Must be applied BEFORE express.json() / express.urlencoded() parses the body,
 * or the raw body must be preserved. We mount Twilio routes with
 * express.urlencoded() only, which keeps the body as a flat key-value object
 * that Twilio's validator expects.
 */
export function validateTwilioSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // In development without a real Twilio signature, skip validation.
  if (config.nodeEnv === "development" && !req.headers["x-twilio-signature"]) {
    next();
    return;
  }

  const signature = req.headers["x-twilio-signature"] as string;
  // Use request URL (works correctly behind ngrok/proxy with trust proxy)
  const url =
    req.protocol + "://" + req.get("host") + (req.originalUrl || req.url);
  const params = req.body as Record<string, string>;

  const valid = twilio.validateRequest(
    config.twilio.authToken,
    signature,
    url,
    params
  );

  if (!valid) {
    console.warn(
      `[validateSignature] 403 — signature mismatch. ` +
      `url=${url} signature=${signature}`
    );
    res.status(403).json({ error: "Invalid Twilio signature" });
    return;
  }

  next();
}
