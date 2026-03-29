# API Contract: cotizarahora → easyappintake
**Version:** 1.1.0  
**Note:** This release aligns the response codes table with the current easyappintake handler implementation (`apps/api/src/webhooks/intake.ts`).  
**Last Updated:** 2026-03-22  
**Owned by:** Both teams — changes require updates in both repos

---

## Overview

When cotizarahora.com captures a lead or quote, it fires a webhook to easyappintake.com. easyappintake then creates the contact in GoHighLevel and triggers the appropriate SMS/email/WhatsApp communication flow.

**cotizarahora** = the sender (fires events)  
**easyappintake** = the receiver (processes events, owns GHL)

---

## Endpoint

```
POST https://easyappintake.com/api/webhooks/intake
Content-Type: application/json
X-Webhook-Secret: <shared_secret>
X-Source: cotizarahora
X-GHL-Location-Id: <optional — GHL sub-account id when multiple AgencyConfig installs share one API>
```

---

## Authentication

- All requests must include the `X-Webhook-Secret` header
- Secret is stored in environment variables on both sides:
  - cotizarahora: `EASYAPPINTAKE_WEBHOOK_SECRET`
  - easyappintake: `COTIZARAHORA_WEBHOOK_SECRET`
- Rotate secret via manual coordination between both deployments
- easyappintake must return `401` if secret is missing or invalid
- **Multi-tenant:** If more than one GoHighLevel location is registered, send `X-GHL-Location-Id`. If omitted and exactly one location exists, that location is used; otherwise the receiver returns `500` with an error (or document single-tenant default via `GHL_LOCATION_ID` env on easyappintake).

---

## Events

### 1. `lead.captured`
Fired when a user submits their contact info (before getting a quote).

```json
{
  "event": "lead.captured",
  "timestamp": "2026-03-22T14:30:00Z",
  "source": "cotizarahora",
  "vertical": "insurance",
  "data": {
    "lead_id": "uuid-from-supabase",
    "first_name": "Maria",
    "last_name": "Garcia",
    "email": "maria@example.com",
    "phone": "+15105550123",
    "preferred_language": "es",
    "zip_code": "94901",
    "insurance_type": "auto | health | life | home",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "insurance-es-2026"
  }
}
```

### 2. `quote.completed`
Fired when a user has received and viewed a full quote.

```json
{
  "event": "quote.completed",
  "timestamp": "2026-03-22T14:35:00Z",
  "source": "cotizarahora",
  "vertical": "insurance",
  "data": {
    "lead_id": "uuid-from-supabase",
    "quote_id": "uuid-from-supabase",
    "first_name": "Maria",
    "last_name": "Garcia",
    "email": "maria@example.com",
    "phone": "+15105550123",
    "preferred_language": "es",
    "insurance_type": "auto",
    "quote_amount_monthly": 142.00,
    "quote_amount_annual": 1704.00,
    "carrier": "Progressive",
    "quote_url": "https://cotizarahora.com/quotes/uuid",
    "zip_code": "94901"
  }
}
```

### 3. `quote.requested_callback`
Fired when user clicks "I want an agent to call me" or similar CTA.

```json
{
  "event": "quote.requested_callback",
  "timestamp": "2026-03-22T14:38:00Z",
  "source": "cotizarahora",
  "vertical": "insurance",
  "data": {
    "lead_id": "uuid-from-supabase",
    "quote_id": "uuid-from-supabase",
    "first_name": "Maria",
    "last_name": "Garcia",
    "email": "maria@example.com",
    "phone": "+15105550123",
    "preferred_language": "es",
    "preferred_callback_time": "afternoon | morning | evening | asap",
    "insurance_type": "auto",
    "quote_amount_monthly": 142.00
  }
}
```

---

## Response Codes

| Code | Meaning | cotizarahora should... |
|------|---------|------------------------|
| `200` | Accepted, contact created in GHL | Log success, no retry |
| `400` | Bad payload | Log error, alert dev, no retry |
| `401` | Auth failed | Alert dev immediately, no retry |
| `409` | Duplicate — lead already exists | Log, no retry (idempotent) |
| `500` | easyappintake server error | Retry up to 3x with exponential backoff |

---

## Retry Policy (cotizarahora)

- Retry only on `500`
- Max 3 retries
- Backoff: 30s → 2min → 10min
- After 3 failures: store event in Supabase `failed_webhooks` table for manual review
- Never retry on `400`, `401`, or `409`

---

## Idempotency

- `lead_id` is the idempotency key
- easyappintake must check if a GHL contact already exists for `lead_id` before creating
- On duplicate, return `409` — do not create a second contact
- cotizarahora must generate `lead_id` from Supabase UUID at lead creation time, not at webhook fire time

---

## easyappintake: What to Do with Each Event

| Event | GHL Action | Communication Trigger |
|-------|-----------|----------------------|
| `lead.captured` | Create contact, tag `cotizarahora`, tag `insurance`, tag `lead` | Send intro SMS in `preferred_language` |
| `quote.completed` | Update contact, add note with quote details + URL | Send quote follow-up SMS/email with quote link |
| `quote.requested_callback` | Update contact, tag `callback-requested`, assign to pipeline | Alert agent via GHL task + send "we'll call you" SMS |

---

## Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event` | string | ✅ | One of the 3 event types above |
| `timestamp` | ISO 8601 | ✅ | UTC, set by cotizarahora at fire time |
| `source` | string | ✅ | Always `"cotizarahora"` |
| `vertical` | string | ✅ | Always `"insurance"` for this integration |
| `data.lead_id` | UUID | ✅ | Supabase UUID — idempotency key |
| `data.quote_id` | UUID | quote events only | Supabase UUID |
| `data.phone` | E.164 | ✅ | Must include country code, e.g. `+15105550123` |
| `data.preferred_language` | `es` or `en` | ✅ | GHL should use this for all comms |
| `data.insurance_type` | enum | ✅ | `auto`, `health`, `life`, `home` |
| `data.quote_amount_monthly` | float | quote events | USD |
| `data.utm_*` | string | ❌ | Pass through if available, omit if not |

---

## Testing

### Staging Endpoints
- cotizarahora staging: `https://staging.cotizarahora.com`
- easyappintake staging: `https://staging.easyappintake.com/api/webhooks/intake`

### Test Lead ID
Use `00000000-0000-0000-0000-000000000001` for sandbox testing — easyappintake will process but not create real GHL contacts.

### Smoke Test (run from cotizarahora)
```bash
curl -X POST https://staging.easyappintake.com/api/webhooks/intake \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret" \
  -H "X-Source: cotizarahora" \
  -d '{
    "event": "lead.captured",
    "timestamp": "2026-03-22T00:00:00Z",
    "source": "cotizarahora",
    "vertical": "insurance",
    "data": {
      "lead_id": "00000000-0000-0000-0000-000000000001",
      "first_name": "Test",
      "last_name": "User",
      "email": "test@example.com",
      "phone": "+15105550100",
      "preferred_language": "es",
      "zip_code": "94901",
      "insurance_type": "auto"
    }
  }'
```

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.1.0 | 2026-03-22 | Aligned response codes with actual handler implementation |
| 1.0.0 | 2026-03-22 | Initial spec |

---

## Rules for Both Cursor Windows

**cotizarahora:** Fire webhooks, never build GHL logic, never send SMS/email/WhatsApp directly.  
**easyappintake:** Receive webhooks, own GHL, never store insurance quote data — just pass it through as contact notes.  
**Both:** Any change to this contract requires a version bump and updates in both repos before deploying.
