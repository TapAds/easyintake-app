---
name: debug
description: Structured diagnosis — narrow scope, evidence, then minimal fix proposal
---

Diagnose the problem the user described (error, unexpected behavior, failing flow).

**Follow the project’s debugging skill** for depth: token-efficient investigation, phased gathering, one hypothesis at a time — see [`../skills/debugging-protocol/SKILL.md`](../skills/debugging-protocol/SKILL.md).

Steps (summary):

1. **Signal first** — logs, stack traces, repro steps, environment; prefer narrow search and targeted reads over broad exploration.
2. **Related code** — only paths implicated by the signal; map call path or data path.
3. **Root cause** — one primary cause; note what you ruled out briefly.
4. **Fix proposal** — smallest change that addresses the cause; call out risks and what to verify after.

If the user wants **no code changes yet**, stop after root cause and proposed fix.

Type `WAITING FOR APPROVAL` when the diagnosis and proposal are ready (or when you need more input from the user).
