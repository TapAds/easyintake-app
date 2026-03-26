---
name: next-intl-user-facing-copy
description: Ensures all user-facing strings in apps/web use next-intl with English and Spanish locales. Use when adding or editing UI text, errors, buttons, labels, or validation messages under apps/web; when the user mentions /en, /es, translation, i18n, or locale.
---

# next-intl user-facing copy (`apps/web`)

## Requirements

- **Locales:** Support **English** and **Spanish** via the app’s locale routing (**`/en`**, **`/es`**) and next-intl setup.
- **No hardcoded user-facing strings** in components — use message keys and the project’s translation files (follow existing patterns: `useTranslations`, message files, routing).
- **Developer-only** strings (e.g. internal `console` labels in dev-only code) are not end-user copy — still avoid leaking PII.

## Workflow

1. **Add or update** key in the appropriate message catalog (match existing structure under `apps/web`).
2. **Use** the same hooks/components the rest of the app uses for next-intl.
3. **Provide both locales** for every new user-visible key before considering the change complete.
4. **Do not** introduce a second i18n library or ad‑hoc JSON for the same UI surface.

## Cross-rule

- The **`.cursor/rules/web-i18n.mdc`** rule applies when editing `apps/web/**` — keep this skill and that rule consistent.

## Reference

- `CONTEXT.md` — bilingual requirement.
