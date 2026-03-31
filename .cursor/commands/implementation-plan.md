---
name: implementation-plan
description: Turn an approved spec into ordered tasks, dependencies, and verification
---

Convert the feature or change into an **implementation plan** (not code yet).

Include:

1. **Goal** — one sentence tied to acceptance criteria
2. **Tasks** — ordered list with clear outcomes; note **dependencies** between tasks
3. **Touch points** — which apps/packages/services likely change (without naming vendor-specific stacks in this command’s output unless the repo already does)
4. **Contracts** — API, events, shared types, or data migrations that must land in a specific order
5. **Testing / verification** — what to run or check after each phase (link to or follow with `/test-plan` if needed)
6. **Risks** — rollback, feature flags, or env assumptions

For **this monorepo**, apply package boundaries and “do not edit the engine app unless asked” rules from [`../skills/feature-to-task-breakdown/SKILL.md`](../skills/feature-to-task-breakdown/SKILL.md) when scoping work.

If scope is large, ask the user to confirm the plan before implementation.

Type `WAITING FOR APPROVAL` when the plan is ready.
