---
name: debugging-protocol
description: >-
  Structured debugging before changing code: gather evidence, check obvious causes, one hypothesis and one fix at a time. Triggers on errors, stack traces, “not working”, “help me debug”, or before attempting a fix. Uses token-efficient investigation (narrow scope, cap on full file reads before first hypothesis, fast path when the cause is obvious).
---

# Debugging Protocol Skill

A structured approach to diagnosing and fixing issues — without making things worse in the process.

## Core Principle

**Understand before touching. One change at a time. Confirm before applying.**

The most common debugging failure is changing multiple things simultaneously, losing track of what worked, and ending up further from the solution than when you started.

## Token-efficient investigation

Apply these **before and during** the Protocol below. A **full file read** means reading a source or config file’s contents to investigate; **skimming** means only headings, first lines, or a quick grep result. **Logs, console output, build snippets, and `git diff`/`git log` output are not counted** as full file reads.

1. **Obvious cause first (skim before depth):** Look for the most likely cause using **stack trace, error text, logs, env, and recent deploy/git** before reading any file **in depth**. Shallow skim (path + first lines) is OK to pick targets.
2. **Narrow scope:** Investigate **only** files, packages, and services **directly implicated** by the error (stack paths, failing command cwd, named route). Do **not** read broadly across unrelated apps or folders.
3. **Reads serve the current hypothesis only:** Open or fully read a file **only** to confirm or rule out the **active** hypothesis — not to “explore the codebase.”
4. **Cap reads before the first hypothesis:** After **at most 3 full file reads**, **stop gathering** and **form one hypothesis** (Phase 3). If more signal is needed first, prefer **logs, one-liners, or targeted grep** over additional full reads.
5. **Fast path:** If the **error message or stack trace alone** makes the cause **obvious**, **skip Phase 1–2 gathering** (except confirming the obvious) and go **straight to Phase 3** — state the hypothesis and, if appropriate, **Phase 4** with a minimal fix proposal immediately after quick confirmation.

**Note:** The cap in rule 4 limits **reads before the first hypothesis**. The **Rules** section below still limits **hypothesis cycles** (“stuck after 3 hypotheses”) — those are separate guards.

---

## Protocol

### Phase 0 — Fast path (optional)

If rule **5** applies: briefly state **why** the cause is obvious, give **one** minimal confirmation step if needed, then go to **Phase 3** (hypothesis) and **Phase 4** (proposed fix). Skip lengthy Phase 1–2 checklists.

### Phase 1 — Gather Before Guessing

Before forming any hypothesis, collect:

1. **The exact error** — full message, stack trace, error code. Never work from a paraphrase if the real error is available.
2. **Where it's happening** — which service, which route, which function, which environment (local / staging / production) — **derive from the error only**; do not expand scope without cause.
3. **When it started** — was this working before? What changed recently?
4. **What's already been tried** — don't repeat failed attempts

If any of these are missing, ask for them before proceeding — unless **Phase 0** already cleared the path.

Apply **[Token-efficient investigation](#token-efficient-investigation)** throughout: stay narrow; count full file reads; after **3 full file reads** you must move to **Phase 3** unless you are still collecting **non-file** evidence (logs only).

### Phase 2 — Check the Obvious First

In order, **before** additional deep file reads:

- [ ] Check logs — server logs, browser console, build output, deployment logs
- [ ] Check environment variables — missing, wrong value, not loaded, wrong scope
- [ ] Check recent changes — git diff, recently edited files, recent deploys
- [ ] Check config files — did a config change break an assumption elsewhere? (skim or targeted read; counts toward the cap if a **full** read)
- [ ] Check network — is the service actually running? Is the right port exposed?

Document what each check reveals before moving on.

### Phase 3 — Form One Hypothesis

Based on what was gathered, state a single most likely cause:

```
HYPOTHESIS: [specific cause]
EVIDENCE: [what points to this]
TEST: [how to confirm or rule it out without changing anything yet]
```

Test the hypothesis with the least invasive method available:
- Add a log statement before changing logic
- Check a value in the console before rewriting a function
- Curl an endpoint before modifying the handler

### Phase 4 — Propose One Fix

Only after the hypothesis is confirmed:

- Describe exactly what will change and why
- Identify any side effects or other areas that could be affected
- Get confirmation before applying

```
PROPOSED FIX: [specific change]
FILES AFFECTED: [list]
POTENTIAL SIDE EFFECTS: [anything downstream]

Shall I apply this?
```

### Phase 5 — Apply and Verify

After applying the fix:
- Confirm the original error is gone
- Confirm nothing adjacent broke
- If the fix didn't work: revert, update the hypothesis, repeat from Phase 3

---

## Rules

- **Never change more than one thing at a time** — if you're tempted to, pick the most likely cause first
- **Never guess without evidence** — "it might be X" is not a reason to change X
- **Always revert before trying something else** — don't stack unverified changes
- **If stuck after 3 hypotheses** — stop and ask the user for more context rather than continuing to guess
- **Document what was ruled out** — knowing what it's NOT is progress

---

## Common Patterns by Error Type

**Build failures** → Check dependency versions, missing env vars at build time, monorepo build order

**Auth errors** → Check token expiry, middleware order, public vs protected route config, Clerk key mismatch

**Deployment failures** → Check env vars in deployment platform, build logs from the start not the end, root directory settings

**Type errors** → Check shared package was rebuilt after changes (`build:shared`), import paths, version mismatches

**Silent failures (no error, wrong behavior)** → Add logging at each step to find where the data diverges from expectation

---

**Slash command:** Users can invoke [`/debug`](../../commands/debug.md) for this workflow as an explicit ritual; this skill remains the detailed reference.
