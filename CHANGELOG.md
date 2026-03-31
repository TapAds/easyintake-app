# Changelog

All notable changes to this monorepo (`easy-intake-app`) are documented in this file. Entries are reverse-chronological.

## 2026-03-30

### N-400 (Immigration) catalog and UI

- **Sections:** USCIS N-400 vertical config now uses four UI sections instead of sixteen USCIS parts: **Applicant Information** (Parts 1–6), **Employment & Travel** (7–8), **Additional Info** (9–13, Part 14 attestation, 15–16), and **Contact Information** (phone, email, preferred contact method). Field `sourceRef` values remain tied to official N-400 parts for traceability.
- **Preferred contact:** New optional-but-catalog-required field `preferredContactMethod` with values `sms`, `whatsapp`, `email`, `phone` (bilingual labels; `intake.enumOptions` in web messages).
- **Web:** N-400 demo page (`N400WebformDemoClient`) adds overall + per-section completion, enum `<select>` controls, and section descriptions. Live demo / live call (`LiveDemoClient`) uses a clearer progress block (full-width overall bar, 2×2 section grid) and CRM preview row for preferred contact.

### Insurance vertical and voice extraction

- **Shared config:** `INSURANCE_VERTICAL_CONFIG` includes the same `preferredContactMethod` enum in the Contact section; `requiredFieldKeys` updated.
- **API:** `EntityFieldName` / `FIELD_CONFIG` include `preferredContactMethod` (quote stage). V2 extraction prompt and schema list `preferred_contact_method`; `extractionTransform` maps and normalizes values to the four canonical tokens.

### Realtime agent stream and entity persistence

- **WebSocket:** `entity_update` messages may include `fieldConfidences` from the field confidence cache; extraction merges use structured `{ entities, fieldConfidences }` from insurance and N-400 extractors with STT confidence where applicable.
- **Supporting changes:** Updates across `stageManager`, `entityPayload`, `entitySnapshotPersistence`, `callOrchestrator`, `transcriptExtract`, `claude` extract paths, `ghlInboundProcessor`, and related routes align entity merging and snapshots with confidences and package-aware behavior.

### Dashboard

- **Filters:** Dashboard supports `carrier` and `product` query parameters (with persistence when switching demo/live mode for super-admins). Demo and live metric components consume filters; snapshot/derivation helpers extended for filtered KPIs.
- **UI:** New `DashboardFilters` component and KPI/layout refinements on demo and live metric panels.

---

*Format: summary bullets per release; link to `docs/` or package READMEs for deep dives when useful.*
