# Onboarding Feature Skill

## Description
Use this skill when building, modifying, or debugging the user onboarding
flow for Easy Intake. Triggers: onboarding, wizard, getting started, 
user setup, org setup, first-time user flow.

## Architecture
- Steps are config-driven: /packages/shared/src/onboarding/steps.config.ts
- State is persisted via Prisma: new `onboarding` JSON field on User model
- Frontend lives at: apps/web/app/[locale]/onboarding/
- API routes live at: apps/api/src/routes/onboarding/
- Auth: Clerk session in web, API JWT for backend calls (existing pattern)
- i18n: all text uses next-intl — never hardcode English strings

## Step Flow
wizard (UI tour) → profile/org setup (form) → personalization (branching) → done

## Key Constraints
- Steps are skippable unless marked required: true in config
- State saves server-side after EACH step (never only client-side)
- Branching logic lives only in: /lib/onboarding/getNextStep.ts
- Never gate the full app — onboarding is interruptible and resumable
- Respect existing Clerk user object — never overwrite or extend Clerk metadata directly; use our own DB record
