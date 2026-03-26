---
name: review
description: Security and quality review before merging
---

This is a READ-ONLY review session. Do not change anything.

Please review all changes made in this session for:

SECURITY:
- Any PII stored without encryption or proper access control
- Any API routes missing auth checks
- Any auth tokens or sessions not being validated correctly
- Any data-access patterns that bypass intended authorization or row/tenant controls
- Any secrets or API keys hardcoded or exposed

CORRECTNESS:
- Any TypeScript errors or type unsafe code
- Any missing error handling on API routes
- Any async operations without try/catch
- Any edge cases that could cause crashes

CONSISTENCY:
- Any code that contradicts documented decisions (e.g. DECISIONS.md if present)
- Any domain-specific logic in generic components
- Any hardcoded strings that should be translations
- Any new dependencies not documented in project context or dependency documentation (e.g. CONTEXT.md if present)

ARCHITECTURE:
- Any functionality built in the wrong layer, service, or application boundary
- Any direct third-party or external integrations that should go through the project’s intended integration or API layer
- Any auth logic that duplicates existing helpers

Present findings as CRITICAL / HIGH / MEDIUM / LOW.
Do not fix anything. Report only.
Type "WAITING FOR APPROVAL" when done.
