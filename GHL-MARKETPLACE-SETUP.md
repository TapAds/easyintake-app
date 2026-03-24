# GHL Marketplace App — Setup Guide

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
2. **Scopes** — Select:
   - `contacts.readonly`
   - `contacts.write`
   - `opportunities.readonly`
   - `opportunities.write`
3. **Redirect URLs** — Add:
   - `https://YOUR_APP_DOMAIN/oauth/callback`
   - Example: `https://easyintake-app-production.up.railway.app/oauth/callback`
4. **Client Keys** — Add a key pair → copy **Client ID** and **Client Secret**
5. Add to your deployment (Railway, etc.):
   - `GHL_CLIENT_ID`
   - `GHL_CLIENT_SECRET`

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
- Calls that complete (Twilio) will sync contacts and opportunities to GHL
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
