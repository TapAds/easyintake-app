# GHL Marketplace App — Setup Guide

**Ordered launch list:** [GHL_APP_LAUNCH_ACTION_ITEMS.md](GHL_APP_LAUNCH_ACTION_ITEMS.md)

Steps to create and configure the Easy Intake app in the GoHighLevel Marketplace. Do this **after** your API is deployed (e.g. on Railway) and `PUBLIC_BASE_URL` is set.

---

## 1. Create the App

1. Go to [GHL Marketplace](https://marketplace.gohighlevel.com) → **My Apps**
2. Click **Create App**
3. Enter:
   - **App Name:** Easy Intake
   - **Short Description:** Turn conversations into structured data. Voice, SMS, and form intake with AI extraction and CRM sync.
   - **App Icon:** Upload a square image (recommended: 512×512 px)
4. Save / Create

---

## 2. Auth Settings (OAuth 2.0)

1. Go to **Advanced Settings** → **Auth** (or the Auth tab)
2. **Scopes** — Select (see [HighLevel Scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes); exact labels match your app console):
   - `contacts.readonly`
   - `contacts.write`
   - `opportunities.readonly`
   - `opportunities.write`
   - **Conversations / outbound messages** — enable scopes required to call `POST /conversations/messages` (e.g. `conversations/message.write` and related, per current docs). Re-install the app after adding scopes.
   - **Email** (optional, for long-form `Email` messages via the same endpoint) — add if your console lists a separate email scope.
   - **Documents & Contracts / Proposals** (Phase 4) — scopes required for `GET /proposals/templates` and `POST /proposals/templates/send` per current docs; re-install after enabling.
3. **Redirect URLs** — Add:
   - `https://YOUR_APP_DOMAIN/oauth/callback`
   - Example: `https://easyintake-app-production.up.railway.app/oauth/callback`
4. **Client Keys** — Add a key pair → copy **Client ID** and **Client Secret**
5. Add to your deployment (Railway, etc.):
   - `GHL_CLIENT_ID`
   - `GHL_CLIENT_SECRET`
6. **Webhooks (Phase 0–2):** In the app’s **Webhooks** / Advanced settings, set the URL to:
   - `https://YOUR_APP_DOMAIN/api/webhooks/ghl`
   - **Subscribe to `InboundMessage`** for SMS/email/WhatsApp (and related) so replies update **`IntakeSession`** and **sticky channel** for follow-ups.
   - **Phase 4:** Subscribe to the webhook event(s) your sub-account emits when a **document or contract is fully signed** (exact names vary; align with `GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES` on the API).
   - The endpoint verifies **`X-GHL-Signature`** (Ed25519) or legacy **`X-WH-Signature`** (RSA) using HighLevel’s published public keys.
   - Operator checklist: [GHL_INTEGRATION_CHECKLIST.md](GHL_INTEGRATION_CHECKLIST.md)
7. Optional env on Railway:
   - `GHL_WEBHOOK_VERIFY` — `strict` (default) or `off` (local testing only; **do not use in production**).
   - `FOLLOWUP_SMS_PROVIDER` — `auto` (default: GHL Conversations when `ghlContactId` exists, else Twilio), `ghl`, or `twilio`.

---

## 3. Distribution Type

- Set **Target User** to **Sub-Account** (Location-level)
- This ensures the token response includes `locationId`, which Easy Intake needs for contact/opportunity sync
- If set to Agency, users may select "All Accounts" and get a `companyId` token without `locationId` — Easy Intake will show "Location Required"

---

## 4. Resources & Support Details

Fill in (visible to Agency Admins):

| Field | Example |
|-------|---------|
| Website | `https://easyappintake.com` |
| Support Email | `support@easyappintake.com` |
| Support Website URL | `https://easyappintake.com/support` |
| Support Phone Number | Optional |
| Privacy Policy | URL to your policy |
| Terms & Conditions | URL to your terms |

---

## 5. Custom Page (Optional — MVP)

Easy Intake includes a simple Custom Page at `/ghl/custom`. To add it:

1. In the app settings, find **Custom Pages** / **Modules**
2. Add a new Custom Page:
   - **Placement:** Left navigation (or contact record tab)
   - **URL:** `https://YOUR_APP_DOMAIN/ghl/custom?location_id={{location.id}}&user_id={{user.id}}`
   - Example: `https://easyintake-app-production.up.railway.app/ghl/custom?location_id={{location.id}}&user_id={{user.id}}`
3. The page:
   - Serves over HTTPS
   - Allows iframe embedding via CSP `frame-ancestors` for GHL domains

---

## 6. Installation

1. From the Auth page, click **Show** next to **Installation URL**
2. Copy the Installation URL
3. Open it in a browser → log in to GHL if needed
4. **Select a Location** (Sub-Account) — do not select "All Accounts"
5. Click **Allow** / **Authorize**
6. You’ll be redirected to `.../oauth/callback`. Success shows: **"GHL Connected"**

---

## 7. Post-Install

- AgencyConfig is seeded with `ghlLocationId`, `ghlAccessToken`, `ghlRefreshToken`
- Calls that complete (Twilio) will sync contacts and opportunities to GHL **for the location that matches this install’s `twilioPhoneNumber`**
- Post-call follow-up SMS uses **GoHighLevel Conversations** when `FOLLOWUP_SMS_PROVIDER` is `auto` and the call has a `ghlContactId` (after sync); otherwise Twilio is used

### Multi-tenant partner webhooks (`/api/webhooks/intake`)

If more than one GHL location is connected to the same API, send **`X-GHL-Location-Id`** on each request (sub-account location id). If exactly one `AgencyConfig` exists, it is used automatically. You can still set `GHL_LOCATION_ID` as a default.

- Optionally set `GHL_PIPELINE_ID` and `GHL_PIPELINE_STAGE_ID` for qualified leads (score ≥ 0.70)

**Get Pipeline IDs:** Settings → Pipelines in the GHL location. Copy the IDs from the table.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Location Required" after OAuth | Select a specific Sub-Account when installing, not Company/All Accounts |
| Token exchange fails | Ensure redirect URL in GHL matches `PUBLIC_BASE_URL/oauth/callback` exactly |
| 401 on GHL API calls | AgencyConfig may be missing — re-run installation flow |
| Opportunity not created | Set `GHL_PIPELINE_ID` and `GHL_PIPELINE_STAGE_ID`; score must be ≥ 0.70 |
