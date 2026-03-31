---
name: decision-record
description: Draft an architectural decision record — apply to DECISIONS.md only after explicit doc approval
---

Capture a decision so future work does not unknowingly reverse it.

## Phase 1 — Draft only (no file edits)

From the conversation (or the user’s summary), produce an **ADR-style draft** with:

- **Title** — short name for the decision
- **Context** — what forces the decision (constraints, goals, tradeoffs)
- **Decision** — what was chosen (one clear statement)
- **Consequences** — positive, negative, and follow-ups (including doc or code updates if any)

Match the tone and table/section style of `DECISIONS.md` at the repo root where applicable.

**Do not** create, modify, or delete any files in Phase 1.

## Phase 2 — Persist (only after approval)

To **write or edit** `DECISIONS.md`, the user must send **exactly** one of:

- `APPLY DOC UPDATES`
- `approved—apply`

(same gate as [`../skills/document-changes/SKILL.md`](../skills/document-changes/SKILL.md).)

Until then, type `WAITING FOR APPROVAL` after the draft.

After approval: append or integrate the decision into `DECISIONS.md` per existing structure; re-read the file from disk before editing.
