# GoHighLevel + Easy Intake — Your integration checklist

Use this list to confirm **webhooks, OAuth scopes, environment variables, and sub-account settings** are aligned after deploying **Phase 0–4** (including **inbound documents** and **GHL template / e-sign**). Keep it with your runbook; update it when GHL changes API or scope names.

---

## 1. Railway (or host) — environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL for Prisma |
| `PUBLIC_BASE_URL` | Yes | HTTPS base, no trailing slash (OAuth redirect, Twilio callbacks, webhook URL) |
| `API_JWT_SECRET` | Yes | API / WebSocket JWT |
| `TWILIO_ACCOUNT_SID` | Yes | Voice + optional SMS fallback |
| `TWILIO_AUTH_TOKEN` | Yes | |
| `TWILIO_PHONE_NUMBER` | Yes | E.164 — must match `AgencyConfig.twilioPhoneNumber` for the location that owns this number |
| `DEEPGRAM_API_KEY` | Yes | Live transcription |
| `ANTHROPIC_API_KEY` | Yes | Extraction (voice, inbound text Phase 2, **PDF/images Phase 3** via Claude beta Messages) |
| `DOCUMENT_MAX_BYTES` | Optional | Per-file cap when fetching GHL attachments (default `5000000`) |
| `DOCUMENT_FETCH_TIMEOUT_MS` | Optional | Download timeout (default `45000`) |
| `DOCUMENT_MAX_PER_MESSAGE` | Optional | Max attachments processed per inbound message (default `5`, GHL limit) |
| `GHL_CLIENT_ID` | Yes* | Marketplace OAuth client id |
| `GHL_CLIENT_SECRET` | Yes* | |
| `GHL_WEBHOOK_VERIFY` | Optional | `strict` (default) or `off` — **local debugging only** |
| `FOLLOWUP_SMS_PROVIDER` | Optional | `auto` (default), `ghl`, or `twilio` |
| `GHL_PIPELINE_ID` | Optional | Opportunity creation (qualified calls / intake) |
| `GHL_PIPELINE_STAGE_ID` | Optional | |
| `GHL_LOCATION_ID` | Optional | Default GHL sub-account for `/api/webhooks/intake` when `X-GHL-Location-Id` is omitted |
| `COTIZARAHORA_WEBHOOK_SECRET` | If using cotizarahora | Validates partner webhook |
| `DEFAULT_ORGANIZATION_ID` | Optional | Voice session seed (see §6) |
| `DEFAULT_VERTICAL_ID` | Optional | Default `insurance` |
| `DEFAULT_CONFIG_PACKAGE_ID` | Optional | Default `insurance` |
| `GHL_DEFAULT_SIGNATURE_TEMPLATE_ID` | Optional | Phase 4 default template id for `/internal/ghl/signature/send` |
| `GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES` | Optional | Comma-separated GHL webhook `type` values treated as signed (defaults: `ProposalSigned`, `DocumentSigned`) |
| `GHL_SIGNATURE_REMINDER_MAX` | Optional | Max reminder nudges (default `5`) |
| `GHL_SIGNATURE_REMINDER_BASE_MINUTES` | Optional | First reminder delay in minutes; backoff doubles each time (default `120`) |
| `GHL_SIGNATURE_REMINDER_SMS` | Optional | Reminder message; `{{firstName}}` placeholder |
| `GHL_SIGNATURE_COMPLETED_STAGE_ID` | Optional | Pipeline stage id after sign (requires `ghlOpportunityId` on session `externalIds`) |

\*Tokens are obtained via install URL — not stored in env long-term.

**After code deploy:** run DB migrations (`prisma migrate deploy` — Railway `start` script may already do this).

---

## 2. GoHighLevel Marketplace app (developer console)

### OAuth

