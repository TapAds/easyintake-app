import { Router, Request, Response } from "express";
import axios from "axios";
import { prisma } from "../../db/prisma";

/**
 * GHL OAuth 2.0 callback — exchanges authorization code for tokens and seeds AgencyConfig.
 *
 * Setup: https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/
 *
 * 1. Create OAuth app in GHL Marketplace → Advanced Settings → Auth
 * 2. Add Redirect URL: https://YOUR-RAILWAY-URL/oauth/callback
 * 3. Add scopes: contacts.readonly contacts.write opportunities.readonly opportunities.write
 * 4. Add GHL_CLIENT_ID, GHL_CLIENT_SECRET, TWILIO_ACCOUNT_SID, TWILIO_PHONE_NUMBER to Railway
 * 5. Visit your GHL app's Installation URL, select location, authorize
 */
export const ghlOauthRouter = Router();

const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

ghlOauthRouter.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;
  const error = req.query.error as string | undefined;

  if (error) {
    console.error(`[ghl-oauth] error from GHL: ${error}`);
    res.status(400).send(renderHtml("OAuth Error", `GHL returned an error: ${error}`));
    return;
  }

  if (!code) {
    res.status(400).send(
      renderHtml(
        "Missing Code",
        "No authorization code received. Visit your GHL app's Installation URL first."
      )
    );
    return;
  }

  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!clientId || !clientSecret) {
    res.status(500).send(
      renderHtml(
        "Configuration Error",
        "GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set in Railway."
      )
    );
    return;
  }

  if (!publicBaseUrl) {
    res.status(500).send(
      renderHtml("Configuration Error", "PUBLIC_BASE_URL must be set in Railway.")
    );
    return;
  }

  if (!twilioAccountSid || !twilioPhoneNumber) {
    res.status(500).send(
      renderHtml(
        "Configuration Error",
        "TWILIO_ACCOUNT_SID and TWILIO_PHONE_NUMBER must be set in Railway."
      )
    );
    return;
  }

  const redirectUri = `${publicBaseUrl.replace(/\/$/, "")}/oauth/callback`;

  try {
    const tokenResponse = await axios.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      locationId?: string;
      userType?: string;
    }>(
      GHL_TOKEN_URL,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        user_type: "Location",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      }
    );

    const { access_token, refresh_token, expires_in, locationId } = tokenResponse.data;

    if (!locationId) {
      console.warn("[ghl-oauth] token response missing locationId, userType may be Company");
    }

    const ghlLocationId = locationId ?? "";
    if (!ghlLocationId) {
      res.status(400).send(
        renderHtml(
          "Location Required",
          "This app needs a Location-level token. When installing, select a Sub-Account (Location), not the Company."
        )
      );
      return;
    }

    const ghlTokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    await prisma.agencyConfig.upsert({
      where: { ghlLocationId },
      create: {
        ghlLocationId,
        ghlAccessToken: access_token,
        ghlRefreshToken: refresh_token,
        ghlTokenExpiresAt,
        twilioAccountSid,
        twilioPhoneNumber,
      },
      update: {
        ghlAccessToken: access_token,
        ghlRefreshToken: refresh_token,
        ghlTokenExpiresAt,
        twilioAccountSid,
        twilioPhoneNumber,
      },
    });

    console.log(`[ghl-oauth] AgencyConfig seeded for locationId=${ghlLocationId}`);

    res.send(
      renderHtml(
        "GHL Connected",
        `AgencyConfig has been seeded for location <code>${ghlLocationId}</code>. Calls can now sync to GoHighLevel.`
      )
    );
  } catch (err) {
    const msg = axios.isAxiosError(err)
      ? err.response?.data?.message ?? err.response?.statusText ?? err.message
      : String(err);
    console.error("[ghl-oauth] token exchange failed:", err);
    res.status(500).send(
      renderHtml("Token Exchange Failed", `Could not exchange code for tokens: ${msg}`)
    );
  }
});

function renderHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:480px;margin:2rem auto;padding:1rem;">
  <h1>${title}</h1>
  <p>${body}</p>
</body>
</html>`;
}
