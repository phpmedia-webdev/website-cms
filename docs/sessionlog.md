# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Where we are

**PHP-Auth migration:** M0 ✅ M1 ✅ M2 ✅ | **M3** ✅ (sync wired; addToOrgIfMissing; recovery doc) | **M4** ✅ (central-only read complete; step plan archived) | **M5** 🔄 partial (Phase D done: Dashboard, gating, Users; Phase E cleanup/docs TBD).  
**Roles transition (this repo):** Step 1 ✅ | Step 2 ✅ | Step 3 ✅ | Step 4 (M4) ✅ | Step 4a (gating) ⏳ | Step 5 ⏳.

**Recently completed:** See changelog (latest entry) for PHP-Auth conversion milestone summary. M0–M5, M3 sync, M5 Phases A–D, Roles steps 1–4 done; Phase F step plan added.

---

## Current Focus

- [ ] **Phase F — Gating and Role Limit Navigation:** F1 (role feature slugs in layout), F2 (single upgrade page), F3 (sidebar hide by role / ghost by plan), F4 (FeatureGuard → upgrade page), F5 (copy and QA). See Phase F section below.
- [ ] **Optional next:** Phase E (E10 deprecation doc, E10a getEffectiveFeatureSlugs from PHP-Auth, E11 docs) or Step 4a (gating). [authplanlog.md](./authplanlog.md) Section 1 + 2 for broader PHP-Auth integration.

---

## PHP-Auth Central Store Migration (No Lockout)

**Purpose:** Move website-cms to use PHP-Auth as the central source for users, roles, and assignments. Login stays in Supabase `auth.users`; role and org assignment resolution moves to PHP-Auth so the tenant app does not get locked out during or after migration.

**Principle:** *auth.users* = who can log in (unchanged). *PHP-Auth `users` + `auth_user_organizations`* = who has which role in which org. We populate central first, then dual-read, then write to central, then (optional) read only from central. Always keep a recovery path until central-only is verified.

**References:** PHP-Auth `docs/authplanlog.md` (Section 2: website-cms integration); PHP-Auth `docs/sessionlog.md` (Website-CMS Migration to Central Store). Per-tenant config: `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_API_KEY` in env (from PHP-Auth when the Application was created).

| Phase | Description | Website-CMS tasks | Status |
|-------|-------------|------------------|--------|
| **M0** | **Connect external app to PHP-Auth** | In the external app (e.g. website-cms): add env (AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, AUTH_API_KEY); implement calls to validate-user (roles) and audit-log (audit events). See **M0 step (detailed)** below. | ✅ Completed |
| **M1** | **Populate central (PHP-Auth)** | No code change in website-cms. In PHP-Auth: ensure your superadmin user (and all current admins) exist in `users` (same `supabase_user_id` as in auth.users) and have correct `auth_user_organizations` for the org that maps to this tenant. Store `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_APP_API_KEY` in this app’s env. Map tenant id/slug → PHP-Auth Organization UUID. | ✅ Completed |
| **M2** | **Dual-read** | Where you resolve “current user’s role for this tenant” (e.g. `getRoleForCurrentUser`, `getEffectiveFeatureSlugsForCurrentUser`): (1) Call PHP-Auth `POST /api/external/validate-user` with `Authorization: Bearer <session token>` and `X-API-Key: <AUTH_APP_API_KEY>`. (2) If 200 and `data.organizations` includes org with `id === AUTH_ORG_ID`, use that org’s role (and features) for this request. (3) If 401, 403, or 5xx, **fallback** to current logic (user_metadata for superadmin, tenant_user_assignments for tenant admins). Keep writing only to website-cms store (tenant_user_assignments, user_metadata) for now. | ✅ Completed |
| **M3** | **Writes to central** | When assigning/updating/removing a user or role: sync to PHP-Auth via `POST /api/external/sync-user-role` (newUser, addToOrgIfMissing). Local `tenant_user_assignments` kept for display; recovery doc in place. | ✅ Completed |
| **M4** | **Central-only read** | When PHP-Auth is configured, role is resolved only from validate-user (no fallback). Fallback only when PHP-Auth not configured. Step plan completed (1–11); doc archived. | ✅ Completed |
| **M5** | **Superadmin section UI redesign** | Redesign superadmin UI to align with tenant_sites scope (site mode, membership, coming_soon, current-site only; no multi-site management). Execute after M4. | ✅ Completed |

