# `@easy-intake/web`

This package is the **Next.js 14** (App Router) front end for Easy Intake: a localized shell (**`/en`**, **`/es`** via next-intl) with **Clerk** (`<SignIn />` / `<SignUp />` on **`/[locale]/sign-in`** and **`/[locale]/sign-up`**, post-auth redirect to **`/[locale]/dashboard/queue`** as configured in layout and pages). Middleware composes **Clerk** and **next-intl** (public auth routes; other locale routes use `auth.protect()`). It imports **`@easy-intake/shared`** (run **`npm run build:shared`** from the monorepo root if `packages/shared/dist` is missing). Dashboard routes include queue and session detail (BFF/fixture-backed as implemented).

It is **not** the realtime in-call agent UI — that lives in **`apps/api`** as **`public/agent.html`**.

For product purpose, stack, integrations, and how this repo fits together, see **[`../../CONTEXT.md`](../../CONTEXT.md)** at the monorepo root of `easy-intake-app`.

**Deploy to production (Vercel + Clerk):** **[`DEPLOY-PRODUCTION.md`](DEPLOY-PRODUCTION.md)** — monorepo install/build via [`vercel.json`](vercel.json), env vars, Clerk Production, DNS, smoke test.
