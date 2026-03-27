# Live call transcription demo — operator guide

Use this with the **`/[locale]/dashboard/live-demo`** page in `apps/web` and a running **`apps/api`** (e.g. Railway).

---

## Slice 1 — Voice path checklist

1. **Twilio inbound number** — Voice webhook URL: `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice` (POST).
2. **Environment on API** — `PUBLIC_BASE_URL`, `TWILIO_*`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `API_JWT_SECRET` (see repo `SETUP.md`).
3. **Verify** — `GET https://<api>/api/health` (DB) and `GET https://<api>/api/health/voice` (paths + recent `Call` rows from DB, no secrets).
4. **Place a test call** to the Twilio number; confirm a **`Call`** row appears and logs show media stream / utterances.

Forwarding the caller to your cell is a **Twilio configuration** concern (TwiML `Dial`, Studio, or carrier forwarding). The engine’s transcription path is the **media stream** to `/media-stream`; keep that URL reachable from Twilio.

---

## Slices 2–4 — Product UI

- **Connect stream** — Paste a **`callSid`** from the live leg (or pick from **Recent Twilio calls** after refresh). Requires **`NEXT_PUBLIC_API_URL`** in the browser and **`API_JWT_SECRET`** on Vercel matching the API.
- **Carrier / product** — Demo presets filter which insurance fields are highlighted; extraction still uses the full engine entity cache.
- **Twilio list** — Server calls Twilio REST via **`GET /api/operator/twilio/recent-calls`** (JWT); the web app uses a BFF at **`/api/demo/twilio-calls`**.

---

## Slice 5 — Demo script (about 5–10 minutes)

1. Sign in to the app; open **Live demo** in the nav.
2. Confirm **Voice pipeline** shows the expected WebSocket host and engine flags.
3. From a second phone, **call the Twilio number**; keep the call active.
4. Click **Refresh** on recent Twilio calls; **select the row** to fill `callSid`.
5. Click **Connect stream**; speak as the caller; show **transcript** and **application fields** updating.
6. Switch **Carrier / product** to show how the highlighted field set changes (config-driven demo).

### Failure modes (what to say)

| Symptom | Check |
|--------|--------|
| No Twilio rows | API credentials, BFF env, or no recent calls |
| WebSocket error | Wrong `callSid`, ended call, or API URL mismatch |
| No transcript | Media stream not attached to this call; verify TwiML / stream URL |
| Token error | `API_JWT_SECRET` parity between web and API; user signed in |

---

## Security

- Do not expose Twilio secrets in the browser; all Twilio REST calls stay on **`apps/api`** or server-side BFF.
- JWTs in query strings (legacy `agent.html`) can leak in logs; prefer the live demo page flow for screen shares when possible.