### M3: Sync to PHP-Auth (sync-user-role API)

When admin or superadmin adds/edits/removes a user or changes role in website-cms, we sync to PHP-Auth so central auth stays the source of truth. See [website-cms-sync-user-role-api.md](./reference/website-cms-sync-user-role-api.md) for the PHP-Auth endpoint and payload.

- [x] **M3-S1** Switch sync module to use new endpoint: `POST /api/external/sync-user-role` (not `/api/external/user-org-role`). Payload: `email`, `roleSlug`, `fullName?`, `newUser?`, `supabaseUserId?`; org/app from X-API-Key.
- [x] **M3-S2** Add `fullName` and `newUser` to `SyncUserOrgRoleParams`; for new user require `fullName` (fallback to email local part or "User" in code). Call sites pass `tenantUser.display_name` and `newUser: true` on assign when we just created/invited the user.
- [x] **M3-S3** Assign and update: call `sync-user-role` with email, roleSlug, fullName; for assign of newly added user set `newUser: true` and `supabaseUserId`. Wire in `POST`/`PATCH` `/api/settings/team` and `POST`/`PATCH` `/api/admin/tenant-sites/[id]/users`.
- [x] **M3-S4** Remove: keep calling legacy `POST /api/external/user-org-role` with `operation: "remove"` (no-op if PHP-Auth no longer supports it).
- [x] **M3-S5** Document M3 sync in sessionlog (this section) and reference [website-cms-sync-user-role-api.md](./reference/website-cms-sync-user-role-api.md). Update [m3-writes-and-sync-to-php-auth.md](./reference/m3-writes-and-sync-to-php-auth.md) to mention new endpoint when done.

## M5 / PHP-Auth SSOT & superadmin redesign — confirmations

- **Tenant site:** Each deployment has one logical tenant site. DB keeps `tenant_sites` (one row per deployment). No site picker in the UI; current site inferred from schema.
- **Feature registry sort:** PHP-Auth `feature_registry` has an **order** field; use it for sort order of the gating list.
- **Roles in website-cms:** Option B — read-only list of roles and their assigned permissions and features (no role creation in website-cms; roles created only in PHP-Auth).
- **Users (superadmin vs tenant admin):** Superadmin → Users and Settings → Users are the same list/capability. Tenant admins must be able to add team members: “add new user” and “assign role” are essential. New roles are created only in the PHP-Auth app and are scoped and made available for all tenant apps.
- **Superadmin Dashboard:** Tabbed design — one tab for **metrics/info** (current site), one tab for **gating** (feature gating table).

---

## M5 / PHP-Auth SSOT & superadmin redesign — step plan

**Phase A — PHP-Auth contract and docs**

- [x] **A1** Document PHP-Auth model in `docs/reference/` (e.g. php-auth-integration-clarification or dedicated doc): `feature_registry` (scope per app type, **order** for sort), `permission_registry` (global), role = features + permissions + name/slug/label; roles created only in PHP-Auth; website-cms uses label for display, slug for identity. → [reference/php-auth-roles-features-permissions.md](./reference/php-auth-roles-features-permissions.md)
- [x] **A2** Confirm PHP-Auth APIs (or add them): list roles for app type (e.g. scope `website-cms`); list `feature_registry` for scope (include **order**); list role–feature and role–permission assignments for read-only Roles view. Document endpoints and response shapes. → Same doc §2.

**Phase B — Website-cms: role list from PHP-Auth, no role creation**

