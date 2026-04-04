# Onboarding wizard — resume later

**Branch:** `feature/onboarding-wizard` (all current WIP was committed there; see that commit — the diff may include other unrelated local changes, not only onboarding.)

**Intent:** Park agency onboarding UI + API until after first clients are onboarded manually. Nothing here is required for a minimal MVP ship from `main`.

---

## What exists on the branch

| Area | Notes |
|------|--------|
| **`packages/shared`** | `onboarding/types.ts`, `steps.config.ts`, barrel exports |
| **Prisma** | Nullable `AgencyConfig.onboarding` JSON + migration |
| **`apps/api`** | `GET/POST /api/onboarding/state` (Clerk org → `AgencyConfig`) |
| **`apps/web`** | BFF `app/api/onboarding/state`, `/{locale}/onboarding` wizard + steps, `getNextStep`, handoff to `/dashboard/onboarding` (pipeline chat) |
| **i18n** | `agencyOnboarding` namespace in `messages/en.json` & `es.json` (separate from chat `onboarding` namespace) |
| **Docs** | `TO_GO_LIVE.md` checklist |

## Not done (pick up here)

1. **Dashboard gate** — On `/{locale}/dashboard/applications`, optionally `GET /api/onboarding/state` (same-origin BFF + cookies); if **`200`** and **`completedAt === null`**, `redirect` to `/{locale}/onboarding`. On **403 / 404 / 5xx**, do **not** redirect (preserve today’s behavior). See prior discussion on Clerk `onboardingComplete` vs `AgencyConfig.completedAt`.
2. **Clerk post-signup redirect** — Point `ClerkProvider` / `<SignUp>` / env at `/{locale}/onboarding` when you want forced first-run (see `layout.tsx` + sign-up page).
3. **Step forms** — Replace `// TODO: implement form` in each step component.
4. **Marketing site** — Sibling repo `easy-intake-site`: `/en/signup`, `/es/signup` (unlisted) link to Clerk sign-up; deploy independently.

## Safety rules

See `.cursor/rules/onboading-safety.md` when extending onboarding (paths, additive Prisma only, etc.).
