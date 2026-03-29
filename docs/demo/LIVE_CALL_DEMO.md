# Live call transcription demo — operator guide

Use this with the **`/[locale]/dashboard/live-demo`** page in `apps/web` (production: [app.easyintakeapp.com/…/live-demo](https://app.easyintakeapp.com/en/dashboard/live-demo)) and a running **`apps/api`** (e.g. Railway).

**Universal product demo number (voice):** **`+1 430-300-3049`**. Prospects and operators use this single number for live demos: choose **Product / Form (demo)** on the Live demo page, then dial this number. Transcription and field filling follow the selected preset.

---

## Slice 1 — Voice path checklist

1. **Twilio inbound number** — Voice webhook URL: `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice` (POST).
2. **Twilio status callback (required for DB flush)** — On the Twilio phone number (or TwiML App / Studio leg), set **Status Callback URL** to `https://<PUBLIC_BASE_URL>/webhooks/twilio/call-status` (HTTP POST). When a call ends, Twilio invokes this URL; `apps/api` runs `handleCallEnd`, which persists **LifeInsuranceEntity**, **TranscriptSegment** rows, updates **Call**, and syncs **IntakeSession**. If this URL is missing or wrong, the Live Demo will show real-time data during the call but **nothing will be saved** after hang-up.
3. **Environment on API** — `PUBLIC_BASE_URL`, `TWILIO_*`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `API_JWT_SECRET` (see repo `SETUP.md`).
4. **Verify** — `GET https://<api>/api/health` (DB) and `GET https://<api>/api/health/voice` (paths + recent `Call` rows from DB, no secrets).
5. **Place a test call** to **`+1 430-300-3049`** (universal product demo) or your org’s configured Twilio number; confirm a **`Call`** row appears and logs show media stream / utterances.

Forwarding the caller to your cell is a **Twilio configuration** concern (TwiML `Dial`, Studio, or carrier forwarding). The engine’s transcription path is the **media stream** to `/media-stream`; keep that URL reachable from Twilio.

---

## Slices 2–4 — Product UI

- **Connect stream** — Paste a **`callSid`** from the live leg (or pick from **Recent Twilio calls** after refresh). Requires **`NEXT_PUBLIC_API_URL`** in the browser and **`API_JWT_SECRET`** on Vercel matching the API.
- **After hang-up** — The demo reloads transcript and fields from the API via **`/api/demo/call-details`** (BFF → `GET /api/calls/:callSid` + transcript). If the status callback is configured, data reappears within a few seconds (retries handle orchestrator lag).
- **Carrier / product** — Demo presets filter which insurance fields are highlighted; extraction still uses the full engine entity cache.
- **Twilio list** — Server calls Twilio REST via **`GET /api/operator/twilio/recent-calls`** (JWT); the web app uses a BFF at **`/api/demo/twilio-calls`**.

---

## Slice 5 — Demo script (about 5–10 minutes)

1. Sign in to the app; open **Live demo** in the nav.
2. Confirm **Voice pipeline** shows the expected WebSocket host and engine flags.
3. From a second phone, **call `+1 430-300-3049`** (universal product demo); keep the call active.
4. Click **Refresh** on recent Twilio calls; **select the row** to fill `callSid`.
5. Click **Connect stream**; speak as the caller; show **transcript** and **application fields** updating.
6. Switch **Carrier / product** to show how the highlighted field set changes (config-driven demo).

### Failure modes (what to say)

| Symptom | Check |
|--------|--------|
| No Twilio rows | API credentials, BFF env, or no recent calls |
| WebSocket error | Wrong `callSid`, ended call, or API URL mismatch |
| No transcript | Media stream not attached to this call; verify TwiML / stream URL |
| Data vanishes after hang-up | Confirm **Status Callback** to `/webhooks/twilio/call-status`; check API logs for `[callStatus]` / `[orchestrator]` |
| Token error | `API_JWT_SECRET` parity between web and API; user signed in |

---

## Security

- Do not expose Twilio secrets in the browser; all Twilio REST calls stay on **`apps/api`** or server-side BFF.
- JWTs in query strings (legacy `agent.html`) can leak in logs; prefer the live demo page flow for screen shares when possible.
