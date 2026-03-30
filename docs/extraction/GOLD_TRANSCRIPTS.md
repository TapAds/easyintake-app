# Gold transcripts for extraction evaluation

Use these scenarios for regression testing after prompt or pipeline changes. For each case, run the extraction API (live `extractEntities` or batch transcript extract) and compare normalized entity fields to the expected keys below.

## Success criteria

- **Per-field precision / recall** — computed against the expected entity field map (Easy Intake `EntityFieldName` after `transformV2ToExtractedEntities`).
- **Normalization** — dates as ISO `YYYY-MM-DD`; US `state` as 2-letter code where applicable; `gender` as `MALE` / `FEMALE`; booleans for `tobaccoUse` / `existingCoverage`; face amount as integer dollars.
- **Targets** — maintain **≥ 0.95** field accuracy on this suite; **≥ 0.80** session-level completeness is evaluated per product schema (`PRODUCT_REQUIRED_FIELDS`), not global field count.

## Cases (see JSON fixtures)

| Id | Intent |
|----|--------|
| `en_readback_confirm` | Agent reads back many facts; single “Yes” — all should populate (regression for speaker-agnostic confirmation). |
| `es_direct_applicant` | Spanish direct statements — name, DOB, address. |
| `en_direct_applicant` | English direct applicant utterances. |
| `noise_no_hallucination` | Vague applicant reply — expect no unsafe fills. |

Fixtures: [`gold-transcripts.json`](./gold-transcripts.json).

## Running checks (manual)

1. Voice path: replay utterances via the internal test endpoint or WebSocket stream with labeled speakers.
2. Batch: `POST /api/calls/:callSid/extract` (or equivalent) after persisting transcript segments.
3. Compare logged `parsed result` from `[extraction]` to expected JSON in fixtures.

## Change log

When adding a case, record the **business reason** (e.g. carrier, ASR quirk) in the `notes` field of the JSON entry.
