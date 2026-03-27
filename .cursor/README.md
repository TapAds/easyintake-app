# Cursor configuration (`easy-intake-app`)

This folder holds **project-scoped** Cursor settings for the monorepo.

## What lives here

| Item | Path | Purpose |
|------|------|---------|
| **Rules** | `rules/*.mdc` | Always-on or glob-scoped constraints (replaces relying on a single root `.cursorrules` for this repo). |
| **Skills** | `skills/<name>/SKILL.md` | Task-focused instructions the agent can apply when the `description` matches the user’s request. |
| **Slash commands** | `commands/*.md` | User-invoked prompts via `/` — rituals, templates, read-only audits, approval gates. |

## Slash commands vs skills

- **Slash commands** — You type `/` and pick a command (e.g. `spec`, `audit`, `review`, `commit`). Use these for **explicit workflows**, long checklists, or steps that must say “do not edit files” / “WAITING FOR APPROVAL.”
- **Skills** — The agent pulls these in when relevant **without** you invoking a command. Use skills for **repeatable principles** (auth layers, monorepo boundaries, i18n, contract sync). Examples: **`session-startup`** orients the session by reading core docs with skim-first rules and a cap on full reads (see [`skills/session-startup/SKILL.md`](skills/session-startup/SKILL.md)); **`document-changes`** proposes documentation edits to allowlisted markdown, then applies only after **`APPLY DOC UPDATES`** or **`approved—apply`** (see [`skills/document-changes/SKILL.md`](skills/document-changes/SKILL.md)); **`debugging-protocol`** structures diagnosis and fixes with narrow scope and a cap on full file reads before the first hypothesis (see [`skills/debugging-protocol/SKILL.md`](skills/debugging-protocol/SKILL.md)).

Do **not** duplicate full command bodies inside skills; keep skills short and link to `commands/` where useful.

## Parent workspace note

If your Cursor workspace root is the **parent** folder (`Easy Intake`) instead of `easy-intake-app/`, ensure Cursor loads this project’s `.cursor` (open the `easy-intake-app` folder as the project root, or rely on your Cursor version’s multi-root behavior). A root-level `.cursorrules` may still exist outside this repo; consolidate when ready.
