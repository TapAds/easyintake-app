# Easy Intake App — Product roadmap

High-level sequencing for the platform and major clients. Detailed engineering lives in [docs/specs/PLATFORM_BUILD_PLAN.md](docs/specs/PLATFORM_BUILD_PLAN.md), [DECISIONS.md](DECISIONS.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Now

- **Universal voice demo** — Single product demo line **`+1 430-300-3049`** for [Live demo](https://app.easyintakeapp.com/en/dashboard/live-demo): operator confirms **Product / Form (demo)** in the UI, prospect calls the number; **Application fields (live)** shows the **full catalog by section** for that package as values stream in. Documented in [docs/demo/LIVE_CALL_DEMO.md](docs/demo/LIVE_CALL_DEMO.md).
- **Insurance vertical** — first **vertical config package** (string field keys, config-driven forms and HITL).
- **Agent dashboard** — org queue, session detail, field review from config, reporting overview (replace demo data as APIs land).
- **Foundation** — `IntakeSession` model (vertical-agnostic), BFF to `apps/api`, bilingual shell. **`apps/web`** is deployable to **Vercel** with **Clerk** (production DNS + env per [`apps/web/DEPLOY-PRODUCTION.md`](apps/web/DEPLOY-PRODUCTION.md)); keep **GitHub `main`** in sync with what you expect to run in production.

---

## Soon

**Sequencing:** The next two subsections are **high priority after** GoHighLevel marketplace / app delivery when both tracks are active.

### Onboarding widget / experience

- **Purpose:** Guided first-run setup of the customer’s **tenant** (organization instance): **products sold**, intake **forms** (PDF, web, and other channels), **organization and users** (roles), **CRM integration** (e.g. GHL connection, locations, field mappings), telephony/voice where applicable, default **vertical / config packages**, and other data that is manual or env-driven today.
- **Relationship to carrier-documents work (below):** This is the **orchestrated UX** that may **include** or **launch** PDF/form ingestion; the separate **Customer onboarding — carrier documents** item remains the **content and ingestion** capability (presets, ordering, mappings).
- **Outcome:** Enough configuration in-product that the org can run intake, the dashboard, and integrations without operator-only runway.

### Dashboard "Settings" tab

- **Audience:** **Agents** and **agency admins** (org-scoped; permission model TBD — align with Clerk org roles per [DECISIONS.md](DECISIONS.md) / [ARCHITECTURE.md](ARCHITECTURE.md) as those harden).
- **Purpose:** Ongoing in-app configuration: org profile, **products / forms** mappings, **CRM** integrations, user and invite management as appropriate, voice numbers / environments, feature toggles, and the rest of what the dashboard **Settings** shell should own—aligned with [PLATFORM_BUILD_PLAN.md](docs/specs/PLATFORM_BUILD_PLAN.md) as dashboard IA evolves.
- **Org profile (in progress):** Dashboard **Settings → Organization** captures **display name**, **website**, and **logo** (upload to blob storage or **fetch from website** with explicit user approval). Name and metadata live on the **Clerk organization**; logo URL is suitable for **applicant microsites**, forms, and other branded surfaces once those routes read from the same source.
- **Relationship to onboarding:** **Settings** is the **day-two admin surface** after initial setup; onboarding should **pre-fill or hand off** into Organization (and related settings); microsites and embedded flows **consume** org profile fields when wired.

- **Customer onboarding — carrier documents** — ingest **PDFs and blank application forms** (e.g. carrier-specific apps, underwriting guides) to bootstrap **vertical presets**, field ordering, and org-specific mappings; delivery TBD (**in-product wizard**, **embedded agent**, **Cursor skill**, or **operator playbook**). Not the same as agency **voice** onboarding below.
- **inmigracioningreso.com** — separate Next.js product that **webhooks** into Easy Intake (`apps/api`), similar in boundary to cotizarahora.
- **Immigration vertical config packages** — **`uscis-i90`** (Form I-90), **`uscis-n400`** (Form N-400), after Insurance is **proven end-to-end**.
- **English and Spanish** for Immigration surfaces (primary audience Spanish-speaking).

---

## Later

- **Call recording snippets for STT review (not implemented)** — Store or reference **short audio clips** aligned to transcript spans that drove each **field extraction**. In session review / HITL, allow playing the clip for a selected field so agents can **validate or correct** transcript-derived values and improve confidence in STT + extraction. Product scope: UI affordance, storage/retention policy, linkage model (utterance offset ↔ field key ↔ audio segment), and org controls.
- **Additional verticals** — same config + session model; no new generic page types.
- **`VoiceProvider` abstraction** — CPaaS portability inside `apps/api` (see platform build plan Section 2b).
- **WebRTC / SIP support** — broader real-time voice options beyond current Twilio media stream + `agent.html` bridge.

---

## Far horizon

- **Cursor skill: deployment & env parity** — single checklist for Vercel web + API/production env alignment (Clerk, `API_JWT_SECRET`, DNS, smoke) before calling a release “done.”
- **Cursor skill: partner webhook integration** — idempotency keys, retries, signature verification, and sender-facing error semantics when onboarding a new HTTP sender (beyond spec/code sync).
- **Cursor skill: Prisma migrations & tenant-safe schema** — how to ship vertical/session model changes without breaking in-flight orgs; expand/contract patterns for shared tables.
- **Cursor skill: observability & incident triage** — structured logs, redaction defaults, and a first-response playbook when prod calls, webhooks, or CRM sync misbehave.
- **Cursor skill: testing & QA gates** — contract tests for critical HTTP paths, minimal smoke for bilingual web, when to add E2E vs not for this repo.
- **Cursor skill: accessibility & UX quality** — keyboard, focus order, semantics, and copy length constraints alongside next-intl for user-facing `apps/web` surfaces.

---

## Agency onboarding (operational checklist)

Use this as the **practical ladder** when standing up a new agency (voice + engine). Technical detail: [PLATFORM_BUILD_PLAN.md — Section 2b](docs/specs/PLATFORM_BUILD_PLAN.md).

1. **Single number + sandbox** — Twilio number → dev/staging API URL; test calls create `Call` / session records; CRM optional or sandbox. **Product demos:** use **`+1 430-300-3049`** with [Live demo](https://app.easyintakeapp.com/en/dashboard/live-demo) unless testing a dedicated agency number.
2. **Tenant mapping** — Bind number(s) to `organizationId` + default vertical/config package; verify webhook **signature** and **media stream** health.
3. **Production cutover** — Point production number to prod `publicBaseUrl`; enable **status callbacks** and CRM sync per org.
4. **Forwarding level** — Choose direct-to-engine vs IVR-first per number; add conference / warm handoff only when needed.
5. **Dashboard access** — Clerk users for org; **agent voice** uses **application JWT** for WebSocket (two-auth flow — see [DECISIONS.md](DECISIONS.md)).
