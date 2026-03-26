---
name: audit
description: Read-only audit of the codebase — no changes
---

This is a READ-ONLY session. Do not create, modify, 
or delete any files.

Please audit the current state of the codebase and report:

1. Any files that contradict documented project context or recorded decisions
   (use this repository’s canonical doc names from README or docs index—e.g. CONTEXT.md, DECISIONS.md if present)
2. Any hardcoded strings that should be in translations
3. Any domain-specific logic in generic components
4. Any auth patterns that do not follow this project’s documented authentication approach
5. Any TODO or FIXME comments that reference unfinished work
6. Any environment variables used in code but missing from the project’s environment-variable documentation
   (if the repo documents env vars in e.g. `.env.example` or dedicated env docs, compare against that; otherwise flag undocumented required variables)

Present findings as a prioritized list:
- CRITICAL: security or data issues
- HIGH: bugs or broken functionality  
- MEDIUM: code quality or consistency issues
- LOW: polish or nice-to-have improvements

Do not fix anything. Report only.
Type "WAITING FOR APPROVAL" when done.
