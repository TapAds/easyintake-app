# Deploy to Railway — Simple Steps

**Canonical Railway deployment guide for this repository.** The older duplicate at `docs/DEPLOY-RAILWAY.md` is superseded — use this file.

---

## Step 1: Push Your Code to GitHub

```bash
cd easy-intake-app
git init          # if not already a repo
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

---

## Step 2: Connect Railway to GitHub

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **GitHub Repository**
3. Select your repo → **Deploy Now**
4. Wait for the first build (it may fail — that’s okay for now)

---

## Step 3: Add PostgreSQL

1. In your Railway project, click **+ New**
2. Click **Database** → **PostgreSQL**
3. Wait for it to finish provisioning
4. Click the **Postgres** service → **Variables** tab → copy `DATABASE_URL`

---

## Step 4: Connect Postgres to Your App

1. Click your **app service** (the one from GitHub)
2. Go to **Variables** tab
3. Click **+ New Variable** → **Add a Reference**
4. Select **Postgres** → **DATABASE_URL**
5. Confirm — it will auto-fill when the Postgres URL changes

---

## Step 5: Add All Other Variables

In your app service → **Variables**, add these:

| Variable | Where to get it |
|----------|-----------------|
| `PUBLIC_BASE_URL` | Leave empty for now — add after Step 7 |
| `API_JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio number (e.g. +15551234567) |
| `DEEPGRAM_API_KEY` | Deepgram Console |
| `ANTHROPIC_API_KEY` | Anthropic Console |
| `GHL_CLIENT_ID` | GHL OAuth (Step 9) |
| `GHL_CLIENT_SECRET` | GHL OAuth (Step 9) |
| `COTIZARAHORA_WEBHOOK_SECRET` | Shared secret for intake webhook (cotizarahora) |
| `GHL_LOCATION_ID` | Optional default GHL sub-account for `/api/webhooks/intake` when header omitted |
| `GHL_WEBHOOK_VERIFY` | Optional: `strict` (default) or `off` (local only) |
| `FOLLOWUP_SMS_PROVIDER` | Optional: `auto` (default), `ghl`, or `twilio` |

*GHL access/refresh tokens are obtained via OAuth in Step 9 — do not add them manually.*

---

## Step 6: Root Directory (optional)

- **Leave empty** to build from repo root (uses workspace scripts).
- Or set to `apps/api` to build the API folder directly.

---

## Step 7: Get Your App URL and Set PUBLIC_BASE_URL

1. App service → **Settings** tab
2. Scroll to **Networking** → **Generate Domain** (you get a default `https://*.up.railway.app` URL)
3. **Custom domain (production):** In **Public Networking**, add **`api.yourdomain.com`** (example: **`api.easyintakeapp.com`**), add the CNAME + TXT records your DNS host shows, wait until Railway shows the domain verified (green check).
4. Go to **Variables** → set **`PUBLIC_BASE_URL`** to your **public API origin** with **no trailing slash**:
   - Prefer the custom domain once verified, e.g. `https://api.easyintakeapp.com`
   - Or the generated Railway URL, e.g. `https://easyintake-app-production.up.railway.app`
5. Redeploy: **Deployments** tab → three dots on latest → **Redeploy**

**Plan limit:** Some Railway plans allow only **one** custom domain per service; using **`api.*` on Railway** and **`app.*` on Vercel** (for `apps/web`) avoids needing two custom domains on Railway.

---

## Step 8: Update Twilio

1. [Twilio Console](https://console.twilio.com) → Phone Numbers → your number
2. **Voice URL**: `https://YOUR-RAILWAY-URL/webhooks/twilio/voice`
3. **Status Callback**: `https://YOUR-RAILWAY-URL/webhooks/twilio/call-status`
4. Save

---

## Step 9: GHL OAuth — Connect GoHighLevel

1. **Create OAuth app** in [GHL Marketplace](https://marketplace.gohighlevel.com) → My Apps → Create App (Private is fine).

2. **Auth settings** (Advanced Settings → Auth):
   - **Scopes**: `contacts.*`, `opportunities.*`, plus **Conversations / message** scopes needed for `POST /conversations/messages` (see [GHL-MARKETPLACE-SETUP.md](GHL-MARKETPLACE-SETUP.md)). Re-install after changing scopes.
   - **Redirect URL**: `https://YOUR-RAILWAY-URL/oauth/callback` — click Add
   - **Webhooks**: URL `https://YOUR-RAILWAY-URL/api/webhooks/ghl` (for marketplace events; optional until you subscribe)
   - **Client Keys**: Add a key pair → copy **Client ID** and **Client Secret**

3. **Add to Railway**: `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET` (from step 2)

4. **Install the app**:
   - Copy your app's **Installation URL** from the Auth page (click Show)
   - Open it in a browser → log in to GHL if needed
   - **Select the Location (Sub-Account)** you want to connect
   - Authorize

5. You'll be redirected to `.../oauth/callback`. If it succeeds, you'll see "GHL Connected". AgencyConfig is seeded automatically — **no CLI seed needed**.

**Troubleshooting:** [GHL OAuth 2.0 docs](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/)

---

## Done

Your app is live. Call your Twilio number (from `TWILIO_PHONE_NUMBER`) to test.

**Easy Intake product demo:** the hosted web app uses universal demo voice **`+1 430-300-3049`** with [Live demo](https://app.easyintakeapp.com/en/dashboard/live-demo) (confirm **Product / Form** in the UI, then dial). That number must terminate on the same `apps/api` you deploy if prospects should hit your Railway stack.

- **Agent UI**: `https://api.easyintakeapp.com/public/agent.html` (or your `PUBLIC_BASE_URL` + `/public/agent.html`)
