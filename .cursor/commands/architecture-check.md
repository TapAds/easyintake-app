---
name: architecture-check
description: Review structure, layering, and guideline fit — read-only unless asked to fix
---

This session is **read-only for code and config** unless the user explicitly asks you to implement fixes.

Review the project architecture against documented boundaries (use this repository’s canonical names from README or docs index—e.g. `CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, monorepo rules).

Check for:

1. **Layering** — code in the wrong package or module relative to documented responsibilities
2. **Boundaries** — generic UI or shared layers containing domain-specific logic that belongs in vertical config or the owning service
3. **Duplication** — parallel implementations of the same concern (services, validators, clients)
4. **Guideline violations** — patterns that contradict recorded decisions or project rules

Output:

- **Findings** ordered by severity (CRITICAL / HIGH / MEDIUM / LOW)
- **Recommended corrections** (concrete, scoped suggestions — do **not** perform broad refactors unless the user asks)
- **Doc gaps** — if architecture docs are missing or stale, say what should be updated (point to paths only; do not paste long doc rewrites here)

Do not change files. Report only.

Type `WAITING FOR APPROVAL` when done.
