# Deploy Easy Intake to Railway

Step-by-step guide to deploy the API to Railway.

---

## Prerequisites

- GitHub repo with the easy-intake-app code
- Railway account ([railway.app](https://railway.app))
- All API keys (Twilio, Deepgram, Anthropic, GHL) ready

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Connect GitHub and select your repo
4. Railway will detect the Node.js app

---

## Step 2: Add PostgreSQL

1. In your Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway creates a Postgres instance and provides `DATABASE_URL`
4. The variable is automatically linked to your service when you add it (see Step 4)

---

## Step 3: Configure the Service

1. Click your **service** (the app, not the database)
2. Go to **Settings** tab
3. **Root Directory**: Leave empty (repo root) or set to `apps/api` if deploying only the API
4. **Build Command**: `npm run build` (default)
5. **Start Command**: `npm start` (default)
6. **Watch Paths**: `apps/api/**` (optional — redeploy only when API changes)

---

## Step 4: Set Environment Variables

In your service → **Variables** tab, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Auto-set if you linked Postgres | Or paste from Postgres service |
| `PUBLIC_BASE_URL` | `https://YOUR-APP.up.railway.app` | **Use your Railway-generated URL** (no trailing slash) |
| `API_JWT_SECRET` | Random 48+ char string | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TWILIO_ACCOUNT_SID` | From Twilio Console | |
| `TWILIO_AUTH_TOKEN` | From Twilio Console | |
| `TWILIO_PHONE_NUMBER` | E.164 format | |
| `DEEPGRAM_API_KEY` | From Deepgram Console | |
| `ANTHROPIC_API_KEY` | From Anthropic Console | |
| `GHL_LOCATION_ID` | From GoHighLevel | |
| `GHL_CLIENT_ID` | GHL OAuth | |
| `GHL_CLIENT_SECRET` | GHL OAuth | |
| `GHL_ACCESS_TOKEN` | GHL OAuth (seed) | For AgencyConfig seed |
| `GHL_REFRESH_TOKEN` | GHL OAuth (seed) | For AgencyConfig seed |

**Important:** Set `PUBLIC_BASE_URL` **after** the first deploy — Railway assigns a URL like `https://easyintake-production-xxxx.up.railway.app`. Copy it, add to Variables, then trigger a redeploy.

---

## Step 5: Run Migrations & Seed

Migrations run automatically on start (`prisma migrate deploy`).

To seed AgencyConfig, use **Railway CLI**:

```bash
# Install CLI: npm i -g @railway/cli
railway login
railway link   # select your project
cd apps/api
railway run npx tsx scripts/seed-agency-config.ts
```

---

## Step 6: Update Twilio Webhooks

After deploy, your app has a fixed URL. Update Twilio:

1. [Twilio Console](https://console.twilio.com) → Phone Numbers → your number
2. **Voice URL**: `https://YOUR-RAILWAY-URL.up.railway.app/webhooks/twilio/voice`
3. **Status Callback URL**: `https://YOUR-RAILWAY-URL.up.railway.app/webhooks/twilio/call-status`
4. Save

---

## Step 7: Custom Domain (Optional)

1. Railway service → **Settings** → **Domains**
2. Add custom domain: `api.easyintakeapp.com` (or similar)
3. Update DNS per Railway instructions
4. Set `PUBLIC_BASE_URL` to `https://api.easyintakeapp.com`
5. Update Twilio webhooks with the new URL

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Ensure `prisma generate` runs (included in build script) |
| Migrations fail | Check `DATABASE_URL` is set. Run `railway run npx prisma migrate status` |
| 403 on Twilio | Ensure `PUBLIC_BASE_URL` exactly matches Twilio webhook URL (trust proxy is set) |
| WebSocket fails | Railway supports WebSockets; ensure no proxy strips headers |
