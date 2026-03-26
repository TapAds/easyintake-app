---
name: intake-monorepo-boundaries
description: Enforces correct package boundaries for the Easy Intake monorepo — engine vs web vs shared vs sibling marketing site, and policy to not change apps/api unless explicitly requested. Use when planning or editing code across apps/api, apps/web, packages/shared, or easy-intake-site; when the user mentions realtime intake, agent UI, WebSocket, Twilio, or Next.js shell.
---

# Intake monorepo boundaries

## Packages map

| Location | Role |
|----------|------|
| **`apps/api`** | Real-time intake engine: voice webhooks, transcription, AI extraction, scoring, CRM/SMS, WebSockets, Prisma. **Do not modify unless the user explicitly asks to change the API/engine.** |
| **`apps/web`** | Next.js 14: localized shell, Clerk auth, bilingual UI. **Not** the primary realtime agent dashboard. |
| **`packages/shared`** | Types and shared helpers consumed by api and/or web. |
| **`easy-intake-site`** | Sibling folder — **static marketing site**, **not** part of the npm workspace (`apps/*`, `packages/*`). |

## Agent / realtime UI

- The **current** realtime agent surface during calls is **`apps/api/public/agent.html`** (connects to the API WebSocket with application JWTs).
- Do **not** rebuild call recording, transcription, or full realtime agent tooling inside **`apps/web`** unless the product direction explicitly requires it and the user asks.

## Before you edit

1. **Confirm which app owns the change** — engine behavior and integrations live in **`apps/api`**; authenticated localized UX in **`apps/web`**.
2. If the user did not ask to touch **`apps/api`**, **do not** change it — propose API work and ask for confirmation instead.
3. **Never** describe **`easy-intake-site`** as inside the npm workspace.

## Canonical docs

- `CONTEXT.md` — product scope and boundaries.
- `ARCHITECTURE.md` — data flow, auth split, deployment notes.
