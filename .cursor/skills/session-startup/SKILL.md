---
name: session-startup
description: >-
  Orients the agent at the start of a Cursor session or when context must be re-established. Triggers on phrases like "let's get started", "where were we", "what's the current state", "bring yourself up to speed", "orient yourself", "new session", or a new chat without task context. Reads core repo docs efficiently (skim-first, scoped depth, cap on full reads) before asking what to work on.
---

# Session Startup Skill

Orients Cursor at the start of a session so no time is wasted re-explaining the project, its structure, or its current state.

## Core Principle

**Read first. Ask nothing until you've read enough available context.**

Never ask the user "what are we working on?" before checking what the project already documents about itself.

## Token-efficient reading (apply before and during the sequence below)

1. **Skim before committing:** For each candidate doc, read **headings and the first paragraph** (only) first. Fully read the file only if that skim suggests it matters for this session.
2. **Match depth to focus:** Infer the **likely session focus** from the user's first message (or "general orientation" if none). A **narrow** task (e.g. one route, one env var) gets a **narrow** startup; do not deep-read unrelated areas.
3. **Cap full reads:** Perform at most **3 full file reads** total before presenting the orientation summary. Skims do not count toward this cap. If more context is needed after the summary, read incrementally after the user answers.
4. **Prefer fresh docs:** When choosing which files to skim or fully read, **prioritize recently modified** documentation over obviously static docs (use `git` or file metadata when available).
5. **Skip when stale and irrelevant:** If a doc **has not changed recently** and its **topic does not match** the inferred session focus, **skip** it (skim-only or omit entirely).

---

## Startup Sequence

### Step 1 — Discover the Project Structure

Scan the root of the project and identify:
- Top-level directories and their purpose
- All documentation files (`.md`, `.txt`, `README*`)
- Config files that reveal the stack (`package.json`, `docker-compose.yml`, `railway.toml`, `vercel.json`, etc.)
- Any `.cursor/` directory and its contents (rules, skills, context)

### Step 2 — Read Core Docs in Priority Order

Consider documentation in this **priority** order. Apply **[Token-efficient reading](#token-efficient-reading-apply-before-and-during-the-sequence-below)** throughout: skim headings + first paragraph first; prefer recently modified files; skip or skim-only docs that are old and irrelevant to the session focus; stay within **3 full reads** before Step 3.

1. `CONTEXT.md` or equivalent — overall project context
2. `ARCHITECTURE.md` or equivalent — system structure and design
3. `PRODUCT_ROADMAP.md` or equivalent — current priorities and direction
4. `DECISIONS.md` or equivalent — key decisions already made
5. `SETUP.md` or equivalent — how the project runs locally and in production
6. Any service-specific `README.md` files for the area being worked on
7. `.cursor/skills/` — what skills are available and what patterns they enforce (directory listing + skim `SKILL.md` descriptions as needed; full read only if it counts toward the 3-file cap and is justified by focus)

### Step 3 — Synthesize and Present Orientation Summary

Present a concise session brief to the user:

```
SESSION ORIENTATION

Project: [name and one-line description]

Stack: [key technologies and services]

Current priorities: [from roadmap or recent docs]

Recent changes: [anything that looks newly updated in docs]

Active skills: [list of .cursor/skills/ available]

Areas I'm less certain about: [anything undocumented or unclear]

Ready. What are we working on today?
```

### Step 4 — Ask One Focused Question

After the summary, ask only what you still need to start:

- If priorities are clear from docs: just confirm which area to tackle
- If docs are sparse: ask what the focus is for this session
- Never ask multiple questions at once

---

## Rules

- **Read before asking** — the answer is usually already in the docs
- **Be honest about gaps** — if something isn't documented, say so rather than guessing
- **Don't summarize what you haven't read** — if a file is too large to fully read within the cap, say so; you may have skimmed it only
- **Flag anything fragile or pending** — if docs mention something incomplete or at risk, surface it immediately
- **One question max** — if you need clarification, ask the single most important thing

---

## When to Re-Trigger Mid-Session

Re-run the orientation summary (abbreviated) if:
- The user switches to a different app or service within the monorepo
- A major unexpected error suggests the current state differs from what was documented
- The user says "actually let's work on X instead"

When re-triggering, apply **[Token-efficient reading](#token-efficient-reading-apply-before-and-during-the-sequence-below)** again; a mid-session switch usually warrants a **narrow** scope and fewer full reads.