- [x] **B3** Role picker from PHP-Auth: fetch roles for this app (website-cms scope); return `{ slug, label }` (and optional id). Use for superadmin Users and Settings → Users (replace fixed `listRolesForAssignment()` where used for assignment). → `getRolesForAssignmentFromPhpAuth()` in `src/lib/php-auth/fetch-roles.ts`; fallback to `listRolesForAssignment()`; wired in team API, admin roles API, super page.
- [x] **B4** Remove role creation in website-cms: remove/hide “Create role” and any POST/PATCH that create or update roles. Replace “Roles & Features” with **read-only Roles** page: list roles from PHP-Auth and show each role’s assigned permissions and features (no edit in website-cms). → Done: POST 410; RolesReadOnly; [roleSlug] redirects. API returns features/permissions with parentSlug; we parse and display hierarchy in role detail (Permissions/Features tabs).

**Phase C — Feature registry from PHP-Auth**

- [x] **C5** Tenant feature gating — registry from PHP-Auth: fetch `feature_registry` for scope `website-cms` (use **order** for sort). Use this list for the gating table (labels, ids/slugs). Keep “which features are enabled for this tenant” in website-cms (e.g. `tenant_features`), keyed by feature id/slug from PHP-Auth.

**Phase D — Superadmin UI restructure (M5)**

- [x] **D6** Remove tenant site list and picker: remove “Tenant Sites” from superadmin nav and any “choose a site” flow. Current site from schema only (e.g. `getTenantSiteBySchema`).
- [x] **D7** New Superadmin Dashboard (tabbed): **Tab 1 — Metrics/info:** current site metrics, site mode, coming soon. **Tab 2 — Gating:** feature gating table (features from PHP-Auth, sorted by **order**; toggles stored in website-cms). Reuse or move content from current tenant-site detail as needed. → Done: Dashboard shows current site; metrics (site mode, coming soon) + gating on current-site detail (`/admin/super/tenant-sites/[id]`) with TenantSiteModeCard + TenantFeaturesManager.
- [x] **D8** Superadmin Users page: same as Settings → Users for current site (non-GPUM; add user, assign role). Role picker from PHP-Auth (B3). Ensure tenant admins retain “add new user” and “assign role” in Settings → Users. → Done: current-site users via Dashboard → current site → Related Tenant Users (add/assign); Tenant Users = master list; role picker from PHP-Auth (B3); Settings → Users unchanged.
- [x] **D9** Superadmin nav: Dashboard (tabbed), Users, Roles (read-only from PHP-Auth), Code Library, Security. No Tenant Sites. → Done: sidebar has Dashboard, Tenant Users, Roles, Code Library, Security; Roles is read-only from PHP-Auth with list + detail (Permissions/Features hierarchy).

**Phase E — Cleanup and docs**

- [ ] **E10** Deprecate local SSOT for roles/features: document that `admin_roles` / `role_features` (and `feature_registry` where replaced) are not source of truth; PHP-Auth is. No role creation or feature-registry writes from website-cms.
- [ ] **E10a** **PHP-Auth SSOT for role permissions/features (gating):** Display done (roles API returns features/permissions per role; we show in Roles list/detail with hierarchy). **Pending:** Wire `getEffectiveFeatureSlugs` to use PHP-Auth role→features instead of local `role_features` per [reference/php-auth-ssot-roles-features-plan.md](./reference/php-auth-ssot-roles-features-plan.md).
- [ ] **E11** Update sessionlog/planlog and changelog with M5 progress and “Context for Next Session” when appropriate.



**Lockout prevention:** M1 is done before M2 so your account exists in PHP-Auth when we first call central. When PHP-Auth **is** configured we already resolve role only from validate-user (no fallback to metadata/tenant_user_assignments). Fallback exists only when PHP-Auth is **not** configured (unset AUTH_*), so the app still runs. Recovery: fix user/org/role in PHP-Auth (or when not configured, metadata/tenant_user_assignments).

**Execution:** Update the Status column above as each phase is completed. M4 complete; continue from Current Focus and Next up below.

**M0 detail (env, validate-user, audit-log, checklist):** See [reference/php-auth-integration-clarification.md](./reference/php-auth-integration-clarification.md). **When to do M0–M5:** M0 first (env + validate-user + audit-log); M1 after PHP-Auth has org + app + users; M2 dual-read in website-cms; M3 once PHP-Auth has user–org–role API; M4 central-only read; M5 superadmin UI redesign.

---

## Roles transition: PHP-Auth as SSOT (tenant_sites unchanged)

