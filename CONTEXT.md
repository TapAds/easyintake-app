# Easy Intake — Product Context

> **Core objective:** Turn conversations (e.g. voice calls) into structured, actionable data and downstream actions (CRM sync, SMS, workflows).

Easy Intake is a **horizontal intake engine** in **product intent**: it is not a quote engine, policy system, or generic CRM. It ingests input, extracts structure with AI, scores completeness, and triggers actions. **Today's implementation is centered on the insurance vertical**; the **architectural goal** is vertical-agnostic, config-driven behavior across verticals.

---

## Where this code lives

| Area | What it is |
|------|------------|
| **`easy-intake-app/`** | npm workspace monorepo: `apps/api`, `apps/web`, `packages/shared`. |
| **`easy-intake-site/`** | **Sibling folder** (not in `apps/*` or `packages/*`). Static marketing site. Do **not** describe it as part of the npm workspace. |

---

## Stack (high level)

| Package | Tech |
|---------|------|
| **apps/api** | Express, TypeScript, Prisma, WebSockets. Twilio (voice), Deepgram (transcription), Claude (extraction). Serves **static agent UI** at `public/agent.html`. |
| **apps/web** | Next.js 14 App Router, **Clerk** (embedded sign-in/up on `/[locale]/sign-in` & `/[locale]/sign-up`, protected routes), next-intl (`/en`, `/es`), Tailwind. Dashboard includes **Live demo**, **Live call**, **Settings** (org / CRM), localized **intake** routes under `/[locale]/intake/*` as implemented. **Deployed** to **Vercel** (project `easyintake-app-web`, monorepo root install + build order per `apps/web/vercel.json`). **Not** the in-call realtime UI — that is still **`apps/api/public/agent.html`**. |
| **packages/shared** | Shared TypeScript types, **vertical configs** (with optional **Zod** parsing in `verticalConfigZod.ts`), **field visibility** helpers, and **legal** JSON (terms/privacy **en**/**es**) exported for the web app. Immigration **`uscis-n400`** (and related) live under modular `verticals/uscisN400/*`. |

**Universal product demo (voice):** **`+1 430-300-3049`** with the dashboard **[Live demo](https://app.easyintakeapp.com/en/dashboard/live-demo)** (`/[locale]/dashboard/live-demo`): confirm **Product / Form (demo)** in the UI, then call the number; the page shows the **full application catalog by section** for that package as data arrives. Details: [docs/demo/LIVE_CALL_DEMO.md](docs/demo/LIVE_CALL_DEMO.md).

---

## Authentication (two layers) — be precise

- **`apps/web`** uses **Clerk** for browser session (middleware + `ClerkProvider`).
- **`apps/api`** uses a **separate HS256 JWT** signed with `API_JWT_SECRET` for Bearer-protected routes and short-lived **WebSocket** tokens (e.g. agent stream). **Do not** describe "the product" as Clerk-only — see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Architecture (summary)

- **Real-time intake** (calls, STT, extraction, scoring, GHL/SMS) lives in **`apps/api`**.
- **Next.js app** handles localized shell + Clerk; **realtime agent tooling** for calls is the **static** `apps/api/public/agent.html` (connects to the API WebSocket with a token).
- **Vertical-agnostic behavior** is the **target**: schemas and prompts should stay config-driven. **The database today is insurance-shaped** (`LifeInsuranceEntity`, etc.) — vertical-agnostic storage is **not** fully realized yet; see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## What this product owns vs. does not

**In scope (conceptually):** Intake pipeline, extraction, scoring, guidance, CRM sync (e.g. GoHighLevel), follow-up messaging, external lead webhooks.

**Out of scope (examples):** Quote/pricing engine as the system of record, policy issuance, payments — unless you explicitly add them later.

---

## Integrations

- **Twilio, Deepgram, Anthropic, GHL** — wired through **`apps/api`** (voice, STT, AI, CRM). These are **not** "webhooks only."
- **Voice bridging** — Agencies may configure **`AgencyConfig.voiceAgentForwardNumber`** (E.164) so inbound Twilio leg can **dial out / conference** to an operator or PBX (see `twilioConference.ts` + voice webhooks). Demos and direct-to-engine numbers unchanged unless configured.
- **Form catalog (operator)** — Bearer-authenticated **`POST /api/intake/form-catalog/analyze-pdf`** analyzes a PDF and returns a **draft** sections/fields catalog (Claude); used to bootstrap vertical presets from carrier blanks.
- **cotizarahora → easyappintake** — HTTP **webhook** contract only for that product boundary. **Authoritative spec:** [`api-contract/WEBHOOK_SPEC.md`](api-contract/WEBHOOK_SPEC.md).  
  **Note:** The spec lists some HTTP statuses (e.g. 202, 422) that the current handler does not return; treat alignment as **[TODO]** on the spec (see [ARCHITECTURE.md](ARCHITECTURE.md)).

---

## Principles

- **Ship real product paths** — avoid demo-only branches when possible.
- **Compliance and templates** — do not send raw model output to SMS/customers; use approved templates and filtering where implemented in `apps/api`.
- **Do not put vertical-specific logic in generic UI** — keep verticals in config and domain modules.

---

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow, auth split, DB honesty, deployment pointers.
- [DECISIONS.md](DECISIONS.md) — recorded decisions and [PLANNED] items.
- [REPORTING_HUB.md](REPORTING_HUB.md) — central reporting hub strategy, event vocabulary, MVP widgets, tenancy and drill-down.
- [api-contract/WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md) — cotizarahora webhook contract.
