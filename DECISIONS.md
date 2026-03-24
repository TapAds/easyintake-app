# Easy Intake — Decisions and direction

**Convention:** **[PLANNED]** = agreed direction or docs say so, **not implemented in this repo yet.** **[UNVERIFIED]** = needs product/engineering confirmation before stating as fact in customer-facing material.

---

## Platform and repo

| Decision | Notes |
|----------|--------|
| **Monorepo (`easy-intake-app`)** | Single API service (`apps/api`), shared types (`packages/shared`), web (`apps/web`). |
| **`easy-intake-site` outside workspace** | Marketing site is a **sibling** directory — not `apps/*` or `packages/*`. |
| **Real-time intake in `apps/api`** | Call pipeline, STT, extraction, scoring, CRM/SMS — not reimplemented in Next.js. |

---

## Authentication

| Decision | Notes |
|----------|--------|
| **Clerk for `apps/web`** | Browser authentication and session for the Next.js app. |
| **HS256 JWT for `apps/api`** | Separate secret (`API_JWT_SECRET`); used for API auth and WebSocket tokens — **not** Clerk-issued tokens. |
| **Supabase Auth** | **Not used** — policy in project rules. **([UNVERIFIED] historical "why" vs Clerk)** — record separately if you publish an ADR. |
| **Auto-create org on new agent signup** | **[PLANNED]** — pattern exists in a connected product; build here when full agent onboarding flow is added to `apps/web`. |

---

## Verticals and data model

| Decision | Notes |
|----------|--------|
| **Vertical-agnostic engine (goal)** | Config-driven schemas and prompts; avoid hardcoding one vertical in generic UI. |
| **Insurance as first vertical (current)** | Prisma models such as **`LifeInsuranceEntity`** — DB is **insurance-shaped today**; generalization is **ongoing**, not complete. |

---

## Integrations and CRM

| Decision | Notes |
|----------|--------|
| **GoHighLevel as first CRM** | Concrete integration in `apps/api` services; future CRMs behind a similar boundary. |
| **cotizarahora webhook** | Product boundary uses [WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md). **[TODO]** Align spec HTTP codes with actual handler (see [ARCHITECTURE.md](ARCHITECTURE.md)). |

---

## Engineering patterns (high level)

| Decision | Notes |
|----------|--------|
| **Extraction path** | Prefer documented "live" extraction modules over legacy prompts where referenced in code. |
| **Compliance / templates** | Agent-facing guidance and customer SMS should respect filtering and templates in `apps/api` — do not bypass for convenience. |
| **Quote engine** | **Out of scope** as a core owned system in current product framing (Phase 2 / external). |

---

## What not to decide in generic UI

- Do not encode **insurance-only** (or any single vertical's) business rules in reusable Next components — keep vertical logic in config and domain code under `apps/api`.
