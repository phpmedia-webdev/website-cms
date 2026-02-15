# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

_(None — use Next up.)_

---

## Next up

- [ ] **Outbound SMTP emailer + contact activity stream**
  - [ ] Add SMTP/env config and Node.js emailer (e.g. nodemailer or built-in); lib to send email (to, subject, body).
  - [ ] API or server action: send email then create a CRM note for the contact with a dedicated note_type (e.g. `email_sent`); store subject and optional snippet in note body so it appears in the contact activity stream.
  - [ ] Optional: add `email_sent` to tenant CRM note types (Settings) if note types are used for display/filter.
  - [ ] Optional: UI from contact detail to compose and send email (calls send + attach-to-contact flow).
- [ ] **PWA Notifications (admin alerts)** — Admin notifications (new contacts, new form submissions, etc.) will use a PWA push page instead of email. Steps:
  - [ ] **Web app manifest** — Add manifest (name, icons, display, start_url) so the app can be installed on mobile (e.g. Add to home screen).
  - [ ] **Service worker for push** — Register a service worker that can receive push events when the app is in the background; handle push event to show notification (title, body, optional link to contact/form).
  - [ ] **Push subscription storage** — Table (or tenant_settings) to store push subscriptions per admin user: endpoint, p256dh key, auth key; API to POST subscription (after client requests permission and gets subscription) and optionally list/delete.
  - [ ] **VAPID keys** — Generate and store VAPID keys (env); use when sending push from the server (Web Push protocol).
  - [ ] **Backend: send push** — Utility (e.g. `notifyAdmins(tenantId, type, payload)`) that loads subscriptions for the tenant (or relevant admins), builds payload, and sends via Web Push to each endpoint. Call from contact-created and form-submission flows (and any other events you want to notify on).
  - [ ] **Admin PWA/notifications page** — Page (e.g. `/admin/notifications` or `/admin/pwa`) that: requests notification permission; subscribes and sends subscription to API; shows “Add to home screen” instructions and optional QR or link for mobile; only for authenticated admin.
- [ ] **Media: "Copy Shortcode"** — Add a "Copy Shortcode" action on all media items (images, videos, video URLs) in the media library that generates the proper shortcode (e.g. `[[media:id]]`) and copies it to the clipboard for pasting into the editor. Editor integration (Insert media from Tiptap) can be called out as steps when implementing.
  - [ ] **Adds protection to hide URL info** 
- [ ] **Terms and Policys manager** External application but needs a link (always a custom update per tenant)
- [ ] **CRM Sorting** Add ability to sort the CRM contact list by the header items: Last name, First name, Full name, Status, Updated and determin what default sort is. Should be the last activity at top of list - so updated
- [ ] **Form Submission List pagination** This list may grow, need a pagination feature.
  - [ ] **Form Submission List - filter by date range** To assist research. This needs to stack with form type to help narrow search.
---

## Paused / Later

- [ ] **Anychat** Integration work (Anychat push to CRM, VBout sync) and other items in Paused / Later.
- [ ] **VBout Integration** Create API routes to VBout with CRM data.
- [ ] **Integrate with PHPAUTH standalone app** for user access audit logging. 
Superadmin & platform user management; audit logs; break-glass. Plan to add superadmin-only “add superadmin” and “delete user” in the CMS (with safeguards: no self-delete, no delete last superadmin; optional superadmin allowlist). Tenant admins keep add/remove from site only. Standalone auth app (with direct Supabase Auth access) will be used as break-glass: create a superadmin in an emergency and revoke compromised accounts; no separate master-challenge lockout in the CMS for now. Audit: use the standalone app’s audit_logs table as the single store; CMS will write auth/user events with application_id (from auth_applications), assign application_id per fork from the standalone app, and use login_source (e.g. website-cms) for filtering. Plan steps (migrations, APIs, UI) to be detailed as the plan is finalized.

---
