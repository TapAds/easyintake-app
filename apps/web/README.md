# `@easy-intake/web`

This package is the **Next.js 14** front end for Easy Intake: a localized shell (`/en`, `/es` via next-intl) with **Clerk** for sign-in, sign-up, and protected routes. Today it covers the home experience and authentication flows; it is **not** the realtime voice agent dashboard, which lives in `apps/api` as static `public/agent.html`.

For product purpose, stack, integrations, and how this repo fits together, see **[`../../CONTEXT.md`](../../CONTEXT.md)** at the monorepo root of `easy-intake-app`.

**Deploy to production (Vercel + Clerk):** **[`DEPLOY-PRODUCTION.md`](DEPLOY-PRODUCTION.md)** — env vars, Clerk Production instance, domains/redirects, smoke test.
