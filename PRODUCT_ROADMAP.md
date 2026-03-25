# Easy Intake App — Product roadmap

High-level sequencing for the platform and major clients. Detailed engineering lives in [docs/specs/PLATFORM_BUILD_PLAN.md](docs/specs/PLATFORM_BUILD_PLAN.md), [DECISIONS.md](DECISIONS.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Now

- **Insurance vertical** — first **vertical config package** (string field keys, config-driven forms and HITL).
- **Agent dashboard** — org queue, session detail, field review from config, reporting overview (replace demo data as APIs land).
- **Foundation** — `IntakeSession` model (vertical-agnostic), BFF to `apps/api`, bilingual shell.

---

## Soon

- **inmigracioningreso.com** — separate Next.js product that **webhooks** into Easy Intake (`apps/api`), similar in boundary to cotizarahora.
- **Immigration vertical config packages** — **`uscis-i90`** (Form I-90), **`uscis-n400`** (Form N-400), after Insurance is **proven end-to-end**.
- **English and Spanish** for Immigration surfaces (primary audience Spanish-speaking).

---

## Later

- **Additional verticals** — same config + session model; no new generic page types.
- **`VoiceProvider` abstraction** — CPaaS portability inside `apps/api` (see platform build plan Section 2b).
- **WebRTC / SIP support** — broader real-time voice options beyond current Twilio media stream + `agent.html` bridge.

---

## Agency onboarding (operational checklist)

Use this as the **practical ladder** when standing up a new agency (voice + engine). Technical detail: [PLATFORM_BUILD_PLAN.md — Section 2b](docs/specs/PLATFORM_BUILD_PLAN.md).

1. **Single number + sandbox** — Twilio number → dev/staging API URL; test calls create `Call` / session records; CRM optional or sandbox.
2. **Tenant mapping** — Bind number(s) to `organizationId` + default vertical/config package; verify webhook **signature** and **media stream** health.
3. **Production cutover** — Point production number to prod `publicBaseUrl`; enable **status callbacks** and CRM sync per org.
4. **Forwarding level** — Choose direct-to-engine vs IVR-first per number; add conference / warm handoff only when needed.
5. **Dashboard access** — Clerk users for org; **agent voice** uses **application JWT** for WebSocket (two-auth flow — see [DECISIONS.md](DECISIONS.md)).
