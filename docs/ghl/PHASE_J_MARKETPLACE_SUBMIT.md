# Phase J — GoHighLevel Marketplace public submission (operator runbook)

Use this when moving the app from **private / draft** to **public Marketplace** review. GHL’s UI and review rules change; always confirm the latest prompts in [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) and official docs.

**Related:** [GHL_APP_LAUNCH_ACTION_ITEMS.md](../../GHL_APP_LAUNCH_ACTION_ITEMS.md) (Phase J + Pre-submit confirmation) · [GHL-MARKETPLACE-SETUP.md](../../GHL-MARKETPLACE-SETUP.md)

---

## Before you click “Submit”

1. **Loopback test (production networking):** From GHL, trigger a webhook to **`https://api.easyintakeapp.com/api/webhooks/ghl`** (test trigger in the developer console if available, and/or a real inbound conversation event). In **Railway → API → Logs**, confirm the request reaches your service with **200 OK** (not persistent **401** signature errors). This validates TLS, routing, and GHL → API after `PUBLIC_BASE_URL` / custom domain changes—it does not replace Phase I product checks.
2. Complete **[GHL_APP_LAUNCH_ACTION_ITEMS.md](../../GHL_APP_LAUNCH_ACTION_ITEMS.md) → Phase J → Pre-submit confirmation**, especially:
   - **Inbound SMS / `InboundMessage`** if the listing or app description promises messaging.
   - **Voice** path after final `PUBLIC_BASE_URL` and Twilio URL changes.
3. Production endpoints should all use **`https://api.easyintakeapp.com`** (OAuth callback, webhooks, Twilio). No mixed `*.up.railway.app` in customer-facing configs.
4. **`GHL_WEBHOOK_VERIFY=strict`** on Railway for production.

---

## What GHL has required for new app review (verify in current portal)

HighLevel has tightened first-time review for Marketplace apps. Confirm the **exact** checklist in their developer UI before submission; historically this has included:

- **Demo media:** e.g. short **screen recordings** showing end-to-end behavior and scope usage — see changelog discussion: [Stronger app review process for new apps](https://ideas.gohighlevel.com/changelog/marketplace-stronger-app-review-process-for-new-apps).
- **Listing completeness:** Icon (e.g. **512×512**), short + long description, category, pricing model, company/site, support contact, **Privacy Policy** and **Terms** URLs that **resolve publicly**.
- **Test access (if requested):** Sandbox or test credentials so reviewers can reproduce the flow.

Community / tips (not official policy): [How can I get my app approved on the Marketplace?](https://ideas.gohighlevel.com/marketplace-new-app-request/p/how-can-i-get-my-app-approved-on-the-marketplace)

**Updates after launch:** [How to Update Your App](https://marketplace.gohighlevel.com/docs/oauth/HowToUpdateYourAPP/index.html) (versioning).

---

## Listing copy you can paste (adjust to match legal pages)

Use only after your **Website**, **Support**, **Privacy**, and **Terms** URLs are live and match brand.

| Field | Suggested content |
|--------|-------------------|
| **App name** | Easy Intake |
| **Short description** | Turn conversations into structured data. Voice, SMS, and form intake with AI extraction and CRM sync for HighLevel. |
| **Long description (outline)** | Install per Location. Connects voice (Twilio) and GHL conversations to structured intake sessions; syncs contacts and opportunities; optional documents and e-sign flows per your configuration. Requires Twilio webhooks to Easy Intake’s hosted API. |
| **Website** | Your public marketing site (e.g. `https://easyappintake.com` or product site). |
| **Support email** | Monitored address (e.g. `support@easyappintake.com`). |
| **Support URL** | Help center or contact page (must load without login if GHL requires public support URL). |

**Resources & support** table in repo: [GHL-MARKETPLACE-SETUP.md §4](../../GHL-MARKETPLACE-SETUP.md)

---

## Screenshots / video checklist (typical expectations)

Capture **sanitized** screens (no real PII):

1. **Marketplace install** — Location picker, authorize screen.
2. **Success** — **GHL Connected** / OAuth callback success.
3. **GHL** — Contact or opportunity updated after a test voice or message (as applicable).
4. Optional: **Custom page** embed (`/ghl/custom`) if you list it as a feature.
5. Optional: **Dashboard** `https://app.easyintakeapp.com` only if the listing promises that surface (Clerk product is separate from GHL OAuth).

---

## Submission flow (high level)

1. **My Apps** → open your app listing (still **Draft** until submitted and approved).
2. Complete **Listing** / **Distribution** / **Resources** sections per GHL tabs.
3. Attach **media** and any **review notes** GHL requests (Loom links, test instructions).
4. Submit for **review** / **publication** using the button GHL shows when the listing is complete.
5. Watch email / dashboard for **feedback** or **rejection**; fix and resubmit as needed.

Timeline varies (on the order of **days**, not minutes); plan support capacity during review.

---

## After approval

- Publish **customer install** instructions: host [CUSTOMER_INSTALL_GUIDE.md](./CUSTOMER_INSTALL_GUIDE.md) on your support site or link from the listing.
- **Monitor:** GHL webhook delivery, Railway logs, DB growth — [GHL_INTEGRATION_CHECKLIST.md §10](../../GHL_INTEGRATION_CHECKLIST.md).

---

## Customer-facing doc (publish separately)

- **[CUSTOMER_INSTALL_GUIDE.md](./CUSTOMER_INSTALL_GUIDE.md)** — give agencies a stable URL (support KB or `/docs` on your domain).
