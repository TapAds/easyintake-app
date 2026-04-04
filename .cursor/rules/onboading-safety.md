---
description: Safety constraints when building the onboarding feature
alwaysApply: true
---

# Onboarding Safety Rules

- DO NOT modify any existing files unless I explicitly say "you may edit [filename]"
- DO NOT touch: middleware.ts, clerk config, next-intl setup, Prisma schema (existing models), existing API routes, agent.html, or any existing dashboard pages
- ALL new frontend code goes in apps/web/app/[locale]/onboarding/ only
- ALL new API routes go in apps/api/src/routes/onboarding/ only
- ALL new Prisma changes are ADDITIVE only — new fields or new models, never alter or drop existing ones
- ALL new shared types go in packages/shared/src/onboarding/ only
- If a task requires touching ANY existing file, STOP — tell me: (1) which file, (2) what change, (3) why. Then wait for explicit approval before proceeding
- Never modify existing Clerk configuration, Twilio routes, Deepgram handlers, GHL sync, or intake session logic