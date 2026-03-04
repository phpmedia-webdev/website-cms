# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Where we are

**Completed (see changelog):** PHP-Auth M0–M5, M3 sync steps, M5 Phases A–D, Roles steps 1–4, Phase F F1–F5 (one-to-one gate mapping, Superadmin gate display).

**Remaining:** Phase F F6; Phase E (E10, E10a, E11); Roles 4a, 5.

---

## Current Focus

- [ ] **Next (Phase F):** F6 — View As Role fix (resolve role features from PHP-Auth when view-as active so effective = tenant ∩ role is correct).
- [ ] **Optional next:** Phase E (E10 deprecation doc, E10a getEffectiveFeatureSlugs from PHP-Auth, E11 docs) or Step 4a (gating). [authplanlog.md](./authplanlog.md) Section 1 + 2 for broader PHP-Auth integration.

---

## Remaining work

### Phase F

| Step | Task | Status |
|------|------|--------|
| **F6** | **View As Role (fix):** When "View Site As" is active, effective and role feature slugs are read from local Supabase only (`getEffectiveFeatureSlugs`, `listRoleFeatureSlugs` → `role_features`). If PHP-Auth is SSOT for role→features, the local table may be empty or out of sync, so effective = tenant ∩ role is wrong and sections (e.g. OmniChat, CRM, Calendar) show blocked even when the gate has only CRM off. **Fix:** When view-as is active, resolve role feature slugs from the same source as normal mode (PHP-Auth roles API or equivalent) instead of `listRoleFeatureSlugs(viewAs.roleSlug)`; ensure slug format matches gate slugs so effective = tenant_slugs ∩ role_slugs is correct. Optionally unify so both real-user and view-as use the same PHP-Auth–backed role-feature source. | ⏳ |

### Phase E

- [ ] **E10** Deprecate local SSOT for roles/features: document that `admin_roles` / `role_features` (and `feature_registry` where replaced) are not source of truth; PHP-Auth is.
- [ ] **E10a** Wire `getEffectiveFeatureSlugs` to use PHP-Auth role→features instead of local `role_features` per [reference/php-auth-ssot-roles-features-plan.md](./reference/php-auth-ssot-roles-features-plan.md).
- [ ] **E11** Update sessionlog/planlog and changelog with M5 progress when appropriate.

### Roles transition

- [ ] **4a** PHP-Auth SSOT for role→features (gating): use role→features in `getEffectiveFeatureSlugs` instead of local `role_features`.
- [ ] **5** Document deprecation of `admin_roles`, `role_features`, read path of `tenant_user_assignments`; tenant_sites unchanged.

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
  - [ ] **Admin PWA/notifications page** — Page (e.g. `/admin/notifications` or `/admin/pwa`) that: requests notification permission; subscribes and sends subscription to API; shows "Add to home screen" instructions and optional QR or link for mobile; only for authenticated admin.
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
Superadmin & platform user management; audit logs; break-glass. Plan to add superadmin-only "add superadmin" and "delete user" in the CMS (with safeguards: no self-delete, no delete last superadmin; optional superadmin allowlist). Tenant admins keep add/remove from site only. Standalone auth app (with direct Supabase Auth access) will be used as break-glass: create a superadmin in an emergency and revoke compromised accounts; no separate master-challenge lockout in the CMS for now. Audit: use the standalone app's audit_logs table as the single store; CMS will write auth/user events with application_id (from auth_applications), assign application_id per fork from the standalone app, and use login_source (e.g. website-cms) for filtering. Plan steps (migrations, APIs, UI) to be detailed as the plan is finalized.

---