- [ ] **Redirect URL:** `https://<PUBLIC_BASE_URL>/oauth/callback` (exact match)
- [ ] **Target user:** Sub-account (Location), not company-only, so `.locationId` is present on tokens
- [ ] **Scopes** (confirm names in [Scopes doc](https://marketplace.gohighlevel.com/docs/Authorization/Scopes)):
  - Contacts read/write
  - Opportunities read/write
  - **Conversations / outbound messages** — required for `POST /conversations/messages` (SMS, WhatsApp, Email)
- [ ] After changing scopes: **re-install** the app on each test location (users re-authorize)

### Webhooks (Phase 0–2)

- [ ] **Webhook URL:** `https://<PUBLIC_BASE_URL>/api/webhooks/ghl`
- [ ] **Subscribe** to at least:
  - **`InboundMessage`** — Phase 2 inbound SMS / Email / WhatsApp (and metadata for calls/voicemail)
  - Add other event types later (e.g. opportunity, document approval) as you build features
- [ ] Your endpoint verifies **`X-GHL-Signature`** (preferred) or **`X-WH-Signature`** (legacy); production must not set `GHL_WEBHOOK_VERIFY=off`

### Custom page (optional)

- [ ] Iframe URL: `https://<PUBLIC_BASE_URL>/ghl/custom?location_id={{location.id}}&user_id={{user.id}}`

---

## 3. Per sub-account (GHL location) — product configuration

For **each** location that installs Easy Intake:

- [ ] Complete **OAuth install** so `AgencyConfig` row exists with `ghlLocationId`, tokens, and **Twilio number** used for that brand
- [ ] **LeadConnector:** SMS / WhatsApp / Email enabled as you intend; templates and compliance (10DLC, etc.) in GHL
- [ ] **Pipelines:** set `GHL_PIPELINE_ID` / `GHL_PIPELINE_STAGE_ID` on the API if you want opportunities from qualified calls / flows

---

## 4. Twilio (voice)

- [ ] **Voice webhook:** `https://<PUBLIC_BASE_URL>/webhooks/twilio/voice`
- [ ] **Status callback:** `https://<PUBLIC_BASE_URL>/webhooks/twilio/call-status`
- [ ] Inbound **To** number matches the number stored on `AgencyConfig` for that GHL install (used to resolve `ghlLocationId` for sync and follow-up)

---

## 5. Partner webhook — `/api/webhooks/intake` (cotizarahora)

- [ ] Sender sends `X-Webhook-Secret`, `X-Source: cotizarahora`
- [ ] **Multi-tenant:** send `X-GHL-Location-Id` when more than one GHL location shares one API deployment; otherwise set `GHL_LOCATION_ID` or ensure only one `AgencyConfig` row exists
- [ ] Contract: [api-contract/WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md)

---

## 6. Phase 2 behavior (sanity checks)

- [ ] Inbound **SMS/Email** (non-call) creates or updates an **`IntakeSession`**, appends to `channels`, sets `externalIds.lastInboundChannel` for **sticky follow-up**
- [ ] **`GhlProcessedInboundMessage`** dedupes by GHL `messageId` when present
- [ ] Post-call **follow-up** uses **email** if last inbound was email and `entity.email` is present; **WhatsApp** if last inbound was WhatsApp (API `type` may need confirmation in your GHL environment)
- [ ] Voice end sync **merges** `externalIds` (does not wipe `ghlContactId` set by SMS)
- [ ] After **`syncCallToGhl`**, linked **`IntakeSession`** gets `ghlContactId` + `ghlLocationId` on `externalIds` when `Call.intakeSessionId` is set

**Note:** Voice-created sessions still default `organizationId` from `DEFAULT_ORGANIZATION_ID`; GHL-native sessions use `ghl:<locationId>`. Lookup by `ghlContactId` in `externalIds` works across both once `ghlContactId` is written.

---

## 7. Optional internal / debugging endpoints

| Endpoint | Auth | Notes |
|----------|------|--------|
| `POST /internal/ghl/sync/:callSid` | Network trust | Re-run GHL contact sync |
| `POST /internal/sms/send` | Network trust | Trigger follow-up using same routing as poller |
| `POST /internal/ghl/signature/send` | Network trust | Send a GHL proposal/template to a contact; starts reminder schedule |
| `GET /internal/ghl/signature/templates?locationId=` | Network trust | List document templates for a sub-account |

---

## 8. Phase 3 — Documents (SMS / WhatsApp / email attachments)

- [ ] **`InboundMessage` webhook** includes `attachments` (URLs or objects with `url`) for MMS, WhatsApp media, and email attachments.
- [ ] **Supported types** today: `application/pdf`, `image/jpeg`, `image/png`, `image/gif`, `image/webp`. Other MIME types are stored as **`skipped`** in [`IntakeAttachment`](apps/api/prisma/schema.prisma) with a note.
- [ ] **Download auth:** LC/GHL-hosted URLs retry with the location’s **Bearer token** (see [`intakeAttachmentFetch.ts`](apps/api/src/services/intakeAttachmentFetch.ts)).
- [ ] **Extraction:** [`extractEntitiesFromDocument`](apps/api/src/services/claude.ts) uses **`client.beta.messages`** so **PDF + images** share one path; same V2 JSON → field merge as voice/text.
- [ ] **Audit:** Rows in `IntakeAttachment` (`extracted`, `failed`, `skipped`); session `hitl.pendingDocumentApproval` stays **true** when any attachment is present (agent review).
- [ ] **API:** `GET /api/intake/sessions/:id` returns a summarized **`attachments`** list (truncated `sourceUrl`).

## 9. Phase 4 — GHL documents / templates / e-sign

- [ ] **OAuth scopes:** Marketplace app includes **Documents & Contracts** (or equivalent proposal/template scopes per [GHL Scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes)); locations **re-authorize** after scope changes.
- [ ] **Webhooks:** Subscribe to the events GHL emits when a document is **fully signed** (exact `type` strings vary). Set `GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES` as a comma-separated list if defaults (`ProposalSigned`, `DocumentSigned`) do not match your logs.
- [ ] **Send:** `POST /internal/ghl/signature/send` with `intakeSessionId` (uses `externalIds.ghlLocationId` / `ghlContactId`) **or** explicit `locationId` + `contactId`, plus `templateId` or **`GHL_DEFAULT_SIGNATURE_TEMPLATE_ID`**. List templates: `GET /internal/ghl/signature/templates?locationId=`.
- [ ] **Reminders:** Exponential backoff from **`GHL_SIGNATURE_REMINDER_BASE_MINUTES`** (default 120), max **`GHL_SIGNATURE_REMINDER_MAX`** nudges; body from **`GHL_SIGNATURE_REMINDER_SMS`** (`{{firstName}}` supported). Uses **sticky channel** from the session when linked (same Conversations paths as follow-up).
- [ ] **Completion:** Matching webhook updates [`SignatureRequest`](apps/api/prisma/schema.prisma) to `signed`, clears `hitl.pendingApplicantSignature`, adds a **contact note**, optionally moves **`IntakeSession.externalIds.ghlOpportunityId`** to **`GHL_SIGNATURE_COMPLETED_STAGE_ID`** when that env and opportunity id are set (opportunity id is stored on the session when voice sync creates one — see [`ghl.ts` `syncCallToGhl`](apps/api/src/services/ghl.ts)).
- [ ] **API:** `GET /api/intake/sessions/:id` includes a **`signatureRequests`** summary.

## 10. Known follow-ups / risks

- **Inbound payloads:** If GHL wraps events differently (`data` nesting), parsing is centralized in [`apps/api/src/services/ghlInboundProcessor.ts`](apps/api/src/services/ghlInboundProcessor.ts) — adjust if the live payload differs from docs.
- **WhatsApp / Email API shapes:** Confirm `type` and body fields for `/conversations/messages` for your API version; 400 responses may require small payload tweaks in [`apps/api/src/services/ghl.ts`](apps/api/src/services/ghl.ts).
- **Webhook receipt before async work:** Duplicate `webhookId` deliveries are suppressed; if async processing throws, remediate via logs/replay (no automatic GHL retry on 200).
- **Anthropic beta PDFs:** If beta Messages fail in your account/region, check model + beta access; fallback would be a third-party PDF-to-text step (not implemented here).
- **HEIC / Office docs:** Not extracted in v1; appear as `skipped` until you add converters or new model support.
- **Signed webhook payloads:** [`processGhlSignatureWebhook`](apps/api/src/services/ghlSignature.ts) resolves `contactId` / document ids by scanning nested JSON; confirm against **Webhook Logs** and adjust keys or `GHL_WEBHOOK_SIGNATURE_SIGNED_TYPES` if needed.

---

## 11. Quick verification sequence

1. Deploy API; migrations applied; `PUBLIC_BASE_URL` correct.
2. GHL app: webhook URL + **InboundMessage** enabled; OAuth scopes include conversations send.
3. Install app on a test location; confirm `AgencyConfig` row.
4. Send inbound SMS to the location; confirm new/updated `IntakeSession` and `channels` in DB.
5. Complete a voice call; confirm GHL contact + optional opportunity; optional: follow-up via GHL thread.
6. With `GHL_WEBHOOK_VERIFY=off` locally only, POST a sample `InboundMessage` JSON to `/api/webhooks/ghl` to test parsing (production should use real signatures).
7. Phase 4: `GET /internal/ghl/signature/templates?locationId=` then `POST /internal/ghl/signature/send` with a test template; after signing in GHL, confirm webhook updates `SignatureRequest` and session `hitl.pendingApplicantSignature`.
