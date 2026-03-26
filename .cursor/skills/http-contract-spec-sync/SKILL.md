---
name: http-contract-spec-sync
description: Keeps HTTP webhook and partner API specifications aligned with handler code and communication with senders. Use when editing api-contract specs, webhook handlers, status codes, payloads, idempotency, or versioning; when the user mentions WEBHOOK_SPEC, intake webhook, or contract drift.
---

# HTTP contract ↔ implementation sync

## Problem

External senders rely on **documented** HTTP paths, payloads, headers, and **status codes**. If the spec and **`apps/api`** handler diverge, partners see wrong expectations or retries.

## Rules

1. **Source of truth** — The **handler** (`apps/api`) is what actually runs in production. The **spec** (`api-contract/*.md`) must describe what senders will observe.
2. **If the spec and code disagree** — Prefer **updating the spec** to match the handler when behavior is intentional and stable; if you change the handler, **bump** the contract version or changelog (if your process has one) and **notify** integrators.
3. **Status codes** — List every status the handler returns (e.g. success, auth failure, validation, conflict, server error). Remove or correct documented codes that the handler never emits.
4. **Secrets** — Document signing headers or shared secrets as **env vars** in setup docs, not inline values.

## Known repo note

- `ARCHITECTURE.md` — **TODO** alignment between `api-contract/WEBHOOK_SPEC.md` and `apps/api/src/webhooks/intake.ts` for some HTTP statuses. Resolve by **matching spec to implementation** unless the product explicitly changes the handler.

## Checklist (before merging contract or handler changes)

- [ ] Spec lists the same **paths and methods** as the code.
- [ ] Spec lists the same **response codes** as implemented.
- [ ] **Idempotency** and duplicate behavior match the doc.
- [ ] **Breaking** payload or header changes are called out for senders.

## Reference

- `api-contract/WEBHOOK_SPEC.md`
- `ARCHITECTURE.md` — § Integration contract maintenance.
