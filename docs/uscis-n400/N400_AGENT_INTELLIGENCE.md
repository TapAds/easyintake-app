# N-400 workflow agent — intelligence modules (knowledge base)

This document captures **business rules** that turn the N-400 vertical from “form filler” into **workflow-guided intake**. It is **not legal advice**; USCIS policy and forms change — keep the official instructions authoritative and have immigration counsel review automation before production.

## Primary sources

- **USCIS:** [Form N-400 instructions](https://www.uscis.gov/sites/default/files/document/forms/n-400instr.pdf) (official PDF; verify current revision on [uscis.gov](https://www.uscis.gov/n-400)).
- **Local reference (optional):** Developers may keep a copy as `n-400instr.pdf` next to this folder or in a secure internal drive for offline comparison. Do not assume the repo contains the PDF unless explicitly added by the team.

## Implementation home

| Concern | Where it lives |
|--------|----------------|
| Pure eligibility math, conditional evidence triggers, trip / Part 12 flags | [`packages/shared/src/verticals/uscisN400/rules.ts`](../../packages/shared/src/verticals/uscisN400/rules.ts) (Release A) |
| Dynamic checklist rows tied to answers | Built in `rules.ts`, applied into `WorkflowInstance.requirementsJson` by the orchestrator |
| Field weights / catalog | Existing `USCIS_N400_VERTICAL_CONFIG` |
| Scoring | Extend [`apps/api/src/services/scoring.ts`](../../apps/api/src/services/scoring.ts) (or shared helpers) for **field** vs **evidence** metrics |
| Early filing “enabler” copy | [`packages/shared/src/verticals/uscisN400/templates.ts`](../../packages/shared/src/verticals/uscisN400/templates.ts) |
| Persist dates + phase | [`WorkflowInstance`](../../apps/api/prisma/schema.prisma): `targetSubmissionDate`, `continuousResidenceCompleteDate`, phase **`PRE_ELIGIBLE_COLLECTION`** |

## Workflow phases (N-400 subset)

| Phase | Meaning |
|-------|--------|
| `PRE_ELIGIBLE_COLLECTION` | LPR + basis known; **before** first day of USCIS early filing window — collect data/docs now; **cannot** file with USCIS until `targetSubmissionDate`. |
| `ESCALATED_LEGAL_REVIEW` | Part 9 moral / attestation triggers; **never** downgraded to `PRE_ELIGIBLE_COLLECTION` by automation. |

**Future (not implemented):** `AUDIT_READY_FOR_SUBMISSION` — autonomous submission readiness once `submitToUscisAllowed`, evidence complete, and no legal flags (cron on `targetSubmissionDate`).

## `gate.*` rows in `requirementsJson`

Items with ids `gate.*` are **logical checklist rows** (eligible to start / submit timing), not paper documents. They are merged with **evidence.*** rows so the dashboard and orchestrator share one array. Document-only completeness scores use [`computeDocumentEvidenceCompletenessScore`](../../packages/shared/src/verticals/uscisN400/rules.ts) (excludes `gate.*`).

---

## Module 1 — Early filing window (90-day rule)

**Instruction gist:** Naturalization filing may be submitted **up to 90 days before** completing the continuous residence period (typically **5 years** as an LPR, or **3 years** if eligibility is based on marriage to a U.S. citizen and other requirements are met).

**Agent behavior:**

- Inputs: `dateBecameLpr`, `n400.p1.eligibilityBasis` (from [`fields.ts`](../../packages/shared/src/verticals/uscisN400/fields.ts)).
- **`rules.ts`:** `evaluateEarlyFilingWindow` returns `targetSubmissionDate` (alias of first fileable day = LPR + N years − 90 days), `preEligibleCollection`, `collectionAllowed`, `submitToUscisAllowed`, and `messageKey` (including **`n400.rules.early_filing.pre_window_collection`** before that date).
- **Retention / GTM:** Before `targetSubmissionDate`, the product **encourages intake** (`PRE_ELIGIBLE_COLLECTION`) rather than turning the applicant away — templates in **`templates.ts`** (e.g. pre-window body with the target date).
- **UX:** Counsel still reviews eligibility; automation does not guarantee USCIS acceptance.

---

## Module 2 — Physical presence / trips (“physical presence auditor”)

**Instruction gist:** Applicants must account for time outside the U.S.; extended absences can affect **continuous residence** and **physical presence**. Trips **24 hours or more** are reported; trips **six months or longer** may raise issues; **one year or longer** generally breaks continuous residence unless an exception applies.

**Agent behavior:**

- When a trip is mentioned, collect: **departure/return dates**, **duration**, **purpose** (where in catalog).
- **Follow-up:** If duration suggests **more than six months** outside the U.S., ask a **clarifying question** (“Was any single trip **longer than six months**?”).
- **`rules.ts`:** Emit structured flags, e.g. `tripFlags: { possibleContinuousResidenceIssue: boolean; needsSpecialistReview: boolean }`.
- **Orchestrator:** Set `hitl` / `requirementsJson` specialist tasks; append **WorkflowEvent** (e.g. `TRIP_CONTINUITY_REVIEW`). Do **not** auto-deny or auto-clear — escalate for human review.

---

## Module 3 — Conditional evidence (document triggers)

**Instruction gist:** Required evidence **depends on answers** (e.g. marriage to a U.S. citizen, arrests, name change).

**Examples (illustrative — align to current instructions and your field keys):**

| Condition | Additional evidence checklist items |
|-----------|-------------------------------------|
| Applying based on marriage to a U.S. citizen | Spouse’s citizenship proof (e.g. birth certificate or passport), **marriage certificate**, and other items per instructions |
| Criminal / arrest history “Yes” | **Certified** court dispositions for each incident |
| Name change | Legal name change document(s) |

**Agent behavior:**

- **`rules.ts`:** `expandEvidenceRequirements(fieldValues) → RequirementItem[]` merged into **`WorkflowInstance.requirementsJson`** (not only `fieldValues`).
- **Nudges (Release B+):** When **field completion** is high but **evidence completion** is low, prioritize nudging for **missing documents** (see dual metrics below).

---

## Module 4 — Moral character (Part 12)

**Instruction gist:** Part 12 contains sensitive “yes/no” questions; certain **affirmative** answers require explanation and may require **legal analysis** — the product must not auto-adjudicate.

**Agent behavior:**

- **High-fidelity extraction** for Part 12 in **Spanish and English** (prompt tuning lives in API extraction layer; **interpretation** lives in `rules.ts`).
- **`rules.ts`:** If **any** Part 12 question is **Yes** (per mapped field keys), set phase to **`ESCALATED_LEGAL_REVIEW`** (or equivalent), set `escalationReason`, emit **WorkflowEvent** `PART12_AFFIRMATIVE`, **stop autonomous nudges** until counsel/specialist clears.
- **Do not** use **`ESCALATED_CONFLICT`** for Part 12 — that phase is reserved for **contradictory data** across channels or unresolved merge conflicts.

---

## Dual “audit-ready” metrics

1. **Field completion** — Weighted coverage of **structured** questions (existing-style completeness over catalog fields).
2. **Evidence completion** — Share of **required documents** satisfied (from dynamic `requirementsJson`, tied to uploads / attachment status).

**Orchestrator priority:** When field completion exceeds a threshold (e.g. ~85–90%) but evidence completion is low, **next best action** favors **document requests** (and Release B nudge copy) over more Q&A.

---

## Task 1.1 (implementation prompt seed)

When implementing **`uscisN400/rules.ts`** in Release A:

1. **Eligibility (instructions-aligned):** Encode LPR timeline rules, **3-year vs 5-year** basis where applicable, and **90-day early filing** as **pure functions** with documented inputs/outputs (unit-testable).
2. **Document triggers:** Map specific **Yes** answers (marital basis, arrests, name change, etc.) to **`RequirementItem`** keys that merge into **`requirementsJson`**.
3. **Escalation flags:** Part 12 **any Yes** → **`ESCALATED_LEGAL_REVIEW`** + audit event; trip flags → specialist review flags as in Module 2.
4. **Separation of concerns:** `rules.ts` **never** sends SMS or hits the DB — it returns **decisions and deltas** for the orchestrator.

---

## Change control

When USCIS updates the N-400 or instructions:

1. Update this doc’s **gist** and **official link**.
2. Adjust **`rules.ts`** and field catalog with version notes (e.g. `USCIS_N400_VERTICAL_CONFIG.version`).
