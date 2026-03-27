---
name: document-changes
description: >-
  Proposes a concise per-file documentation edit plan for the Easy Intake monorepo, then applies edits only after the user sends an explicit approval phrase. Updates existing markdown only (allowlisted paths). Use when the user asks to sync docs with recent work, wants documentation changes after approving a summary, or mentions ARCHITECTURE, CONTEXT, SETUP, roadmap, or apps/web deployment docs.
---

# Document changes (summary first, apply after approval)

## Purpose

Keep **existing** canonical docs aligned with implemented behavior, deployment, and architecture **without** editing until the user explicitly approves a proposed summary.

## Hard rules

1. **Documentation and allowlisted markdown only** — does **not** change `apps/api`, application source, or `.env` unless the user expands scope in the same thread.
2. **No new documentation files** — only edit paths in the [allowlist](#allowlist). If something belongs in another file, list it under **Suggested follow-up (not edited)** in the summary.
3. **Two phases** — see [Workflow](#workflow). **Never** write to allowlisted files in Phase 1.

## Approval gate

- **Applying edits** requires the user to send **exactly** one of:
  - `APPLY DOC UPDATES`
  - `approved—apply`
- **Not** sufficient for apply: vague assent alone (“sounds good”, “yes”, “do it”) **if** the same message adds new requirements — treat as **re-plan** and issue a revised summary.
- **Partial approval:** If the user approves only some bullets, either re-issue a smaller summary for the approved items only or apply **only** what they explicitly listed, then confirm.

## Workflow

| Phase | Name | Action |
|-------|------|--------|
| **A** | Collect | From conversation, recent `git diff`, and open files, infer what changed (features, auth, deploy, web, shared package, etc.). |
| **B** | Propose | Output a **short summary**: bullet per file (from allowlist), what to add/change; **Files not modified**; **Suggested follow-up** for out-of-scope docs. |
| **C** | Wait | **Stop.** No edits until the user sends [`APPLY DOC UPDATES`](#approval-gate) or [`approved—apply`](#approval-gate). |
| **D** | Apply | **Re-read** current file contents from disk (avoid stale buffers if approval came later). Edit **only** allowlisted files; match existing tone, headings, and tables. |
| **E** | Report | Reply with **what was updated and where** (file paths + brief bullets). |

## Allowlist

Paths are relative to the **`easy-intake-app/`** repo root:

| Path | Typical use |
|------|-------------|
| `ARCHITECTURE.md` | Auth split, data flow, deployment, DB, integration TODOs |
| `CONTEXT.md` | Product scope, stack, auth layers, related docs |
| `SETUP.md` | Local setup, env overview, how to run web/api |
| `PRODUCT_ROADMAP.md` | High-level sequencing; light touch for “foundation” notes |
| `apps/web/README.md` | Next.js package scope, Clerk, middleware, deploy pointer |
| `apps/web/DEPLOY-PRODUCTION.md` | Vercel + Clerk production, env, DNS, troubleshooting |

Optional: adjust **`apps/web/.env.local.example`** only when documenting env var **names** and non-secret placeholders (never real keys).

## Edge cases

- **Stale approval:** If the user approves long after the summary, **re-read** allowlisted files before editing.
- **Monorepo rules:** Respect `.cursorrules` and project skills (e.g. do not modify `apps/api` unless asked).
- **Conflict with newer edits:** If disk content changed since the summary, reconcile or ask before overwriting.

## Canonical pointers

- Broader project rules: [`../../rules/project.mdc`](../../rules/project.mdc) (if present).
- See also: [`reference.md`](reference.md) for a change-type → doc mapping checklist.
