---
name: feature-to-task-breakdown
description: >-
  Turns a feature or significant work into a dependency-ordered task list before coding. Use when planning new features, scoping multi-file work, or the user asks to break down, plan, or estimate implementation. Waits for an explicit approval phrase before implementation.
---

# Feature to task breakdown

Turns a feature idea or requirement into a clear, sequenced, dependency-aware task list **before** implementation starts.

## Triggers

Use this skill when:

- The user wants to build or add something non-trivial (“I want to build X”, “let’s add Y”, “plan this out”, “break this down”, “what would it take”, “scope this feature”).
- Work likely touches **more than one file** or **more than one package** (see [Easy Intake map](#easy-intake-map)).
- You would otherwise start coding without a shared picture of scope and order.

**Proactively:** Before writing non-trivial code, run a breakdown if the blast radius is unclear.

## When to skip (or shorten) a full breakdown

Skip the long form only when:

- The change is **trivial** (single obvious file, typo, one-line config) **and** scope is unambiguous.
- The user **explicitly** asks to skip planning (“just implement”, “quick fix only”).

Still give a **one-line mini-scope** (what will change and where) if anything could be misread.

## Easy Intake map

Align the breakdown with repo boundaries (see also [../../../../.cursorrules](../../../../.cursorrules) and [`../intake-monorepo-boundaries/SKILL.md`](../intake-monorepo-boundaries/SKILL.md)):

| Location | Role |
|----------|------|
| **`apps/api`** | Real-time intake engine (voice, transcription, AI, WebSockets, Prisma, integrations). **Do not plan edits here unless the user explicitly asks to change the API/engine.** |
| **`apps/web`** | Next.js shell, Clerk, bilingual user-facing UI. |
| **`packages/shared`** | Shared types and helpers — often **first** in the task order if consumers need new contracts. |
| **`easy-intake-site`** | Sibling marketing site — **not** in the npm workspace; call it out if the feature touches it. |

**Auth:** If the feature touches sessions, tokens, or “who is logged in”, distinguish **Clerk (web)** from **API JWTs** signed with `API_JWT_SECRET`. See [`../dual-auth-clerk-vs-api-jwt/SKILL.md`](../dual-auth-clerk-vs-api-jwt/SKILL.md).

**User-facing copy in `apps/web`:** Plan for **next-intl** (en/es); no hardcoded UI strings. See [`../next-intl-user-facing-copy/SKILL.md`](../next-intl-user-facing-copy/SKILL.md).

**Domain vs generic UI:** Avoid vertical-specific logic in generic web components; prefer config-driven behavior. See [`../config-driven-domain-vs-generic-ui/SKILL.md`](../config-driven-domain-vs-generic-ui/SKILL.md).

## Core principle

**Plan before building. Sequence matters. Scope must be explicit before work begins.**

Half-built features often come from coding before the full shape of the work is clear — what it touches, what it depends on, and in what order things must happen.

---

## Breakdown process

### Step 1 — Understand the feature

Before breaking anything down, ensure the feature is understood enough to plan. Ask only what is missing:

- What is this for? (user-facing, internal, infrastructure)
- What does success look like? (what can a user do that they could not before)
- Constraints? (timeline, must not break X, must work with Y)
- Anything already built that this connects to or replaces?

Do not ask all of these if context already answers them.

### Step 2 — Identify what is touched

Map blast radius:

- Which services / apps are involved (`apps/web`, `apps/api`, `packages/shared`, external `easy-intake-site` if applicable)
- Which existing files will be modified
- What new files or routes will be created
- Database schema changes (if any)
- External integrations
- Environment variables needed
- Documentation updates (if the [`document-changes`](../document-changes/SKILL.md) workflow applies later)

### Step 3 — Dependencies and risks

Before sequencing tasks, call out:

- **Hard dependencies** — must exist before other work can start
- **Shared package changes** — anything other services depend on
- **Breaking changes** — anything that could break existing behavior
- **Unknowns** — needs investigation before estimate or start

### Step 4 — Present the task breakdown

Use this structure:

```
FEATURE: [name]
GOAL: [one sentence — what this enables]

SCOPE:
- Services touched: [list]
- New files: [list]
- Modified files: [list]
- Env vars needed: [list or "none"]
- Docs to update: [list or "none"]
- Out of scope / non-goals: [what we are explicitly not doing]

RISKS / UNKNOWNS:
- [anything that could go wrong or needs investigation first]

TASKS (in order):
1. [Task] — [why this comes first / what it unblocks]
2. [Task] — [dependency on task 1]
3. [Task]
...

DEFINITION OF DONE:
- [specific, verifiable condition 1]
- [specific, verifiable condition 2]
```

### Step 5 — Approval gate (before building)

Present the breakdown and ask whether it matches expectations (anything missing, out of scope, or wrong order).

**Do not start implementation** until the user sends **exactly** one of:

- `APPROVED — START BUILD`
- `confirmed — implement`

**Not sufficient to start coding:** vague assent alone (“sounds good”, “yes”, “do it”) **if** the same message adds new requirements — treat as **re-plan** and issue a revised breakdown.

**Partial approval:** If the user approves only some tasks, either re-issue a smaller breakdown for the approved slice or implement **only** what they explicitly listed, then confirm.

This mirrors the explicit gate pattern in [`../document-changes/SKILL.md`](../document-changes/SKILL.md) (different phrases, same intent).

---

## Rules

- **No code before the breakdown is confirmed** — not even a “quick start”
- **Sequence tasks by dependency**, not by ease or interest
- **Shared package changes first** when downstream apps need new contracts
- **Call out breaking changes explicitly** — never bury them in a task line
- **Keep tasks concrete** — each task should fit one focused session; split vague work further
- **Definition of done is required** — if you cannot say how you will know it works, scope is not tight enough

---

## When to re-run

Re-run the breakdown (can be abbreviated) if:

- A significant unknown is resolved and changes the shape of the work
- A task is much larger than expected
- The user adds scope mid-build
- Something breaks in a way that suggests incomplete scope
