# Easy Intake App — Product Context

> **Core objective:** Turn any conversation (call, SMS, form, WhatsApp) into structured, actionable data that drives business outcomes automatically.

Easy Intake is a **horizontal data intake engine**. It is NOT an insurance app, form builder, or CRM. It sits in front of those systems: it ingests input, extracts structure via AI, orchestrates by stage/completeness, and triggers downstream actions (CRM sync, SMS, workflows).

---

## Stack

| Package | Tech |
|---------|------|
| **apps/api** | Express + TypeScript + Prisma + WebSockets. Twilio (calls), Deepgram (transcription), Claude (AI extraction), GHL webhooks |
| **apps/web** | Next.js 14 App Router, Clerk auth, next-intl (en/es), Tailwind (primary: #2563EB) |
| **packages/shared** | Shared TypeScript types |
| **easy-intake-site** | Static marketing site |

---

## Architecture

- **Vertical-agnostic intake platform** — Field schemas are config-driven per vertical
- **apps/api** owns all real-time processing
- **apps/web** owns agent UI and applicant microsite
- Communication: REST and WebSockets between api and web

---

## Auth (Clerk)

- **Roles:** super_admin, org:admin, org:member, applicant
- **JWT claims:** role, org_id, org_role

---

## Current Verticals

- **Insurance** — `src/domain/insurance/`

---

## What This Product Does

1. **Ingestion** — Captures input from any channel. Today: Twilio voice → Deepgram. Future: WhatsApp, SMS, forms, live in-app conversations, video platforms. All feed into the same pipeline.
2. **Intelligence** — AI extraction (Claude), field validation, missing-data detection, agent guidance.
3. **Orchestration** — Stage management (quote vs application), completeness scoring, decision logic.
4. **Action** — CRM sync (GoHighLevel), follow-up SMS, future: tasks, workflows, other CRMs.

**Mental model:** Messy conversation → clean structured record → next action executed automatically.

---

## Product Principles

- **Live MVP ASAP.** No separate demo flow—the full product IS the demo. Ship real, production-ready functionality; when it works end-to-end, that’s the pitch.
- **No mock or demo-only paths.** Every flow we build should be part of the actual product.

---

## Product Boundaries

- **In scope:** Intake pipeline, extraction, scoring, guidance, CRM sync, follow-up jobs. Designed to embed in GHL, other CRMs, phone systems (Five9, Dialpad), and app marketplaces.
- **Out of scope:** Quote engine (Phase 2), policy issuance, payments, billing. CotizarAhora is the insurance vertical that uses this engine.

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo, single API app** | `apps/api` is the sole service; Express + Prisma + WebSockets. |
| **Event-driven flow** | `callEvents` (utterance, stage:transition, call:ended) fans out to agentHub, callOrchestrator, deepgram. |
| **In-memory entity cache** | StageManager holds live extraction state per call; flushed to DB only at call end. |
| **Compliance before output** | Agent guidance is filtered by `compliance.ts`; AI text never reaches SMS/CRM directly—only approved templates. |
| **GHL as first CRM** | `ghl.ts` is isolated; multi-CRM will be an abstraction layer, not a rewrite. |
| **Extraction V2** | `extraction_v2.ts` + `extractionTransform.ts` is the live path; `entityExtraction.ts` is legacy. |
| **Multi-channel ingestion** | Each source (Twilio, WhatsApp, live, etc.) is an adapter: receives audio → normalizes to stream → Deepgram → `callEvents`. Downstream pipeline is channel-agnostic. |

---

## Ingestion Channels (Current + Planned)

| Channel | Status | Audio path | Notes |
|---------|--------|------------|-------|
| **Twilio voice** | Live | Media Stream → mulaw 8kHz → Deepgram | Current implementation |
| **WhatsApp** | Planned | Webhook/stream → format conversion → Deepgram | Different codec (opus, etc.); may need transcode |
| **SMS** | Planned | Text input → skip STT, feed directly to extraction | No audio |
| **Live in-app** | Planned | Browser MediaStream → WebRTC or WS → Deepgram | e.g. agent/customer co-browse |
| **Other (Five9, Dialpad, etc.)** | Planned | Provider-specific webhook → normalized stream | Same pattern as Twilio |
| **GHL Custom Page (in-app)** | Planned | `getUserMedia()` → WebSocket → Deepgram | GHL [Custom Pages support mic access](https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomPages); no need for GHL transcription |

When adding a channel: create a webhook/handler that produces a **session ID** + **audio stream** (or text), then route to the shared pipeline. Keep format conversion (mulaw, opus, etc.) at the adapter boundary.

---

## What Not to Do

- **Don’t send raw AI output to users.** SMS/email must use typed templates + variable slots (e.g. `{{firstName}}`, `{{missingFields}}`).
- **Don’t bypass compliance.** All agent-facing guidance goes through `services/compliance.ts`.
- **Don’t add circular deps.** `callOrchestrator` uses dynamic `require` for `ghl` to avoid cycles.
- **Don’t block Twilio webhooks.** Status callback returns 204 immediately; orchestration runs async.
- **Don’t assume GHL is the only CRM.** Keep CRM logic behind a future abstraction (upsertContact, createDeal, etc.).
- **Don’t put business logic in webhook handlers.** Voice/call-status routes should delegate to services.
- **Don’t infer FlowStage from entity alone.** Stage comes from DB; `evaluateStageTransition` exists but is not yet wired to the live flow.
- **Don’t build demo-only flows.** Every feature must be part of the live product.
- **Don’t hardcode Twilio in the pipeline.** New ingestion adapters should plug in without touching extraction, scoring, or action layers.

---

## Key Paths

- **Config:** `src/config/fieldStages.ts` — single source of truth for quote vs application fields and scoring weights.
- **Extraction:** `src/domain/insurance/shared/extraction_v2.ts`, `src/services/claude.ts`, `src/services/extractionTransform.ts`.
- **Orchestration:** `src/services/callOrchestrator.ts`, `src/services/stageManager.ts`, `src/services/scoring.ts`.
- **Action:** `src/services/ghl.ts`, `src/services/sms.ts`, `src/services/followUpPoller.ts`.
- **Agent realtime:** `src/ws/agentHub.ts` — WebSocket `/ws/agent`; no agent UI in this repo.

### GHL Marketplace

- **Custom Pages** — Iframe-based; GHL supports **camera and microphone** access. Use `getUserMedia()` + stream to your backend; Deepgram for STT. No need to use GHL's transcription.
- **Hosting** — HTTPS, no restrictive `X-Frame-Options`, allow `frame-ancestors` for GHL in CSP.
- **Conversation Provider** — Optional; for dialer-style integration (e.g. WAVV Dialer). Easy Intake can start as Custom Page, add Provider later if needed.
