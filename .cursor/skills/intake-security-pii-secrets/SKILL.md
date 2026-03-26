---
name: intake-security-pii-secrets
description: Short security checklist for Easy Intake — PII, secrets, auth on routes, customer messaging, and env documentation. Use when adding API routes, webhooks, logging, SMS, CRM sync, or env vars; when reviewing changes for security; complements full /audit and /review slash commands.
---

# Intake security — PII, secrets, auth

Use this as a **quick** pass when touching auth, webhooks, CRM, SMS, or storage. For a full read-only review, use the project’s **`/audit`** and **`/review`** slash commands.

## Secrets and config

- **No** API keys, tokens, or secrets in source or commits.
- **No** `.env` committed — use documented env vars and `.env.example` (or equivalent) when adding new configuration.
- If new env vars are required, **document** them where the repo documents environment setup.

## Authentication

- **Web (`apps/web`):** Clerk session and middleware — protect routes that should require login.
- **API (`apps/api`):** Application JWTs for Bearer and WebSocket — verify on protected routes; do not assume Clerk validates engine traffic.
- **Webhooks:** Validate shared secrets / signatures as implemented; reject invalid requests without leaking internals.

## PII and data access

- **PII** — Avoid logging full phone numbers, transcripts, or health/financial details in **plain** logs unless required and compliant; prefer redaction or structured logging policies already in the codebase.
- **Authorization** — Avoid patterns that bypass tenant or row-level controls where the product defines them.

## Customer-facing channels

- **SMS / messaging** — Do not send raw model output to customers; use approved templates and filtering where **`apps/api`** implements them.
- **CRM (e.g. GHL)** — Sync only what the product intends; respect field mapping and consent.

## Cross-reference

- **`.cursor/commands/review.md`** — full SECURITY / CORRECTNESS / CONSISTENCY / ARCHITECTURE review.
- **`.cursor/commands/audit.md`** — codebase-wide read-only audit.
