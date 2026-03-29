# Easy Intake App — Platform build plan (`apps/web`)

**Status:** Approved. This document consolidates the platform plan for the Next.js app and shared types, aligned with [CONTEXT.md](../../CONTEXT.md), [ARCHITECTURE.md](../../ARCHITECTURE.md), and [DECISIONS.md](../../DECISIONS.md).

**Scope:** `apps/web`, `packages/shared`, and **contracts** for `apps/api` (BFF, no duplication of realtime voice/AI in Next.js). **`apps/api`** changes follow explicit product/engineering scope; realtime intake remains in the API per architecture.

---

## Principles

- **Vertical-agnostic engine (goal):** Field catalogs, labels, validation, HITL, and output mapping live in **vertical config**, not in generic UI.
- **First vertical config package (MVP track):** **Insurance** — prove config-driven behavior before additional packages.
- **`IntakeSession`:** Vertical-agnostic; `verticalId` and `configPackageId` are opaque — future verticals (including Immigration) attach without new page types.
- **Bilingual UI (`apps/web`):** English and Spanish via next-intl; no hardcoded user-facing strings.
- **Auth split:** Clerk for org users in `apps/web`; **application JWT** for `apps/api` and WebSocket — see [DECISIONS.md](../../DECISIONS.md).

---

## Section 1 — Vertical config schema

**Build:**

- Versioned **vertical definition**: sections, field definitions (string keys), types, validation rules, localized labels/tooltips, HITL gates, output mapping to CRM/PDF/API.
- **Resolution:** `vertical` → optional `organizationId` → optional product overrides.
- **Runtime validation** of config (e.g. Zod) in shared or API layer.
- **Insurance** ships as the **only** vertical config package in the **first implementation track**.

**Exists today:** [`packages/shared`](../../packages/shared) has minimal [`VerticalConfig`](../../packages/shared/src/verticalConfig.ts); [`fieldState`](../../packages/shared/src/fieldState.ts) still used insurance-shaped names — **migrate to string keys** before broad UI.

**Data model (conceptual):** `VerticalConfig` with `sections[]`, `fields[]` (`key`, `type`, `sectionId`, `validation[]`, `hitl`, locales), `outputMappings`.

**Dependencies:** Shared schema first; then form renderer, dashboard, microsite.

---

## Section 2 — Intake session and cross-channel tracking

**Build:**

- Canonical **`IntakeSession`** with stable **`sessionId`**; channels (voice, SMS, WhatsApp, web form, microsite) append to the **same** record.
- Lifecycle: e.g. `created` → `collecting` → `awaiting_hitl` / `awaiting_applicant` → `ready_to_submit` → `submitted` → terminal states.
- **BFF** (Next Route Handlers) calling **`apps/api`** with server credentials — not Clerk-as-engine-auth.
- **Canonical reporting events** keyed by `sessionId` ([REPORTING_HUB.md](../../REPORTING_HUB.md)).

**Exists today:** API has [`Call`](../../apps/api/prisma/schema.prisma) (voice) and [`IntakeLead`](../../apps/api/prisma/schema.prisma) (webhook idempotency); unified cross-channel storage is a **target contract**. Web: optional `sessionId` in extraction pipeline; dashboard metrics **mocked**.

**Data model (conceptual):** `sessionId`, `organizationId`, `verticalId`, `configPackageId`, `status`, `channels[]`, `fieldValues` (string keys), `completeness` / `hitlState`, external aliases (`callSid`, CRM ids).

---

## Section 2b — Voice architecture

**Multi-tenant phone routing:** Inbound `To` number maps to org + defaults (vertical/config, CRM location). Web may later offer **admin UI** for number registration via BFF.

**Call forwarding (three levels):**

1. **Direct to engine** — TwiML opens media stream immediately (baseline).
2. **Screened / IVR then engine** — Studio or IVR first, then same stream endpoint.
3. **Conference / warm handoff** — human agent joins; optional copilot; still one `IntakeSession` where unified.

**`VoiceProvider` abstraction (target in `apps/api`):** Port/interface for Twilio (and future CPaaS); orchestration depends on the port, not scattered SDK calls.

**Five audio / guidance paths (conceptual):** Agent UI (WebSocket text); caller TTS (Say/Play); STT ingest spine; coach-only (no caller TTS); fallback async (SMS/link).

