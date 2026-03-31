---
name: test-plan
description: Testing strategy before or after implementation — scopes, edge cases, failures
---

Produce a **testing plan** for the feature, fix, or change under discussion.

Cover:

1. **Unit-level** — pure logic, validators, helpers; what mocks or fixtures are enough
2. **Integration** — HTTP handlers, database access, message or job handlers, third-party adapters (black-box or contract style)
3. **End-to-end / manual** — critical user paths if automated E2E is out of scope
4. **Edge cases** — empty input, boundary values, concurrency, idempotency, timeouts
5. **Failure scenarios** — upstream errors, invalid auth, partial writes, retry behavior

Map checks to **rough areas of the repo** (e.g. web app, API service, shared package) without assuming a specific test framework unless the user names one.

If automated tests are not requested, still list **what should be verified** so nothing critical is missed.

Type `WAITING FOR APPROVAL` when done (or when you need missing scope from the user).
