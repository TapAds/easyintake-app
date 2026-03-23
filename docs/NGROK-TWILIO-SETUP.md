# ngrok + Twilio Setup for Real Calls

Step-by-step guide to route real Twilio phone calls to your local server.

---

## Prerequisites

- Server running locally on port 3001
- Twilio number with Voice capability
- [ngrok](https://ngrok.com/) installed (`brew install ngrok` or download from ngrok.com)

---

## Step 1: Start ngrok

**Terminal 1** (leave running):
```bash
ngrok http 3001
```

You'll see output like:
```
Forwarding   https://abc123-def456.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g. `https://abc123-def456.ngrok-free.app`). No trailing slash.

---

## Step 2: Update .env

In `apps/api/.env`, set:

```
PUBLIC_BASE_URL="https://your-ngrok-subdomain.ngrok-free.app"
```

Replace with your actual ngrok HTTPS URL from Step 1.

---

## Step 3: Restart the Server

Stop the server (Ctrl+C) and restart:

```bash
npm run dev
```

The app now uses your ngrok URL to build the Media Stream WebSocket URL that Twilio will connect to.

---

## Step 4: Configure Twilio Webhooks

1. Go to [Twilio Console](https://console.twilio.com/) → **Phone Numbers** → **Manage** → **Active numbers**
2. Click your phone number
3. Scroll to **Voice Configuration**

**Configure these two fields:**

| Field | Value |
|-------|-------|
| **A call comes in** | Webhook |
| **URL** | `https://YOUR-NGROK-URL/webhooks/twilio/voice` |
| **HTTP** | POST |
| **Status Callback URL** | `https://YOUR-NGROK-URL/webhooks/twilio/call-status` |

Example (replace with your ngrok URL):
- Voice URL: `https://abc123-def456.ngrok-free.app/webhooks/twilio/voice`
- Status Callback: `https://abc123-def456.ngrok-free.app/webhooks/twilio/call-status`

4. Click **Save**

---

## Step 5: Test a Real Call

1. Call your Twilio number from your phone
2. Twilio will hit your voice webhook → your server returns TwiML → Twilio connects Media Stream to Deepgram
3. Speak: e.g. *"Hi, I'm John, 35, California, want 500k term life, non-smoker"*
4. Open the agent UI: `https://YOUR-NGROK-URL/public/agent.html` (or `http://localhost:3001/public/agent.html` if you're on the same machine)
5. Get Token → enter the `callSid` (check server logs for `[voice] inbound call CAxxxx`) → Connect
6. Watch transcript, entities, score, and guidance populate in real time
7. Hang up — Twilio hits status callback → orchestrator flushes data, schedules SMS if eligible

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Call connects but no audio/transcript | Ensure ngrok URL is HTTPS. Check Deepgram API key. |
| 404 on webhooks | Verify URL has no trailing slash. Path is `/webhooks/twilio/voice` |
| ngrok URL changes | Free ngrok URLs change each restart. Update .env and Twilio after every ngrok restart. |
| "Connecting your call" then silence | Media Stream WebSocket may be blocked. Check ngrok logs for WS upgrade. |

---

## ngrok URL Stability

Free ngrok URLs change every time you restart ngrok. For development:
- Update `PUBLIC_BASE_URL` in .env
- Update Twilio webhook URLs
- Restart your server

For production, deploy to a server with a fixed domain and use that as `PUBLIC_BASE_URL`.
