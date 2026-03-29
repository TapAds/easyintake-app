# Easy Intake — GoHighLevel App launch action items (ordered)

Complete these **in order** where dependencies apply. For deep detail, use the linked docs.

**Reference docs:** [GHL-MARKETPLACE-SETUP.md](GHL-MARKETPLACE-SETUP.md) · [GHL_INTEGRATION_CHECKLIST.md](GHL_INTEGRATION_CHECKLIST.md) · [RAILWAY-DEPLOY.md](RAILWAY-DEPLOY.md) · [api-contract/WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md)

---

## Phase A — Product, legal, and accounts (before wiring URLs)

1. [ ] **Domain / brand:** Decide public API hostname (e.g. Railway default domain or custom domain) — must be **HTTPS** and stable before OAuth redirect and webhooks.
2. [ ] **Support & compliance (marketplace listing):** Prepare URLs and contacts you will show in the GHL app listing: website, support email, support URL, privacy policy, terms (see [GHL-MARKETPLACE-SETUP.md §4](GHL-MARKETPLACE-SETUP.md)).
3. [ ] **Vendor accounts:** Active subscriptions/logins for **Twilio**, **Deepgram**, **Anthropic**, **Railway** (or your host), **PostgreSQL**, and **GoHighLevel developer** ([marketplace.gohighlevel.com](https://marketplace.gohighlevel.com)).
4. [ ] **Secrets inventory:** Plan generation/storage of `API_JWT_SECRET`, `COTIZARAHORA_WEBHOOK_SECRET` (if used), and GHL client secret — never commit to git.

---

## Phase B — Backend deploy and database

5. [ ] **Source control:** Push `easy-intake-app` to GitHub (or CI source) per [RAILWAY-DEPLOY.md §1](RAILWAY-DEPLOY.md).
6. [ ] **Railway project:** Create project, connect repo, add **PostgreSQL**, reference `DATABASE_URL` on the API service [RAILWAY-DEPLOY.md §2–4](RAILWAY-DEPLOY.md).
7. [ ] **Build:** Configure service root if needed (monorepo: often `apps/api` or root with workspace scripts) [RAILWAY-DEPLOY.md §6](RAILWAY-DEPLOY.md).
8. [ ] **Generate public URL:** Railway **Networking** → domain → set `PUBLIC_BASE_URL` to that origin **with no trailing slash** [RAILWAY-DEPLOY.md §7](RAILWAY-DEPLOY.md).
9. [ ] **Environment variables on API** — set all **required** vars (see § “Master env checklist” below), redeploy.
10. [ ] **Migrations:** Confirm deploy runs `prisma migrate deploy` (Railway `start` in [apps/api/package.json](apps/api/package.json)) or run manually once against production `DATABASE_URL`.
11. [ ] **Smoke test API:** `GET /api/health` (or your health route) on `PUBLIC_BASE_URL`.

---

## Phase C — Create and configure the GHL Marketplace app

12. [ ] **Create app** in GHL → My Apps → name, short description, **512×512 icon** [GHL-MARKETPLACE-SETUP.md §1](GHL-MARKETPLACE-SETUP.md).
13. [ ] **Distribution:** **Target user = Sub-account (Location)** so OAuth returns `locationId` [GHL-MARKETPLACE-SETUP.md §3](GHL-MARKETPLACE-SETUP.md).
14. [ ] **OAuth redirect:** Add exactly: `https://<PUBLIC_BASE_URL>/oauth/callback` [GHL-MARKETPLACE-SETUP.md §2](GHL-MARKETPLACE-SETUP.md).
15. [ ] **Scopes:** Enable at minimum:
    - Contacts (read/write as needed)
    - Opportunities (read/write as needed)
    - **Conversations / outbound messaging** scopes required for `POST /conversations/messages` (SMS, WhatsApp, email) — labels vary; confirm in [GHL Scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes)
    - Optional: email-specific scope if your console separates it
    - **Documents & Contracts / Proposals** (Phase 4): scopes required for `GET /proposals/templates` and `POST /proposals/templates/send` — exact labels are in the current Scopes doc; **re-install** each location after adding scopes [GHL-MARKETPLACE-SETUP.md §2](GHL-MARKETPLACE-SETUP.md).
16. [ ] **Client keys:** Create key pair → copy **Client ID** and **Client Secret** into Railway (`GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`).
17. [ ] **Webhooks:** Set URL to `https://<PUBLIC_BASE_URL>/api/webhooks/ghl` and subscribe to:
    - **`InboundMessage`** — required for Phase 2–3 inbound text + attachments [GHL-MARKETPLACE-SETUP.md §2](GHL-MARKETPLACE-SETUP.md).
    - **Document / contract signed** (or equivalent) — required if you use Phase 4 e-sign; event `type` must match `GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES` (defaults in [GHL_INTEGRATION_CHECKLIST.md §9](GHL_INTEGRATION_CHECKLIST.md)).
18. [ ] **Listing details:** Fill website, support, privacy, terms in the app console [GHL-MARKETPLACE-SETUP.md §4](GHL-MARKETPLACE-SETUP.md).
19. [ ] **Custom page (optional):** Add module URL `https://<PUBLIC_BASE_URL>/ghl/custom?location_id={{location.id}}&user_id={{user.id}}` [GHL-MARKETPLACE-SETUP.md §5](GHL-MARKETPLACE-SETUP.md).

---

## Phase D — Twilio (voice path)

20. [ ] **Phone number:** Purchase/configure **E.164** number; note **Account SID**, **Auth Token**, and number.
21. [ ] **Voice webhook:** Point to `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice`.
22. [ ] **Status callback:** `https://<PUBLIC_BASE_URL>/webhooks/twilio/call-status` [RAILWAY-DEPLOY.md §8](RAILWAY-DEPLOY.md).
23. [ ] **Media stream (automatic):** TwiML uses `wss://<same-host-as-PUBLIC_BASE_URL>/media-stream` — no separate Twilio console field if you use the stock voice handler [apps/api/src/webhooks/twilio/twiml.ts](apps/api/src/webhooks/twilio/twiml.ts); ensure `PUBLIC_BASE_URL` uses the same host Twilio can reach (HTTPS for callbacks, WSS for media).
24. [ ] **Railway env:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — must match what you use for this location’s install (see Phase E).

---

## Phase E — First-location install (OAuth → AgencyConfig)

25. [ ] **Pre-install:** In Railway, `PUBLIC_BASE_URL`, `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, and **same** Twilio vars as in Phase D must be set (OAuth callback validates Twilio for seeding [apps/api/src/webhooks/ghl/oauth.ts](apps/api/src/webhooks/ghl/oauth.ts)).
26. [ ] **Install URL:** From GHL app Auth page → open **Installation URL** in browser; log in as needed.
27. [ ] **Choose sub-account:** Select a **specific Location** (not “All Accounts” / company-only) [GHL-MARKETPLACE-SETUP.md §6](GHL-MARKETPLACE-SETUP.md).
28. [ ] **Authorize** → expect redirect to `/oauth/callback` and **“GHL Connected”**.
29. [ ] **Verify DB:** Confirm `AgencyConfig` row exists with `ghlLocationId`, tokens, and **`twilioPhoneNumber` equal to the Twilio number** that will receive calls for that brand [GHL-MARKETPLACE-SETUP.md §7](GHL-MARKETPLACE-SETUP.md).
30. [ ] **Re-install after scope changes:** Any time you add OAuth scopes in GHL, locations must **re-authorize**.

---

## Phase F — GoHighLevel sub-account product setup

31. [ ] **LeadConnector:** Enable/configure **SMS**, **WhatsApp**, and **email** as you intend; 10DLC / template compliance in GHL [GHL_INTEGRATION_CHECKLIST.md §3](GHL_INTEGRATION_CHECKLIST.md).
32. [ ] **Pipelines (optional):** Copy pipeline and stage IDs; set `GHL_PIPELINE_ID` and `GHL_PIPELINE_STAGE_ID` on the API for opportunity creation on qualified sync [GHL-MARKETPLACE-SETUP.md §7](GHL-MARKETPLACE-SETUP.md).
33. [ ] **Templates (Phase 4):** In GHL **Documents & Contracts**, create or confirm at least one **template** to send for e-sign; note its **template id** for `GHL_DEFAULT_SIGNATURE_TEMPLATE_ID` or `POST /internal/ghl/signature/send` [GHL_INTEGRATION_CHECKLIST.md §9](GHL_INTEGRATION_CHECKLIST.md).
34. [ ] **Follow-up channel:** Set `FOLLOWUP_SMS_PROVIDER` (`auto` recommended: GHL Conversations when `ghlContactId` exists) [GHL_INTEGRATION_CHECKLIST.md §1](GHL_INTEGRATION_CHECKLIST.md).

---

## Phase G — Partner / multi-tenant (if applicable)

35. [ ] **cotizarahora** (or other senders to `/api/webhooks/intake`): Configure `X-Webhook-Secret`, `X-Source: cotizarahora`, and **`X-GHL-Location-Id`** when multiple locations share one API [api-contract/WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md).
36. [ ] **Default location:** If only one `AgencyConfig` exists, or set `GHL_LOCATION_ID` for default routing [GHL_INTEGRATION_CHECKLIST.md §1](GHL_INTEGRATION_CHECKLIST.md).

---

## Phase H — Production hardening

37. [ ] **`GHL_WEBHOOK_VERIFY`:** Use **`strict`** in production so `X-GHL-Signature` / `X-WH-Signature` are verified — do **not** leave `off` [GHL_INTEGRATION_CHECKLIST.md §2](GHL_INTEGRATION_CHECKLIST.md).
38. [ ] **Internal routes:** Restrict `/internal/*` at network layer (firewall / Railway only) — not authenticated as end-user API [GHL_INTEGRATION_CHECKLIST.md §7](GHL_INTEGRATION_CHECKLIST.md).
39. [ ] **Document limits (optional):** Tune `DOCUMENT_MAX_BYTES`, `DOCUMENT_FETCH_TIMEOUT_MS`, `DOCUMENT_MAX_PER_MESSAGE` if needed [GHL_INTEGRATION_CHECKLIST.md §1](GHL_INTEGRATION_CHECKLIST.md).

---

## Phase I — End-to-end verification (go / no-go)

40. [ ] **Webhook delivery:** GHL Webhook Logs show **200** from `/api/webhooks/ghl` for a test event; no persistent **401** (signature) failures.
41. [ ] **Inbound SMS:** Reply or new message updates **`IntakeSession`** (`channels`, `lastInboundChannel`) [GHL_INTEGRATION_CHECKLIST.md §6](GHL_INTEGRATION_CHECKLIST.md).
42. [ ] **Voice call:** Complete a test call → **`LifeInsuranceEntity`** / scores as designed → **GHL contact** (and opportunity if configured) [GHL-MARKETPLACE-SETUP.md §7](GHL-MARKETPLACE-SETUP.md).
43. [ ] **Follow-up:** Poller or `POST /internal/sms/send` sends via expected provider (GHL vs Twilio) [GHL_INTEGRATION_CHECKLIST.md §7](GHL_INTEGRATION_CHECKLIST.md).
44. [ ] **Attachment (Phase 3):** Send **PDF or image** via SMS/WhatsApp/email → **`IntakeAttachment`** rows and merged **fieldValues** / HITL document flag [GHL_INTEGRATION_CHECKLIST.md §8](GHL_INTEGRATION_CHECKLIST.md).
45. [ ] **Signatures (Phase 4):** `GET /internal/ghl/signature/templates?locationId=` → `POST /internal/ghl/signature/send` → recipient signs in GHL → webhook fires → **`SignatureRequest`** becomes `signed` and session **`hitl.pendingApplicantSignature`** clears [GHL_INTEGRATION_CHECKLIST.md §9](GHL_INTEGRATION_CHECKLIST.md).
46. [ ] **Session API:** `GET /api/intake/sessions/:id` (with API auth) returns **attachments** and **`signatureRequests`** summaries [apps/api/src/api/routes/intakeSessions.ts](apps/api/src/api/routes/intakeSessions.ts).

---

## Phase J — Marketplace “public” launch (when listing beyond private testing)

47. [ ] **GHL review:** Submit / publish per current **Marketplace** requirements (screenshots, changelog, category, etc.) — follow GHL’s live checklist for your app type.
48. [ ] **Documentation:** Publish or update customer-facing install guide and support contact.
49. [ ] **Monitor:** Webhook Insights / logs, Railway metrics, and DB growth; plan Redis/queues if webhook volume spikes ([GHL_INTEGRATION_CHECKLIST.md §10](GHL_INTEGRATION_CHECKLIST.md)).

---

## Master environment checklist (API service)

Use this as a copy-paste reference; **required** items must be set before OAuth install and production traffic.

| Order | Variable | Required | Notes |
|------|----------|----------|--------|
| 1 | `DATABASE_URL` | Yes | From Postgres |
| 2 | `PUBLIC_BASE_URL` | Yes | HTTPS, no trailing slash |
| 3 | `API_JWT_SECRET` | Yes | Strong random |
| 4 | `TWILIO_ACCOUNT_SID` | Yes | |
| 5 | `TWILIO_AUTH_TOKEN` | Yes | |
| 6 | `TWILIO_PHONE_NUMBER` | Yes | E.164; must match `AgencyConfig` for that install |
| 7 | `DEEPGRAM_API_KEY` | Yes | Voice STT |
| 8 | `ANTHROPIC_API_KEY` | Yes | Text + document extraction (beta Messages for PDF/image) |
| 9 | `GHL_CLIENT_ID` | Yes | After GHL app created |
| 10 | `GHL_CLIENT_SECRET` | Yes | |
| 11 | `GHL_WEBHOOK_VERIFY` | Prod: strict | `off` only local debug |
| 12 | `FOLLOWUP_SMS_PROVIDER` | Optional | Default `auto` |
| 13 | `GHL_PIPELINE_ID` | Optional | Opportunities |
| 14 | `GHL_PIPELINE_STAGE_ID` | Optional | |
| 15 | `GHL_LOCATION_ID` | Optional | Default GHL sub-account for `/api/webhooks/intake` |
| 16 | `COTIZARAHORA_WEBHOOK_SECRET` | If used | Partner auth |
| 17 | `DOCUMENT_MAX_BYTES` | Optional | Default 5 MB |
| 18 | `DOCUMENT_FETCH_TIMEOUT_MS` | Optional | Default 45 s |
| 19 | `DOCUMENT_MAX_PER_MESSAGE` | Optional | Default 5 |
| 20 | `GHL_DEFAULT_SIGNATURE_TEMPLATE_ID` | Optional | Phase 4 template send default |
| 21 | `GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES` | Optional | Comma list; default `ProposalSigned,DocumentSigned` |
| 22 | `GHL_SIGNATURE_REMINDER_MAX` / `GHL_SIGNATURE_REMINDER_BASE_MINUTES` | Optional | Phase 4 reminder cap / backoff base |
| 23 | `GHL_SIGNATURE_REMINDER_SMS` | Optional | Reminder body; supports `{{firstName}}` |
| 24 | `GHL_SIGNATURE_COMPLETED_STAGE_ID` | Optional | Move opportunity after sign (needs `ghlOpportunityId` on session) |
| 25 | `DEFAULT_ORGANIZATION_ID` | Optional | Voice session seed |
| 26 | `DEFAULT_VERTICAL_ID` | Optional | e.g. `insurance` |
| 27 | `DEFAULT_CONFIG_PACKAGE_ID` | Optional | e.g. `insurance` |

**Not in env:** Per-location GHL access/refresh tokens — created by OAuth into `AgencyConfig`.

---

## Quick reference — URLs to configure

| Purpose | URL |
|--------|-----|
| GHL OAuth redirect | `https://<PUBLIC_BASE_URL>/oauth/callback` |
| GHL webhooks | `https://<PUBLIC_BASE_URL>/api/webhooks/ghl` |
| Twilio voice | `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice` |
| Twilio status | `https://<PUBLIC_BASE_URL>/webhooks/twilio/call-status` |
| Twilio media stream (WebSocket) | `wss://<same host as PUBLIC_BASE_URL>/media-stream` (derived in app from `PUBLIC_BASE_URL`) |
| Custom page (optional) | `https://<PUBLIC_BASE_URL>/ghl/custom?location_id={{location.id}}&user_id={{user.id}}` |
| Agent UI (testing) | `https://<PUBLIC_BASE_URL>/public/agent.html` |

---

## Not in this checklist

Deploying the separate **Next.js agent shell** (`apps/web` on Vercel, **Clerk**, bilingual routes) is **not** required to run the **GHL Marketplace app** + **voice/intake API** on Railway. If you need that product surface live too, follow [apps/web/DEPLOY-PRODUCTION.md](apps/web/DEPLOY-PRODUCTION.md) and keep `API_JWT_SECRET` aligned with the API.

---

*Last updated to reflect Phases 0–4 (including GHL template send, signature webhooks, reminders). Update this file when GHL or your hosting steps change.*
