# To go live — essentials (MVP + agency onboarding)

This list is the **minimum** that must be true for the product and the **new agency onboarding wizard** (`/[locale]/onboarding`) to be shippable. Deeper launch work (GHL marketplace, legal URLs, full env parity) lives in [GHL_APP_LAUNCH_ACTION_ITEMS.md](GHL_APP_LAUNCH_ACTION_ITEMS.md), [SETUP.md](SETUP.md), and [apps/web/DEPLOY-PRODUCTION.md](apps/web/DEPLOY-PRODUCTION.md).

---

## 1. Entry point to the wizard

Nothing in the app links to **`/{locale}/onboarding`** yet. You need at least one obvious path, for example:

- After **new org signup** (Clerk post-sign-up / first dashboard visit), or  
- A **dashboard banner** for orgs that have not finished agency setup — e.g. where persisted onboarding has no completion timestamp (`AgencyConfig.onboarding` JSON with `completedAt == null`), in addition to or instead of today’s Clerk-only pipeline banner.

This requires a **small edit to an existing page** (or layout). Say when you want that change scoped and implemented.

---

## 2. Step forms (replace placeholders)

Each step under `apps/web/src/app/[locale]/onboarding/steps/` still has a **`// TODO: implement form`** area. **Continue / Skip** flows work; real collection (agency name, URL, phone, GHL, Twilio display, invites, etc.) is not wired until those forms exist. They can be built **one step at a time**, in any order.

---

## 3. Logo / branding from website (explicitly out of scope for MVP)

**Agency profile** should collect **website URL** (and related fields). **Automatic logo fetch and brand-color extraction** is a **future API feature**, not a blocker to go live if the URL is stored and Settings/manual logo paths still work.

---

## 4. Unify “onboarding complete” (recommended follow-up)

Two signals exist today:

- **Pipeline chat onboarding** (`OnboardingClient` at `/dashboard/onboarding`) — **`onboardingComplete`** in **Clerk org `publicMetadata`**, via **`PATCH /api/settings/organization`**.  
- **Agency setup wizard** — **`completedAt`** (and step state) on **`AgencyConfig.onboarding`** in the **intake API** (Prisma JSON).

For one coherent “org is done with first-run setup,” these should eventually be **connected** (single source of truth or mirrored updates). Not strictly required to ship the wizard if product accepts two flags temporarily.

---

## 5. Deploy API after onboarding routes ship

**`apps/api`** must be **redeployed** (e.g. Railway) so production runs **`GET/POST /api/onboarding/state`** and the **`AgencyConfig.onboarding`** column migration.

**`apps/web`** typically **auto-deploys on push** to Vercel (BFF routes under `/api/onboarding/state` and the onboarding UI).

Confirm env parity: **`API_JWT_SECRET`**, **`API_BASE_URL` / `NEXT_PUBLIC_API_URL`**, and DB migrations applied on the same API instance you expose publicly.

---

## Quick sanity checks before calling it live

- [ ] Migrations applied on production DB (`AgencyConfig.onboarding` present).  
- [ ] At least one **entry point** sends operators to **`/{locale}/onboarding`** when appropriate.  
- [ ] Smoke: BFF **`GET /api/onboarding/state`** returns JSON for a signed-in org with a linked **AgencyConfig** (`clerkOrganizationId`).  
- [ ] Smoke: wizard **Continue** persists and **Define your pipeline →** lands on **`/dashboard/onboarding`** when you intend that flow.
