---
name: review
description: Security and quality review before merging
---

This is a READ-ONLY review session. Do not change anything.

Please review all changes made in this session for:

SECURITY:
- Any PII stored without encryption or proper access control
- Any API routes missing auth checks
- Any Clerk JWT not being validated correctly
- Any Supabase queries bypassing RLS
- Any secrets or API keys hardcoded or exposed

CORRECTNESS:
- Any TypeScript errors or type unsafe code
- Any missing error handling on API routes
- Any async operations without try/catch
- Any edge cases that could cause crashes

CONSISTENCY:
- Any code that contradicts DECISIONS.md
- Any insurance-specific logic in generic components
- Any hardcoded strings that should be translations
- Any new dependencies not documented in CONTEXT.md

ARCHITECTURE:
- Any functionality built in the wrong product
- Any direct GHL/CRM calls that should go through 
  EasyIntake App
- Any auth logic that duplicates existing helpers

Present findings as CRITICAL / HIGH / MEDIUM / LOW.
Do not fix anything. Report only.
Type "WAITING FOR APPROVAL" when done.
