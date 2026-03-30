# Easy Intake App — Live MVP Setup

Step-by-step setup to get a working end-to-end flow: call → extraction → CRM sync → follow-up SMS.

---

## Prerequisites

- Node 18+
- PostgreSQL
- ngrok (for local dev — Twilio needs a public HTTPS URL)

---

## 1. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://user:pass@localhost:5432/easyintake` |
| `PUBLIC_BASE_URL` | **ngrok HTTPS URL** (e.g. `https://abc123.ngrok-free.app`) — required for Twilio Media Stream |
| `API_JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | Your Twilio number (E.164, e.g. `+15551234567`) |
| `DEEPGRAM_API_KEY` | [Deepgram Console](https://console.deepgram.com/) → API Keys |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |
| `GHL_LOCATION_ID` | GoHighLevel location ID |
| `GHL_CLIENT_ID` | GHL OAuth app credentials |
| `GHL_CLIENT_SECRET` | GHL OAuth app credentials |
| `GHL_PIPELINE_ID` | (Optional) GHL pipeline for qualified leads |
| `GHL_PIPELINE_STAGE_ID` | (Optional) GHL pipeline stage |

---

## 2. Database

```bash
cd apps/api
npx prisma migrate deploy
# or for fresh dev: npx prisma migrate dev
```

---

## 3. Deepgram

1. Sign up at [deepgram.com](https://deepgram.com/)
2. Create an API key at [console.deepgram.com](https://console.deepgram.com/)
3. Add `DEEPGRAM_API_KEY` to `.env`

No webhook setup required — the API uses Deepgram’s live transcription WebSocket from our server.

---

## 4. Twilio Webhooks

1. In [Twilio Console](https://console.twilio.com/) → Phone Numbers → your number
2. Under **Voice Configuration**:
   - **A call comes in**: Webhook, `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice`, HTTP POST
   - **Primary handler fails**: (optional) leave default
3. Under **Status Callback URL**: `https://<PUBLIC_BASE_URL>/webhooks/twilio/call-status` (required for end-of-call handling)

Replace `<PUBLIC_BASE_URL>` with your ngrok URL (no trailing slash).

---

## 5. GoHighLevel (AgencyConfig)

The app needs an `AgencyConfig` row to sync contacts. Seed it:

```bash
cd apps/api
npx tsx scripts/seed-agency-config.ts
```

Or run the equivalent SQL/Prisma. Required fields: `ghlLocationId`, `ghlAccessToken`, `ghlRefreshToken`, `ghlTokenExpiresAt`, `twilioAccountSid`, `twilioPhoneNumber`. Use env vars `GHL_LOCATION_ID`, `GHL_ACCESS_TOKEN`, `GHL_REFRESH_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_PHONE_NUMBER` for the seed script.

**GHL OAuth:** If you don’t have GHL tokens yet, you’ll need to complete the GHL OAuth flow. The seed script uses `GHL_ACCESS_TOKEN` and `GHL_REFRESH_TOKEN` from env (one-time setup).

---

## 6. Run the App

**Terminal 1 — ngrok:**
```bash
ngrok http 3001
```
Use the HTTPS URL as `PUBLIC_BASE_URL` in `.env`. Restart the app after starting ngrok.

**Terminal 2 — server:**
```bash
npm run dev
```

---

## 7. Agent UI (Optional for MVP)

To see real-time transcript, entities, and guidance during a call:

1. Open `http://localhost:3001/public/agent.html` (or `https://<ngrok>/public/agent.html`)
2. Click **Get Token** to fetch a JWT
3. Enter a `callSid` from an active call (check logs when someone calls), then click **Connect**

Without the agent UI, extraction still runs and populates the entity cache for end-of-call processing (GHL sync, SMS).

---

## 8. Test the Flow

**Hosted product demo:** [Live demo](https://app.easyintakeapp.com/en/dashboard/live-demo) — universal demo line **`+1 430-300-3049`**: pick **Product / Form (demo)** in the UI, then place the call from a second phone; the **Application** column lists the full catalog **by section** for that package.

1. **Start a call** — Call your Twilio number (local/dev) or the demo line above (production demo). Twilio connects to the Media Stream; Deepgram transcribes; extraction runs on each utterance.
2. **Speak sample intake** — e.g. *"Hi, I'm John, 35, California, want 500k term life, 20 years, non-smoker."*
3. **Hang up** — Twilio hits status callback; orchestrator flushes entity, computes score, syncs to GHL (if score ≥ 0.4), schedules SMS (if consent + score ≥ 0.4).
4. **Verify** — Check GHL for the contact; wait ~30 min or trigger poller for SMS.

**Test without a live call:**
```bash
# 1. Create a test call
curl -X POST http://localhost:3001/internal/test/call

# 2. Use the returned callSid with simulated utterances
curl -X POST http://localhost:3001/internal/test/utterance \
  -H "Content-Type: application/json" \
  -d '{"callSid":"CA_test_XXXXX","text":"I am John Smith, 35 years old, California, want 500k term life"}'
```
Open the agent UI, get a token, enter the callSid, and Connect to see real-time extraction.

---

## 9. Web app (`apps/web`) — optional local run

The Next.js front end lives in **`apps/web`** (Clerk + next-intl). It depends on the workspace package **`@easy-intake/shared`**. If `packages/shared/dist` is missing, build shared first:

```bash
# from easy-intake-app (monorepo root)
npm run build:shared
npm run dev:web
```

Open e.g. `http://localhost:3000/en`. For Clerk, configure **`apps/web/.env.local`** (see [`apps/web/.env.local.example`](apps/web/.env.local.example)). **Production** deploy notes: [`apps/web/DEPLOY-PRODUCTION.md`](apps/web/DEPLOY-PRODUCTION.md).

---

## Checklist

- [ ] `.env` filled (all required vars)
- [ ] Database migrated
- [ ] Deepgram API key added
- [ ] Twilio voice + status callback URLs set to ngrok
- [ ] AgencyConfig seeded
- [ ] ngrok running
- [ ] `npm run dev` running
- [ ] Test call completed
