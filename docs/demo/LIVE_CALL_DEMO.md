# Live call transcription demo — operator guide

Use this with the **`/[locale]/dashboard/live-demo`** page in `apps/web` (production: [app.easyintakeapp.com/…/live-demo](https://app.easyintakeapp.com/en/dashboard/live-demo)) and a running **`apps/api`** (e.g. Railway).

**Universal product demo number (voice):** **`+1 430-300-3049`**. Prospects and operators use this single number for live demos: choose **Product / Form (demo)** on the Live demo page, then dial this number. That dropdown picks the **vertical config package** (e.g. insurance vs N-400): **Application fields (live)** shows the **full field catalog**, **grouped by section**, and values update as the call is processed.

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

- **Last 4 digits (calling from)** — Enter **four digits**; the UI **refetches** **Recent Twilio calls** via the BFF, then **matches** rows where Twilio’s `from` equals those digits (the API returns **last 4 only** for privacy). If no row matches after a successful fetch, an **error** is shown. If **exactly one** row matches, **Call SID** may auto-fill; if **multiple** rows share the same last 4, pick the correct row’s CTA.
- **Connect to Call for Data Collection** — Per-row primary action (with sparkles in the UI): enabled only when the row matches the last-4 lookup; sets **Call SID** and **opens the agent WebSocket** (same connection behavior as below). **Disconnect** ends the stream.
- **Connect stream** — Optional path: paste a **`callSid`** manually, then **Connect stream**. Requires **`NEXT_PUBLIC_API_URL`** (or equivalent) in the browser and **`API_JWT_SECRET`** on Vercel matching the API.
- **After hang-up** — The demo reloads transcript and fields from the API via **`/api/demo/call-details`** (BFF → `GET /api/calls/:callSid` + transcript). If the status callback is configured, data reappears within a few seconds (retries handle orchestrator lag).
- **Product / Form (demo)** — Selects which vertical catalog (and PDF/extract behavior where applicable). The UI lists **all** catalog fields by section; the realtime engine may still populate a subset per call until extraction fills more keys.
- **Twilio list** — Server calls Twilio REST via **`GET /api/operator/twilio/recent-calls`** (Bearer JWT); the web app uses a BFF at **`/api/demo/twilio-calls`**. **Refresh** still reruns the list without retyping last 4.

**Live call** (`/[locale]/dashboard/live-call`) uses the same component and flow with non-demo labeling.

---

## Slice 5 — Demo script (about 5–10 minutes)

1. Sign in to the app; open **Live demo** in the nav.
2. Confirm **Voice pipeline** shows the expected WebSocket host and engine flags.
3. From a second phone, **call `+1 430-300-3049`** (universal product demo); keep the call active.
4. Enter the **last 4 digits** of the calling number; wait for the list to refresh. If the row appears, click **Connect to Call for Data Collection** on that row (or use **Connect stream** after pasting **Call SID** manually).
5. Speak as the caller; show **transcript** and **application fields** updating. Use **Disconnect** when finished.
6. Switch **Product / Form (demo)** to show how the **sectioned catalog** and labels change for another product line or vertical (config-driven demo).

### Failure modes (what to say)

| Symptom | Check |
|--------|--------|
| No Twilio rows | API credentials, BFF env, or no recent calls |
| “No recent call matches those 4 digits” | Wrong digits, call not in last 10, or refresh needed; confirm `from` last 4 in Twilio vs what you typed |
| WebSocket error | Wrong `callSid`, ended call, or API URL mismatch |
| No transcript | Media stream not attached to this call; verify TwiML / stream URL |
| Data vanishes after hang-up | Confirm **Status Callback** to `/webhooks/twilio/call-status`; check API logs for `[callStatus]` / `[orchestrator]` |
| Token error | `API_JWT_SECRET` parity between web and API; user signed in |

---

## Security

- Do not expose Twilio secrets in the browser; all Twilio REST calls stay on **`apps/api`** or server-side BFF.
- JWTs in query strings (legacy `agent.html`) can leak in logs; prefer the live demo page flow for screen shares when possible.
