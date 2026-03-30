# Easy Intake — Install guide (GoHighLevel customers)

End-user steps to connect **Easy Intake** to a **GoHighLevel sub-account (Location)**. Your agency’s technical contact completes these once per location.

**Product:** EasyAppIntake — conversation-powered intake with structured data and CRM sync.  
**Support:** Use the contact information shown on your [GoHighLevel Marketplace](https://marketplace.gohighlevel.com) listing for this app (website, email, support URL from the publisher).

---

## What you need

- **Agency Admin or Location Admin** access to install Marketplace apps for the target **Sub-Account**.
- A **Twilio** account (or your telephony provider workflow) with a voice-capable **E.164** phone number you will use for inbound calls to this location.
- Ability to set **webhooks** on that number (Voice URL and Status Callback) as described below.

---

## 1. Install the app in GoHighLevel

1. Open the **Easy Intake** app from the **Marketplace** (or use the **Installation URL** your vendor sent you).
2. Sign in to GoHighLevel if prompted.
3. On **Choose location**, select **one Sub-Account (Location)**.  
   **Do not** choose Company-only / “All Accounts” — the app needs a **Location** token.
4. Click **Allow** / **Authorize**.
5. You should be redirected to the Easy Intake server and see **GHL Connected** (success page). If you see **Location Required**, repeat the flow and pick a specific Location.

---

## 2. Configure Twilio voice webhooks

Point your **inbound voice number** at Easy Intake’s hosted endpoints (same for all customers):

| Setting | URL | HTTP method |
|--------|-----|-------------|
| **A call comes in** | `https://api.easyintakeapp.com/webhooks/twilio/voice` | `POST` |
| **Status callback** | `https://api.easyintakeapp.com/webhooks/twilio/call-status` | `POST` |

Use the **full URL** including the path. Saving only the domain (no path) will fail incoming calls.

After saving, place a **test call** to your number. If you hear an error message, confirm the URLs above in Twilio and that your Twilio **Auth Token** on the vendor side matches the account that owns the number (your vendor support can verify).

---

## 3. Align GoHighLevel messaging (optional but recommended)

For **SMS / WhatsApp / email** conversation features, ensure the sub-account has messaging set up per GoHighLevel (10DLC, templates, etc.). Inbound conversation events are delivered to Easy Intake via the app’s **Marketplace webhooks**; your vendor configures `InboundMessage` subscription on the app.

---

## 4. Post-install checks

- **Calls:** Inbound call completes; contact and intake data sync appear in GoHighLevel as designed for your plan.
- **CRM:** Contacts (and opportunities, if configured) update for the **same Location** you selected at install.
- **Re-authorize:** If the vendor **changes OAuth scopes** in the Marketplace app, open the **Installation URL** again for that Location and re-authorize.

---

## Privacy and data

- Data handling and retention are described in the publisher’s **Privacy Policy** and **Terms** linked from the Marketplace listing.
- Do not share **Client Secret** or server credentials; customers only use the public **Install** / **Marketplace** flow.

---

## Further reading (technical)

Partner / implementer detail: [GHL-MARKETPLACE-SETUP.md](../../GHL-MARKETPLACE-SETUP.md) and [GHL_INTEGRATION_CHECKLIST.md](../../GHL_INTEGRATION_CHECKLIST.md) in the Easy Intake repository (for your integrator, not required reading for every end user).
