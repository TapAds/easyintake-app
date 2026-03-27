# Document-changes — change-type checklist

Use this when proposing updates in **Phase B** of [`SKILL.md`](SKILL.md). It does not replace reading the files; it reduces missed touchpoints.

| Change type | Primary docs (allowlist) | Notes |
|-------------|---------------------------|--------|
| **Deployment** (Vercel, Railway, domains, `vercel.json`, build order) | `ARCHITECTURE.md` §7, `apps/web/DEPLOY-PRODUCTION.md` | Include monorepo `npm ci`, build `@easy-intake/shared` before web if relevant. |
| **Clerk** (sign-in/up paths, middleware, production keys, DNS) | `ARCHITECTURE.md` §2, `CONTEXT.md` stack/auth, `apps/web/README.md`, `DEPLOY-PRODUCTION.md` | Keep “web vs API JWT” split accurate. |
| **Local dev / env** | `SETUP.md`, `apps/web/.env.local.example` (names only) | Point to `.env.local.example`; never commit secrets. |
| **Product scope / roadmap** | `PRODUCT_ROADMAP.md`, `CONTEXT.md` | Light edits to roadmap; avoid duplicating full architecture. |
| **Web app behavior** (routes, dashboard, BFF) | `CONTEXT.md`, `ARCHITECTURE.md` §3, `apps/web/README.md` | Clarify vs `agent.html` on `apps/api`. |
| **Reporting / decisions** | Usually **not** in allowlist — list under **Suggested follow-up** | `REPORTING_HUB.md`, `DECISIONS.md` unless user expands scope. |
| **API contract / webhooks** | `ARCHITECTURE.md` §6–§8 or **Suggested follow-up** for `api-contract/` | Spec sync often lives outside allowlist; flag for follow-up. |

## Quick anchors in repo root docs

| File | Sections |
|------|----------|
| `ARCHITECTURE.md` | §1 layout, §2 auth, §3 UIs, §4–§6 flow/DB/contracts, §7 deployment, §8–§9 comms/reporting |
| `CONTEXT.md` | Product scope, stack table, auth two layers, related docs |
| `SETUP.md` | Env, DB, Twilio, GHL, run, web §9 |
