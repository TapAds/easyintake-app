# PM cheat sheet — Cursor skills (Easy Intake)

Project skills live under `.cursor/skills/<skill-name>/SKILL.md`. Each row is a **one-line outcome** and **when to invoke** (for humans steering the agent, or for self-orientation).

| Skill | What it accomplishes | When to run it |
|--------|----------------------|----------------|
| **feature-to-task-breakdown** | Produces a dependency-ordered task list, scope, risks, and definition of done **before** code; waits for explicit approval phrases before implementation. | Planning a feature, scoping multi-file or cross-package work, or asking to break down, estimate, or plan implementation. |
| **session-startup** | Orients on repo structure and docs efficiently (skim-first, read caps) before asking what to work on. | New chat, “where were we,” “bring yourself up to speed,” or any session that needs ground truth from the repo. |
| **debugging-protocol** | Structures investigation: evidence first, one hypothesis and one fix at a time; token-efficient reads before changing code. | Errors, stack traces, “not working,” “help me debug,” or before attempting a non-obvious fix. |
| **document-changes** | Proposes per-file doc edits to **allowlisted** markdown only; applies edits **after** explicit approval (`APPLY DOC UPDATES` / `approved—apply`). | Syncing ARCHITECTURE, CONTEXT, SETUP, roadmap, or web deploy docs with recent work; never for “just change code.” |
| **http-contract-spec-sync** | Keeps `api-contract` specs aligned with what **`apps/api`** actually returns (paths, payloads, status codes). | Webhook or partner HTTP contract work, `WEBHOOK_SPEC`, intake webhook, or any risk of spec vs handler drift. |
| **intake-monorepo-boundaries** | Enforces which package owns what (engine vs web vs shared vs sibling marketing site); **no `apps/api` edits** unless the user explicitly asks. | Cross-package changes, realtime/agent/WebSocket/Twilio topics, or clarifying where a feature must live. |
| **dual-auth-clerk-vs-api-jwt** | Applies the two-layer model: **Clerk** for `apps/web` sessions vs **HS256 API JWT** (`API_JWT_SECRET`) for API Bearer/WebSocket/agent. | Auth, middleware, protected routes, API calls from web, agent tokens, or mentions of Clerk vs JWT. |
| **next-intl-user-facing-copy** | Ensures user-facing copy in `apps/web` uses **next-intl** with **en** and **es**; no hardcoded UI strings. | Any new or changed UI text, errors, labels, `/en` / `/es`, translation, or i18n under `apps/web`. |
| **config-driven-domain-vs-generic-ui** | Keeps vertical-specific rules and copy in config/domain code, not embedded in generic React components. | New fields/labels/tooltips by vertical, refactors in shared UI, or “vertical-agnostic / config-driven” discussions. |
| **intake-security-pii-secrets** | Quick security pass: secrets out of source, webhook validation, PII/logging hygiene, env documentation. | New routes, webhooks, logging, SMS/CRM, env vars, or a lighter pass than full `/audit` / `/review`. |

## Related

- Workspace rules: parent folder `.cursorrules` (if present).
- Full doc update workflow and allowlist: `.cursor/skills/document-changes/SKILL.md`.
