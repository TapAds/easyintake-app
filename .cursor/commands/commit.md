---
name: commit
description: Commit and deploy all changes with a standard message
---

Please do the following in order:

1. Run the build to confirm it passes before committing
2. Stage all changed files excluding node_modules, .env files, 
   and any files in .gitignore
3. Write a commit message following this format:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation only changes
   - refactor: for code changes that aren't fixes or features
   - chore: for dependency updates or config changes
4. Push to the branch used for production or integration (as configured by the project)
5. Confirm that CI/CD or hosting deployment triggered or completed as configured by the project

Do not commit .env files, node_modules, or any file 
containing API keys or secrets.
Report each step before moving to the next.
