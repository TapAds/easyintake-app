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
| **Two-auth flow (MVP)** | **Known architectural constraint:** Clerk for `apps/web` (dashboard); **application JWT** for `apps/api` (HTTP + **WebSocket** / agent stream). **Unification is a future track, not MVP.** |
| **Applicants on microsite** | **Session tokens** for authentication — **not** Clerk. Vertical configs may require **stronger auth** for specific verticals; that is a **config option**, not a platform default. |
| **Supabase Auth** | **Not used** — policy in project rules. **([UNVERIFIED] historical "why" vs Clerk)** — record separately if you publish an ADR. |
| **Auto-create org on new agent signup** | **[PLANNED]** — pattern exists in a connected product; build here when full agent onboarding flow is added to `apps/web`. |

---

## Verticals and data model

| Decision | Notes |
|----------|--------|
| **Vertical-agnostic engine (goal)** | Config-driven schemas and prompts; avoid hardcoding one vertical in generic UI. |
| **String field keys (`packages/shared`)** | **EntityFieldName**-style enums give way to **string keys** in shared types; verticals ship as **config packages** (Insurance first in the build track). |
| **Insurance as first vertical (current)** | Prisma models such as **`LifeInsuranceEntity`** — DB is **insurance-shaped today**; generalization is **ongoing**, not complete. |
| **Second client — inmigracioningreso.com** | Immigration intake (Spanish-speaking markets); **`uscis-i90`** / **`uscis-n400`** config packages **after** Insurance is proven; separate Next.js site webhooks to `apps/api`. |

---

## Integrations and CRM

| Decision | Notes |
|----------|--------|
| **GoHighLevel as first CRM** | Concrete integration in `apps/api` services; future CRMs behind a similar boundary. |
| **cotizarahora webhook** | Product boundary uses [WEBHOOK_SPEC.md](api-contract/WEBHOOK_SPEC.md). **[TODO]** Align spec HTTP codes with actual handler (see [ARCHITECTURE.md](ARCHITECTURE.md)). |
| **PDF generation (Anvil)** | **Anvil** adapter (shared with a connected product). **Template IDs are per vertical config.** **USCIS** forms for the Immigration vertical use **public-domain** PDF templates. |

---

## Engineering patterns (high level)

| Decision | Notes |
|----------|--------|
| **Extraction path** | Prefer documented "live" extraction modules over legacy prompts where referenced in code. |
| **Compliance / templates** | Agent-facing guidance and customer SMS should respect filtering and templates in `apps/api` — do not bypass for convenience. |
| **Quote engine** | **Out of scope** as a core owned system in current product framing (Phase 2 / external). |
| **Agent realtime UI (MVP)** | **`apps/api/public/agent.html`** remains the **WebSocket-backed** agent surface for calls; **`apps/web`** **bridges** (link/embed + **application JWT** from BFF). Moving the full realtime agent UI into Next.js is **not** required for MVP. |

---

## Reporting and analytics

| Decision | Notes |
|----------|--------|
| **Layered reporting hub** | Split comparable engine KPIs (volume, funnel, completeness, sync health, follow-ups) from org-specific field catalogs and CRM routing — see [REPORTING_HUB.md](REPORTING_HUB.md). |
| **Canonical event vocabulary** | Stable names in [`packages/shared/src/canonicalReportingEvents.ts`](packages/shared/src/canonicalReportingEvents.ts); mapping to Prisma models documented in [REPORTING_HUB.md](REPORTING_HUB.md). |

---

## Product roadmap (selected)

**See also:** [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) (Now / Soon / Later + agency onboarding checklist) and [docs/specs/PLATFORM_BUILD_PLAN.md](docs/specs/PLATFORM_BUILD_PLAN.md) (full `apps/web` platform plan).

| Item | Status | Notes |
|------|--------|--------|
| **Explicit event rows or ETL for analytics** | **[PLANNED]** | Today reporting prototypes can use `Call`, `IntakeLead`, and `FollowUpJob`. When **org cardinality** and **query complexity** grow, add **append-only intake events** (e.g. `IntakeEvent`) populated at engine milestones and/or **ETL** to a warehouse — avoids ad-hoc joins and heavy aggregates on hot tables. See [REPORTING_HUB.md](REPORTING_HUB.md). |
| **Clerk org ↔ agency bridge for org-scoped dashboards** | **[PLANNED]** | Align `org_id` with `AgencyConfig` (or successor) for tenancy in reporting APIs. |

---

## What not to decide in generic UI

- Do not encode **insurance-only** (or any single vertical's) business rules in reusable Next components — keep vertical logic in config and domain code under `apps/api`.