**Principle:** `tenant_sites` = site mode, lock, membership_enabled, coming_soon, current-site only. Role definitions + assignments = PHP-Auth. Refs: [php-auth-integration-clarification](./reference/php-auth-integration-clarification.md), [php-auth-website-cms-tables-cross-reference](./reference/php-auth-website-cms-tables-cross-reference.md).

| Step | Task | Status |
|------|------|--------|
| **1** | Role definitions from PHP-Auth for UI (dropdowns); stop using `admin_roles`/`role_features` as source. | ✅ Done |
| 2 | Role–features from PHP-Auth for display (read-only Roles list/detail with permissions and features). Gating (getEffectiveFeatureSlugs from PHP-Auth) still optional/pending. | ✅ Done (display) |
| 3 | Role assignment: sync already wired in team + tenant-sites users APIs; document M3 recovery procedure. | ✅ Done ([m3-recovery-procedure.md](./reference/m3-recovery-procedure.md)) |
| 4 | M4 central-only read: remove fallback to `tenant_user_assignments`/user_metadata; resolve only from validate-user. | ✅ Done |
| 4a | **PHP-Auth SSOT for role→features (gating):** API and display done. Pending: use role→features in `getEffectiveFeatureSlugs` instead of local `role_features` per [reference/php-auth-ssot-roles-features-plan.md](./reference/php-auth-ssot-roles-features-plan.md). | ⏳ Pending (gating) |
| 5 | Document deprecation of `admin_roles`, `role_features`, read path of `tenant_user_assignments`; tenant_sites unchanged. | ⏳ |

**Dev server:** If you see `ENOENT: no such file or directory, open '.next/routes-manifest.json'`, delete the `.next` folder and run `pnpm run dev` again.

---

## Phase F — Gating and Role Limit Navigation

**Design (from discussion):**

- **Role restrictions:** Links the user’s role does not allow are **hidden** (not shown) to avoid confusion. This includes **sub-level hiding**: e.g. under CRM, show only Contacts/Forms/Memberships the role allows; if the role has none, hide the whole section. Applies to all roles (including admins who may have a subset of features).
- **Gating (plan / tenant toggles):** When the role allows a feature but the tenant has it turned off (subscription gate), show the link as **ghosted** (grayed, disabled). A **single upgrade page** shows the message “Not included in your plan. Request support” (or similar); no separate page per feature. Ghosted links and blocked access redirect to this page.

**Current state:** Feature guard blocks access and redirects to dashboard with “This feature is not enabled for your account. Contact your plan administrator.” Sidebar hides items not in effective slugs. Role-only slugs and ghosted/upgrade UX are not implemented.

| Step | Task | Status |
|------|------|--------|
| **F1** | **Role feature slugs in layout:** Provide “role-only” feature slugs to the client (e.g. `getRoleFeatureSlugsForCurrentUser()` or from PHP-Auth/local). Pass both **role slugs** and **effective slugs** from admin layout to sidebar (and guard). Depends on Step 4a or existing role→features. | ⏳ |
| **F2** | **Single upgrade page:** Add route (e.g. `/admin/upgrade` or `/admin/feature-unavailable`) with copy “Not included in your plan. Request support” and CTA (support/contact link). | ⏳ |
| **F3** | **Sidebar: hide by role, ghost by plan:** Hide items whose slug is not in **role** slugs (with sub-level rules: parent visible only if at least one child in role; hide children not in role). Ghost items in **role** but not in **effective** (disabled style; link or onClick → upgrade page). Normal link when in **effective**. | ⏳ |
| **F4** | **FeatureGuard → upgrade page:** When access is blocked, redirect to the single upgrade page (or modal that links there) instead of dashboard. Same page for both “no role” and “no plan” unless different copy is desired. | ⏳ |
| **F5** | **Copy and QA:** Finalize “Not included in your plan. Request support” and CTA; test role-hide (including sub-level), ghosted links, and direct URL hits. | ⏳ |

---

## Next up
- [ ] **Change the first sub-item under Calendar** from "Calendar" to "Events"
- [ ] **On the events page** change "Calendar" to "Calendar Events"
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
