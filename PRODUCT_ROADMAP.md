# Easy Intake App — Product roadmap

High-level sequencing for the platform and major clients. Detailed engineering lives in [docs/specs/PLATFORM_BUILD_PLAN.md](docs/specs/PLATFORM_BUILD_PLAN.md), [DECISIONS.md](DECISIONS.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Now

- **Insurance vertical** — first **vertical config package** (string field keys, config-driven forms and HITL).
- **Agent dashboard** — org queue, session detail, field review from config, reporting overview (replace demo data as APIs land).
- **Foundation** — `IntakeSession` model (vertical-agnostic), BFF to `apps/api`, bilingual shell. **`apps/web`** is deployable to **Vercel** with **Clerk** (production DNS + env per [`apps/web/DEPLOY-PRODUCTION.md`](apps/web/DEPLOY-PRODUCTION.md)); keep **GitHub `main`** in sync with what you expect to run in production.

---

## Soon

- **Customer onboarding — carrier documents** — ingest **PDFs and blank application forms** (e.g. carrier-specific apps, underwriting guides) to bootstrap **vertical presets**, field ordering, and org-specific mappings; delivery TBD (**in-product wizard**, **embedded agent**, **Cursor skill**, or **operator playbook**). Not the same as agency **voice** onboarding below.
- **inmigracioningreso.com** — separate Next.js product that **webhooks** into Easy Intake (`apps/api`), similar in boundary to cotizarahora.
- **Immigration vertical config packages** — **`uscis-i90`** (Form I-90), **`uscis-n400`** (Form N-400), after Insurance is **proven end-to-end**.
- **English and Spanish** for Immigration surfaces (primary audience Spanish-speaking).

---

## Later

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

1. **Single number + sandbox** — Twilio number → dev/staging API URL; test calls create `Call` / session records; CRM optional or sandbox.
2. **Tenant mapping** — Bind number(s) to `organizationId` + default vertical/config package; verify webhook **signature** and **media stream** health.
3. **Production cutover** — Point production number to prod `publicBaseUrl`; enable **status callbacks** and CRM sync per org.
4. **Forwarding level** — Choose direct-to-engine vs IVR-first per number; add conference / warm handoff only when needed.
5. **Dashboard access** — Clerk users for org; **agent voice** uses **application JWT** for WebSocket (two-auth flow — see [DECISIONS.md](DECISIONS.md)).
