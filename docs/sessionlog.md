# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

- [ ] **PHP-Auth repurpose & website-cms integration (current top priority)** — See and work from [authplanlog.md](./authplanlog.md): Section 1 (modify PHP-Auth app) and Section 2 (modify website-cms app). Covers data cleanup, MFA (TOTP) implementation notes, API keys (PHP-Auth generates/stores), no session carry-over to/from PHP-Auth, auth persists across website-cms forks.

---

## PHP-Auth Central Store Migration (No Lockout)

**Purpose:** Move website-cms to use PHP-Auth as the central source for users, roles, and assignments. Login stays in Supabase `auth.users`; role and org assignment resolution moves to PHP-Auth so the tenant app does not get locked out during or after migration.

**Principle:** *auth.users* = who can log in (unchanged). *PHP-Auth `users` + `auth_user_organizations`* = who has which role in which org. We populate central first, then dual-read, then write to central, then (optional) read only from central. Always keep a recovery path until central-only is verified.

**References:** PHP-Auth `docs/authplanlog.md` (Section 2: website-cms integration); PHP-Auth `docs/sessionlog.md` (Website-CMS Migration to Central Store). Per-tenant config: `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_APP_API_KEY` in env (from PHP-Auth when the Application was created).

| Phase | Description | Website-CMS tasks | Status |
|-------|-------------|------------------|--------|
| **M1** | **Populate central (PHP-Auth)** | No code change in website-cms. In PHP-Auth: ensure your superadmin user (and all current admins) exist in `users` (same `supabase_user_id` as in auth.users) and have correct `auth_user_organizations` for the org that maps to this tenant. Store `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_APP_API_KEY` in this app’s env. Map tenant id/slug → PHP-Auth Organization UUID. | ✅ Completed |
| **M2** | **Dual-read** | Where you resolve “current user’s role for this tenant” (e.g. `getRoleForCurrentUser`, `getEffectiveFeatureSlugsForCurrentUser`): (1) Call PHP-Auth `POST /api/external/validate-user` with `Authorization: Bearer <session token>` and `X-API-Key: <AUTH_APP_API_KEY>`. (2) If 200 and `data.organizations` includes org with `id === AUTH_ORG_ID`, use that org’s role (and features) for this request. (3) If 401, 403, or 5xx, **fallback** to current logic (user_metadata for superadmin, tenant_user_assignments for tenant admins). Keep writing only to website-cms store (tenant_user_assignments, user_metadata) for now. | ✅ Completed |
| **M3** | **Writes to central** | When assigning a role to a user on a tenant: perform the write in PHP-Auth (e.g. call PHP-Auth API to add user to org with role, or document that Superadmin does it in PHP-Auth UI). Optionally keep syncing to `tenant_user_assignments` during transition. Document **recovery procedure**: if locked out, re-add/fix your user in PHP-Auth (UI or SQL) or temporarily set `user_metadata.role` in auth.users so fallback in M2 still grants access. | 🔄 In progress |
| **M4** | **Central-only read (optional)** | Remove fallback: resolve roles only from PHP-Auth (validate-user). Do only after verifying in staging/production that every relevant user has correct data in PHP-Auth. Keep recovery procedure from M3. Optionally stop writing to tenant_user_assignments and deprecate that table later. | ⏳ Pending |

**Lockout prevention:** M1 is done before M2 so your account exists in PHP-Auth when we first call central. M2–M3 keep fallback so if PHP-Auth is down or wrong, we still use user_metadata + tenant_user_assignments. Recovery: fix user/assignment in PHP-Auth or temporarily restore user_metadata/fallback in website-cms.

**Execution:** Update the Status column above as each phase is completed. M3 (writes to central) is the current focus.


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
