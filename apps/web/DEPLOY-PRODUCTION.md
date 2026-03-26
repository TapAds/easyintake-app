# `apps/web` — production (Vercel + Clerk)

Use this checklist when moving **`easyintake-app-web`** from local/dev keys to **Clerk Production** and a stable **Vercel** URL. Dashboard labels change over time; if a step does not match your Clerk UI, search the dashboard for **Domains**, **Paths**, **Redirect URLs**, or **Allowed origins**.

---

## 1. Vercel project

| Setting | Value |
|--------|--------|
| **Project** | `easyintake-app-web` |
| **Root Directory** | `apps/web` |
| **Framework** | Next.js (auto-detected) |

- Connect the Git repo and deploy **`main`** (or your production branch).
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
| `NEXT_PUBLIC_CLERK_*_REDIRECT_URL` / `*_FALLBACK_*` | `/en/dashboard/queue` (defaults; app also sets locale in code) | Same |

- **Never** commit real keys. Set them only in Vercel (and local `.env` / `.env.local` for dev).
- After changing env vars, **redeploy** (or trigger a new deployment) so the build picks them up.

---

## 3. Clerk — production instance

1. In [Clerk Dashboard](https://dashboard.clerk.com), open your application and switch to the **Production** instance (create it if you only had Development before).
2. **API keys:** Copy the **Production** publishable and secret keys into Vercel **Production** env (step 2).
3. **Domains / URLs:** Register the URL users open in the browser:
   - Production hostname from Vercel (e.g. `easyintake-app-web.vercel.app` or `app.yourdomain.com`).
   - Follow Clerk’s prompts to add DNS or verify the domain if required.
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
| Infinite redirect or “redirect URL not allowed” | Clerk domain + redirect/path settings for your exact production origin and `/en|es/sign-in` paths. |
| Works locally, 500 or blank on Vercel | Env vars set for **Production** and a **new deploy** after saving them. |
| Wrong Clerk branding / users | Vercel is still using **Development** keys; switch to Production keys for Production env. |

---

## See also

- Monorepo deployment overview: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) (§7).
- Local env template: [`.env.local.example`](.env.local.example).
