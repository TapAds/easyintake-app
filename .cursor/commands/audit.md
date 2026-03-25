---
name: audit
description: Read-only audit of the codebase — no changes
---

This is a READ-ONLY session. Do not create, modify, 
or delete any files.

Please audit the current state of the codebase and report:

1. Any files that contradict CONTEXT.md or DECISIONS.md
2. Any hardcoded strings that should be in translations
3. Any insurance-specific logic in generic components
4. Any auth patterns that don't use Clerk correctly
5. Any TODO or FIXME comments that reference unfinished work
6. Any environment variables used in code but missing 
   from .env.example

Present findings as a prioritized list:
- CRITICAL: security or data issues
- HIGH: bugs or broken functionality  
- MEDIUM: code quality or consistency issues
- LOW: polish or nice-to-have improvements

Do not fix anything. Report only.
Type "WAITING FOR APPROVAL" when done.
