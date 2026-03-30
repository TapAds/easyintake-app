# Easy Intake — GoHighLevel App launch action items (ordered)

Complete these **in order** where dependencies apply. For deep detail, use the linked docs.

**Reference docs:** [GHL-MARKETPLACE-SETUP.md](GHL-MARKETPLACE-SETUP.md) · [GHL_INTEGRATION_CHECKLIST.md](GHL_INTEGRATION_CHECKLIST.md) · [RAILWAY-DEPLOY.md](RAILWAY-DEPLOY.md) · [api-contract/WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md) · **[Phase J runbook](docs/ghl/PHASE_J_MARKETPLACE_SUBMIT.md)** · **[Customer install guide](docs/ghl/CUSTOMER_INSTALL_GUIDE.md)**

---

## Resolved — do not re-decide unless strategy changes

- **Dashboard / brand (Next.js + Clerk):** Production URL is **`https://app.easyintakeapp.com/`** (EasyAppIntake). See [ARCHITECTURE.md](ARCHITECTURE.md) and [`apps/web/DEPLOY-PRODUCTION.md`](apps/web/DEPLOY-PRODUCTION.md). This hostname is **not** `PUBLIC_BASE_URL`.
- **API / integrations (`PUBLIC_BASE_URL`):** Production custom domain on Railway is **`https://api.easyintakeapp.com`** (no trailing slash). Set Railway **`PUBLIC_BASE_URL`** and Vercel **`NEXT_PUBLIC_API_URL`** to that origin. GHL OAuth, GHL webhooks, Twilio, `/ghl/custom`, and `agent.html` all use this host (the default **`*.up.railway.app`** hostname remains valid but avoid mixing hosts in GHL/Twilio). See [GHL-MARKETPLACE-SETUP.md §2](GHL-MARKETPLACE-SETUP.md).
- **Hosted product demo (docs):** [Live demo](https://app.easyintakeapp.com/en/dashboard/live-demo) and universal voice line **`+1 430-300-3049`** are described in [CONTEXT.md](CONTEXT.md), [RAILWAY-DEPLOY.md](RAILWAY-DEPLOY.md), and [docs/demo/LIVE_CALL_DEMO.md](docs/demo/LIVE_CALL_DEMO.md). If your environment matches that stack, treat **Phase B** and **Phase D** (for that number) as **verify / confirm** rather than greenfield setup—still confirm `PUBLIC_BASE_URL` and Twilio webhooks match the API you run.

---

## Phase A — Product, legal, and accounts (before wiring URLs)

1. [x] **Domain / brand:** **Dashboard:** `https://app.easyintakeapp.com/`. **API (`PUBLIC_BASE_URL`):** **`https://api.easyintakeapp.com`** — verified in Railway Public Networking; ensure **`PUBLIC_BASE_URL`** in Railway variables and integration URLs (GHL, Twilio) use this origin, not only `*.up.railway.app`.
2. [ ] **Support & compliance (marketplace listing):** Prepare URLs and contacts you will show in the GHL app listing: website, support email, support URL, privacy policy, terms (see [GHL-MARKETPLACE-SETUP.md §4](GHL-MARKETPLACE-SETUP.md)).
3. [ ] **Vendor accounts:** Active subscriptions/logins for **Twilio**, **Deepgram**, **Anthropic**, **Railway** (or your host), **PostgreSQL**, and **GoHighLevel developer** ([marketplace.gohighlevel.com](https://marketplace.gohighlevel.com)).
4. [ ] **Secrets inventory:** Plan generation/storage of `API_JWT_SECRET`, `COTIZARAHORA_WEBHOOK_SECRET` (if used), and GHL client secret — never commit to git.

---

## Phase B — Backend deploy and database

_If the API is already deployed and wired to production web (`NEXT_PUBLIC_API_URL`), work through these as **verification** and skip duplication._

5. [ ] **Source control:** Push `easy-intake-app` to GitHub (or CI source) per [RAILWAY-DEPLOY.md §1](RAILWAY-DEPLOY.md).
6. [ ] **Railway project:** Create project, connect repo, add **PostgreSQL**, reference `DATABASE_URL` on the API service [RAILWAY-DEPLOY.md §2–4](RAILWAY-DEPLOY.md).
7. [ ] **Build:** Configure service root if needed (monorepo: often `apps/api` or root with workspace scripts) [RAILWAY-DEPLOY.md §6](RAILWAY-DEPLOY.md).
8. [x] **Public API URL:** Railway **Networking** — custom domain **`api.easyintakeapp.com`** verified; set **`PUBLIC_BASE_URL`** = **`https://api.easyintakeapp.com`** (no trailing slash) [RAILWAY-DEPLOY.md §7](RAILWAY-DEPLOY.md). The default **`*.up.railway.app`** URL can remain for debugging; do not mix origins in GHL or Twilio.
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

_The universal demo line **`+1 430-300-3049`** in repo docs is for the hosted Live demo; agency-specific installs use their own numbers. If demo Twilio is already routed to your production `PUBLIC_BASE_URL`, confirm webhooks below rather than re-purchasing._

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

_**SMS deferral:** You can move ahead **voice-first** and skip **#41** (and follow-up **#43** if it only matters after SMS works) during **private** installs. **Before GHL Marketplace public launch (Phase J)**, complete **#41** (and **#40** for a real **`InboundMessage`**) if your listing or support promises SMS / conversation intake—see **Phase J → Pre-submit confirmation**._

40. [ ] **Webhook delivery:** GHL Webhook Logs show **200** from `/api/webhooks/ghl` for a test event; no persistent **401** (signature) failures.
41. [ ] **Inbound SMS:** Reply or new message updates **`IntakeSession`** (`channels`, `lastInboundChannel`) [GHL_INTEGRATION_CHECKLIST.md §6](GHL_INTEGRATION_CHECKLIST.md). _(Required before public launch if messaging is in scope; see Phase J.)_
42. [ ] **Voice call:** Complete a test call → **`LifeInsuranceEntity`** / scores as designed → **GHL contact** (and opportunity if configured) [GHL-MARKETPLACE-SETUP.md §7](GHL-MARKETPLACE-SETUP.md).
43. [ ] **Follow-up:** Poller or `POST /internal/sms/send` sends via expected provider (GHL vs Twilio) [GHL_INTEGRATION_CHECKLIST.md §7](GHL_INTEGRATION_CHECKLIST.md).
44. [ ] **Attachment (Phase 3):** Send **PDF or image** via SMS/WhatsApp/email → **`IntakeAttachment`** rows and merged **fieldValues** / HITL document flag [GHL_INTEGRATION_CHECKLIST.md §8](GHL_INTEGRATION_CHECKLIST.md).
45. [ ] **Signatures (Phase 4):** `GET /internal/ghl/signature/templates?locationId=` → `POST /internal/ghl/signature/send` → recipient signs in GHL → webhook fires → **`SignatureRequest`** becomes `signed` and session **`hitl.pendingApplicantSignature`** clears [GHL_INTEGRATION_CHECKLIST.md §9](GHL_INTEGRATION_CHECKLIST.md).
46. [ ] **Session API:** `GET /api/intake/sessions/:id` (with API auth) returns **attachments** and **`signatureRequests`** summaries [apps/api/src/api/routes/intakeSessions.ts](apps/api/src/api/routes/intakeSessions.ts).

---

## Phase J — Marketplace “public” launch (when listing beyond private testing)

**Operator runbook (step-by-step + GHL links):** [docs/ghl/PHASE_J_MARKETPLACE_SUBMIT.md](docs/ghl/PHASE_J_MARKETPLACE_SUBMIT.md)

**Pre-submit confirmation**

- [ ] **Loopback test:** Trigger a GHL webhook to **`https://api.easyintakeapp.com/api/webhooks/ghl`** (console test replay and/or a real inbound event); in **Railway → API → Logs**, confirm **200 OK** (no persistent **401** signature failures). Proves production networking after custom domain / `PUBLIC_BASE_URL` cutover; does not replace Phase I product checks. See [docs/ghl/PHASE_J_MARKETPLACE_SUBMIT.md](docs/ghl/PHASE_J_MARKETPLACE_SUBMIT.md).

**(Do not skip the next items if the product includes GHL messaging.)**

- [ ] **Inbound SMS / `InboundMessage`:** From a real phone, send SMS **inbound** to the GHL sub-account’s messaging line; confirm **Phase I #40** shows **200** on `/api/webhooks/ghl` and **Phase I #41** — **`IntakeSession`** updates (`channels`, `lastInboundChannel`) per [GHL_INTEGRATION_CHECKLIST.md §6](GHL_INTEGRATION_CHECKLIST.md).
- [ ] **Voice path** still green after any URL or env changes (Phase I **#42**).
- Optional but recommended before public listing: **#43–#46** if you document those capabilities.

47. [ ] **GHL review / submit:** In [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) → **My Apps**, complete **listing** (icon, descriptions, category, pricing, legal URLs) and any **review artifacts** GHL currently requires (e.g. demo recordings — see [Marketplace review changelog](https://ideas.gohighlevel.com/changelog/marketplace-stronger-app-review-process-for-new-apps)). Submit for **review** / **publication** when the UI allows. *Cannot be done from this repo; you must click through in GHL.*
48. [ ] **Documentation:** Repo source for agencies: [docs/ghl/CUSTOMER_INSTALL_GUIDE.md](docs/ghl/CUSTOMER_INSTALL_GUIDE.md). **Publish** that content (or a link to it) on your **public support** URL used in the Marketplace listing so customers are not sent to GitHub.
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
| Dashboard (Next.js / Clerk — not for GHL OAuth) | `https://app.easyintakeapp.com` — **`NEXT_PUBLIC_API_URL`** = **`https://api.easyintakeapp.com`** |
| Production API (`PUBLIC_BASE_URL`) | `https://api.easyintakeapp.com` |
| GHL OAuth redirect | `https://api.easyintakeapp.com/oauth/callback` (or `https://<PUBLIC_BASE_URL>/oauth/callback`) |
| GHL webhooks | `https://<PUBLIC_BASE_URL>/api/webhooks/ghl` |
| Twilio voice | `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice` |
| Twilio status | `https://<PUBLIC_BASE_URL>/webhooks/twilio/call-status` |
| Twilio media stream (WebSocket) | `wss://<same host as PUBLIC_BASE_URL>/media-stream` (derived in app from `PUBLIC_BASE_URL`) |
| Custom page (optional) | `https://<PUBLIC_BASE_URL>/ghl/custom?location_id={{location.id}}&user_id={{user.id}}` |
| Agent UI (testing) | `https://<PUBLIC_BASE_URL>/public/agent.html` |

---

## Not in this checklist

Deploying the separate **Next.js shell** (`apps/web` on Vercel, **Clerk**, bilingual routes) is **not** required to run the **GHL Marketplace app** + **voice/intake API** on Railway. **It is already the canonical product dashboard** at **`https://app.easyintakeapp.com/`** per [ARCHITECTURE.md](ARCHITECTURE.md). For env and Clerk, use [apps/web/DEPLOY-PRODUCTION.md](apps/web/DEPLOY-PRODUCTION.md) and keep **`API_JWT_SECRET`** aligned with the API.

---

*Last updated: Phase J runbook and customer install guide in `docs/ghl/`. Phase I SMS deferral for private testing; complete Pre-submit confirmation before public listing when messaging is in scope. Production API `api.easyintakeapp.com`; dashboard `app.easyintakeapp.com`.*
