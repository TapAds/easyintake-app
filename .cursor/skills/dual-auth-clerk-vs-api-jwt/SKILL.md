---
name: dual-auth-clerk-vs-api-jwt
description: Applies Easy Intake’s two-layer auth model — Clerk for apps/web sessions vs HS256 API JWTs for apps/api Bearer and WebSocket/agent tokens. Use when implementing or reviewing auth, protected routes, middleware, fetch to the API, internal tokens, or agent connections; when the user mentions Clerk, JWT, API_JWT_SECRET, or WebSocket auth.
---

# Dual auth: Clerk (web) vs API JWT (engine)

## Facts

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **`apps/web`** | **Clerk** | Browser session: sign-in/up, middleware, `ClerkProvider`, `auth()` / route protection on localized routes. |
| **`apps/api`** | **HS256 JWT** (`API_JWT_SECRET`) | `Authorization: Bearer` for protected HTTP routes; short-lived tokens for **agent WebSocket** and similar — **not** Clerk session JWTs. |

## Do not conflate

- **Clerk** validates **end-user** web sessions. It is **not** the signing key for the intake engine’s Bearer or WebSocket tokens.
- **API JWTs** are **application-defined** payloads (e.g. `sub`, `purpose`), signed with **`API_JWT_SECRET`**.

## Decision cues

| Where am I? | Use |
|-------------|-----|
| Next.js page, layout, middleware, server component in **`apps/web`** | Clerk patterns and env vars for **Clerk**; protect routes that should require login. |
| Express route, webhook handler, Prisma, WebSocket upgrade in **`apps/api`** | Application JWT verification and existing helpers; **not** Clerk JWTs unless you explicitly built a bridge (not assumed). |
| “Call the intake API from the browser” | Prefer **server-side** routes (BFF) that call the API with the right credentials — do **not** assume the browser’s Clerk session authenticates the engine unless the codebase has that integration. |

## Reporting / dashboards

- Clerk-backed UI that needs engine data should follow a **BFF** pattern: server routes that call **`apps/api`** with appropriate credentials — see `ARCHITECTURE.md` / `REPORTING_HUB.md`.

## Forbidden

- **Supabase Auth** — do not use in this product.
- **Claiming “Clerk is the only auth”** for the whole product — always say **web vs API**.

## Reference

- `ARCHITECTURE.md` — Authentication (split).
