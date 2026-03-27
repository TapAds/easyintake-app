# `apps/web` — production (Vercel + Clerk)

Use this checklist when moving **`easyintake-app-web`** from local/dev keys to **Clerk Production** and a stable **Vercel** URL. Dashboard labels change over time; if a step does not match your Clerk UI, search the dashboard for **Domains**, **Paths**, **Redirect URLs**, or **Allowed origins**.

---

## 1. Vercel project

| Setting | Value |
|--------|--------|
| **Project** | `easyintake-app-web` |
| **Root Directory** | `apps/web` |
| **Include files outside the root directory in the Build Step** | **Enabled** (required so `packages/shared` and the root lockfile are present) |
| **Framework** | Next.js (auto-detected) |

- Connect the Git repo and deploy **`main`** (or your production branch). **GitHub `main` must include the same `apps/web` and `packages/shared` sources you expect** — Vercel only builds what is pushed.
- This package ships [`vercel.json`](vercel.json) so **install** runs at the **monorepo root** (`npm ci`), then **build** runs **`@easy-intake/shared`** first (generates `packages/shared/dist`), then **`@easy-intake/web`** — required because `@easy-intake/shared` is not committed prebuilt.
- After the first successful deploy, note the **Production** hostname (e.g. `https://easyintake-app-web.vercel.app` or your custom domain).

---

## 2. Environment variables (Vercel)

In **Vercel → Project → Settings → Environment Variables**, add the same keys as [`.env.local.example`](.env.local.example), scoped per environment:

| Variable | Production | Preview (optional) |
|----------|------------|-------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Production** publishable key from Clerk | Development key if previews should use dev Clerk |
| `CLERK_SECRET_KEY` | **Production** secret key from Clerk | Matching instance |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/en/sign-in` | Same (locale-relative paths work on any host) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/en/sign-up` | Same |
| `NEXT_PUBLIC_API_URL` | HTTPS origin of **`apps/api`** on Railway (e.g. `https://your-api.up.railway.app`) | Staging API if needed |
| `NEXT_PUBLIC_AGENT_HTML_URL` | Optional; same as API origin if agent static files are served there | Same |
| `API_JWT_SECRET` | **Same value as** `API_JWT_SECRET` on **`apps/api`** — used by Route Handlers to mint WebSocket JWTs for the agent console | Never expose to the browser; server-only on Vercel |

- **Never** commit real keys. Set them only in Vercel (and local `.env` / `.env.local` for dev).
- After changing env vars, **redeploy** (or trigger a new deployment) so the build picks them up.

---

## 3. Clerk — production instance

1. In [Clerk Dashboard](https://dashboard.clerk.com), open your application and switch to the **Production** instance (create it if you only had Development before).
2. **API keys:** Copy the **Production** publishable and secret keys into Vercel **Production** env (step 2).
3. **Domains / URLs:** Register the URL users open in the browser:
   - Production hostname from Vercel (e.g. `easyintake-app-web.vercel.app` or `app.yourdomain.com`).
   - Follow Clerk’s prompts to add DNS or verify the domain if required.
   - **Clerk Production DNS (custom domain):** Clerk may require **CNAME** records at your DNS host (e.g. Namecheap) for subdomains such as **`clerk`** → Clerk frontend API, **`accounts`** → account portal, and **email/DKIM** hosts (`clkmail`, `clk._domainkey`, etc.) — add exactly what the Clerk **DNS** / **Domains** UI lists, then **Verify** in Clerk.
4. **Redirects / allowed paths:** This app uses **path-based** routing with locales:
   - Sign-in: `/en/sign-in`, `/es/sign-in` (and Clerk may use nested paths such as `/en/sign-in/**`).
   - Sign-up: `/en/sign-up`, `/es/sign-up`.
   - Default post-auth route in app code: `/[locale]/dashboard/queue`.
   - Ensure Clerk allows redirects and OAuth return URLs for those paths on your production origin. If Clerk offers wildcard patterns for preview deployments (e.g. `*.vercel.app`), use them only if you accept that security tradeoff.

5. **Development vs Production:** Keep using **Development** keys locally (`.env.local`). Use **Production** keys only on Vercel Production (and optionally Preview if you configure Clerk accordingly).

---

## 4. Smoke test (production)

1. Open `https://<your-production-host>/en/sign-in`.
2. Sign in with a test user created in the **Production** Clerk instance (or sign up if allowed).
3. Confirm redirect to `/en/dashboard/queue` (or `/es/...` after switching locale).
4. Confirm sign-out returns to the localized sign-in URL.

---

## 5. Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| **Build:** `Can't resolve '@easy-intake/shared'` | Monorepo install must run at **repo root**; **`@easy-intake/shared` must be built before** `next build` (see [`vercel.json`](vercel.json)). Enable **Include files outside the root directory**. Ensure **`package-lock.json`** at the monorepo root is committed so `npm ci` succeeds. |
| Infinite redirect or “redirect URL not allowed” | Clerk domain + redirect/path settings for your exact production origin and `/en|es/sign-in` paths. |
| Works locally, 500 or blank on Vercel | Env vars set for **Production** and a **new deploy** after saving them. |
| Wrong Clerk branding / users | Vercel is still using **Development** keys; switch to Production keys for Production env. |
| **404** on `/en/...` in production | Confirm **latest `main` is pushed** to GitHub and Vercel built that commit; stale deploys can lack current `[locale]` routes. |

---

## 6. Observability (read-only — spend / CPU insight)

Use the Vercel dashboard to see **where** this project spends compute and time. This is **read-only** (no code or config changes); it supports **billing** and **“build vs runtime”** conversations.

1. Open **[Vercel](https://vercel.com) → your team → project `easyintake-app-web` → Observability**.
2. **Separate builds from runtime:** In **Observability → Build Diagnostics**, review build duration and step breakdown. High numbers here are **CI/build cost**, not user traffic.
3. **Top routes / serverless work:** In **Observability → Vercel Functions**, use **invocations and performance by route** (and error rate) to see which paths drive **function** usage. See Vercel’s [Observability Insights](https://vercel.com/docs/observability/insights) and [cost impact of function invocations](https://vercel.com/kb/guide/understand-cost-impact-of-function-invocations).
4. **Middleware:** **Observability → Middleware** shows invocation counts and latency for `middleware.ts` (Clerk + next-intl). Useful if you suspect middleware-heavy traffic.
5. **Edge / CDN layer:** **Observability → Edge Requests** shows request volume and caching per route at the edge (distinct from Functions CPU).
6. **Fluid / CPU:** If your plan surfaces **Fluid** or **Active CPU** for serverless/Edge, interpret it alongside the tabs above — **Functions** and **Middleware** align most closely with per-invocation CPU-style spend; **Edge Requests** reflects edge traffic volume.

**Plan note:** Some breakdowns (e.g. deeper path analytics) may require **Observability Plus** or a higher tier; labels change over time — search the project for **Observability** or **Usage** if the menu differs.

---

## See also

- Monorepo deployment overview: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) (§7).
- Local env template: [`.env.local.example`](.env.local.example).
