---
name: config-driven-domain-vs-generic-ui
description: Keeps vertical-specific behavior in config and domain modules, not in generic web components. Use when adding fields, labels, tooltips, validation, or UI that varies by vertical; when refactoring React components in apps/web; when the user mentions vertical-agnostic intake, config-driven schema, or domain logic.
---

# Config-driven domain vs generic UI

## Goal

The **intake engine** is aimed at **vertical-agnostic** behavior: schemas, labels, tooltips, and copy should be **config-driven** where the engine is shared.

**Today** some persistence and domain code may still reflect a first vertical — treat **generalization** as an architectural direction, not a guarantee that every layer is already generic.

## Rules

1. **Generic components** in **`apps/web`** — reusable layout, inputs, tables — must **not** embed vertical-specific business rules or copy that belong to one vertical.
2. Put **vertical-specific** field definitions, prompts, rules, and defaults in **vertical config** and/or **`apps/api`** domain modules, as the codebase already does for the reference vertical.
3. If a string must differ by vertical, it should come from **config or data**, not from a hardcoded branch in a shared component.

## When adding UI

- Ask: **Is this string or rule specific to one vertical?** If yes — **config/API**, not a shared component constant.
- Ask: **Could a second vertical reuse this component?** If yes — **inject** labels and behavior via props, config, or API.

## Audit alignment

- Same theme as codebase audits: **domain-specific logic in generic components** is a **high** priority fix.

## Reference

- `CONTEXT.md` — principles and “owns vs does not”.
- `ARCHITECTURE.md` — database honesty and vertical evolution.
