---
name: trace-flow
description: Trace a request, job, or event through the system from entry to exit
---

The user should name an **entry point** (e.g. HTTP route and method, WebSocket message type, CLI command, queue job name, webhook path).

Trace the flow:

1. **Entry** — where the request or event enters (file or module if known; otherwise discover via search)
2. **Middleware and auth** — session, tokens, or guards applied on the path
3. **Application logic** — main handlers and services (in order)
4. **Data and side effects** — database reads/writes, caches, outbound calls to third-party systems
5. **Response or completion** — how the result is returned, emitted, or acknowledged

Use **plain-language steps** and file/path references where helpful. Call out **branches** (success vs error paths) if they differ materially.

If the entry point is ambiguous, list assumptions or ask one clarifying question, then proceed with the best-match path.

Type `WAITING FOR APPROVAL` when the trace is complete.