**Onboarding ladder (operational):** See [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) agency checklist.

**MVP realtime UI:** Bridge to [`agent.html`](../../apps/api/public/agent.html) with **application JWT** from BFF — do not rebuild STT/extraction in Next.js.

---

## Section 3 — Agent dashboard

**Build:** Org-scoped **queue** and **session detail** (`sessionId`): timeline, field review from **config**, HITL actions, document queue, completeness. **Reporting** overview replaces demo [`snapshot`](../../apps/web/src/lib/dashboard/snapshot.ts) when APIs exist. **Voice:** link/embed **`agent.html`** with API-issued token.

**Exists today:** Localized dashboard with **demo data**, [`AppChrome`](../../apps/web/src/components/AppChrome.tsx), reusable field/transcript components. **Live demo** at `/[locale]/dashboard/live-demo` uses universal voice **`+1 430-300-3049`** (confirm Product/Form in UI, then dial).

**Dependencies:** Sections 1–2, BFF contract; Insurance config for field review.

---

## Section 4 — Applicant microsite

**Build:** Token-based **session resume** (not Clerk for default applicant flow). Localized routes; **config-driven** multi-step flow; uploads; e-sign placeholder/adapters; BFF to API; mobile-first.

**Exists today:** Shell and form primitives; **no** dedicated microsite routes.

**Dependencies:** Intake session + BFF; shared field renderer with agent surface.

---

## Section 5 — Channel connectors

**Model:** All channels append events and field updates to **`IntakeSession`**; connectors at **`apps/api`** boundary.

| Channel | Primary locus | `apps/web` role |
|--------|----------------|-----------------|
| Voice | `apps/api` (Twilio, media stream, orchestration) | Dashboard bridge, JWT from BFF |
| Web form | BFF + pages | Full UI |
| SMS / WhatsApp | `apps/api` webhooks, templates | Dashboard visibility, copy resume link |
| Microsite | BFF + pages | Full UI |
| Partner webhooks | `apps/api` | Reporting only |

**Exists today:** Voice + intake webhook; web connectors **not** complete.

---

## Section 6 — Output adapters

**Build:** Pluggable **destinations** in **`apps/api`** (CRM, PDF, REST, DB); **`apps/web`** shows **status**, **retry**, **health** via BFF — **no** secrets in browser.

**PDF:** **Anvil** adapter (proven in a connected product); **template IDs per vertical config**; **Insurance** and **Immigration** share the adapter — different templates. **USCIS** I-90 / N-400 templates are **public domain** PDFs.

**Exists today:** GHL in API; generic destination UI **not** built.

---

## Section 7 — AI integration (`apps/web` ↔ `apps/api`)

**Build:** **No** heavy AI in Next.js — **BFF** for session state, scores, corrections; **WebSocket** for agent realtime via **application JWT**; display extraction/completeness/guidance from API payloads. Optional **mock** `extractFn` for dev only.

**Exists today:** API orchestration + `agent.html`; web pipeline abstraction is **not** production parity.

---

## Second client — inmigracioningreso.com (Immigration)

- **Product:** Immigration intake for Spanish-speaking markets; **second vertical** after Insurance proves the platform.
- **Config packages:** `uscis-i90`, `uscis-n400` — build **after** Insurance is **proven end-to-end**.
- **Site:** **Separate Next.js app** (like cotizarahora) sending **webhooks** to **`apps/api`** — not assumed inside `easy-intake-app` workspace unless explicitly colocated.
- **UI:** Same dashboard and microsite **page types** — **config-only** differences; **English and Spanish** required for this vertical.

---

## Documentation and follow-ups

- **[DECISIONS.md](../../DECISIONS.md):** Auth, applicants, PDF/Anvil, USCIS, `agent.html` MVP bridge — recorded in decisions table.
- **[PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md):** Now / Soon / Later + agency onboarding checklist.

---

## Suggested build order (summary)

1. **`packages/shared`:** String field keys; expand `VerticalConfig`; Insurance package.
2. **`IntakeSession` types + BFF stubs** → queue/detail skeletons.
3. **Agent dashboard** wired to BFF; **microsite** with session tokens.
4. **Channel and output status** surfaces as APIs land.
5. **Immigration configs** + **inmigracioningreso.com** webhook contract **after** Insurance is stable.
6. **VoiceProvider** / **WebRTC-SIP** — see roadmap (later).
