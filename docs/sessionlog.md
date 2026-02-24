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

**References:** PHP-Auth `docs/authplanlog.md` (Section 2: website-cms integration); PHP-Auth `docs/sessionlog.md` (Website-CMS Migration to Central Store). Per-tenant config: `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_API_KEY` in env (from PHP-Auth when the Application was created).

| Phase | Description | Website-CMS tasks | Status |
|-------|-------------|------------------|--------|
| **M0** | **Connect external app to PHP-Auth** | In the external app (e.g. website-cms): add env (AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, AUTH_API_KEY); implement calls to validate-user (roles) and audit-log (audit events). See **M0 step (detailed)** below. | ✅ Completed |
| **M1** | **Populate central (PHP-Auth)** | No code change in website-cms. In PHP-Auth: ensure your superadmin user (and all current admins) exist in `users` (same `supabase_user_id` as in auth.users) and have correct `auth_user_organizations` for the org that maps to this tenant. Store `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_APP_API_KEY` in this app’s env. Map tenant id/slug → PHP-Auth Organization UUID. | ✅ Completed |
| **M2** | **Dual-read** | Where you resolve “current user’s role for this tenant” (e.g. `getRoleForCurrentUser`, `getEffectiveFeatureSlugsForCurrentUser`): (1) Call PHP-Auth `POST /api/external/validate-user` with `Authorization: Bearer <session token>` and `X-API-Key: <AUTH_APP_API_KEY>`. (2) If 200 and `data.organizations` includes org with `id === AUTH_ORG_ID`, use that org’s role (and features) for this request. (3) If 401, 403, or 5xx, **fallback** to current logic (user_metadata for superadmin, tenant_user_assignments for tenant admins). Keep writing only to website-cms store (tenant_user_assignments, user_metadata) for now. | ✅ Completed |
| **M3** | **Writes to central** | When assigning a role to a user on a tenant: perform the write in PHP-Auth (e.g. call PHP-Auth API to add user to org with role, or document that Superadmin does it in PHP-Auth UI). Optionally keep syncing to `tenant_user_assignments` during transition. Document **recovery procedure**: if locked out, re-add/fix your user in PHP-Auth (UI or SQL) or temporarily set `user_metadata.role` in auth.users so fallback in M2 still grants access. | 🔄 In progress |
| **M4** | **Central-only read (optional)** | Remove fallback: resolve roles only from PHP-Auth (validate-user). Do only after verifying in staging/production that every relevant user has correct data in PHP-Auth. Keep recovery procedure from M3. Optionally stop writing to tenant_user_assignments and deprecate that table later. | ⏳ Pending |

**Lockout prevention:** M1 is done before M2 so your account exists in PHP-Auth when we first call central. M2–M3 keep fallback so if PHP-Auth is down or wrong, we still use user_metadata + tenant_user_assignments. Recovery: fix user/assignment in PHP-Auth or temporarily restore user_metadata/fallback in website-cms.

**Execution:** Update the Status column above as each phase is completed. M3 (writes to central) is the current focus.


### M0 Step (detailed) — Copied from php-auth app - we are connecting to this app

**Pre-coding clarification:** See [docs/reference/php-auth-integration-clarification.md](./reference/php-auth-integration-clarification.md) for a single reference (env, dual-read flow, role mapping, audit, implementation order) before implementing M0.

**Purpose:** Configure the external app to use PHP-Auth for **role resolution** and **audit logging** via the Organization UUID, Application UUID, and Application API key. Login stays on Supabase Auth (auth.users); no change to how users sign in.

**Scope:** Steps below are performed in the **external app**. Prerequisites: in PHP-Auth, create Organization and Application and copy the one-off API key and UUIDs.

---

#### Prerequisites (in PHP-Auth)

1. Create an **Organization** (if needed) and an **Application** under it for this tenant/app (e.g. "Website CMS – Production").
2. On Application create, copy and store securely: **Organization UUID**, **Application UUID**, **Application API key** (shown once).
3. Ensure users who need access exist in PHP-Auth's `users` table and have correct org/role (M1).

---

#### 1. Environment variables (external app)

In the external app's environment (e.g. `.env` or deployment config), set:

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_BASE_URL` | Base URL of the PHP-Auth API (no trailing slash). | `https://auth.yourdomain.com` or `http://localhost:5000` |
| `AUTH_ORG_ID` | Organization UUID from PHP-Auth (from the Application's org). | `550e8400-e29b-41d4-a716-446655440000` |
| `AUTH_APPLICATION_ID` | Application UUID from PHP-Auth (the app you created). | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `AUTH_API_KEY` | Application API key from PHP-Auth (stored securely; e.g. secrets manager in production). | `phpa_xxxxxxxxxxxxxxxxxxxxxxxx` |

Never commit the API key to source control.

---

#### 2. Retrieving roles: Validate User (PHP-Auth as source of roles)

Call when you need the **current user's roles/organizations** for the tenant (e.g. after login, on app load, or in a route guard).

**Endpoint:** `POST {AUTH_BASE_URL}/api/external/validate-user`

**Headers:**

| Header | Required | Value |
|--------|----------|--------|
| `Authorization` | Yes | `Bearer <user's Supabase access token>` (same JWT from Supabase Auth). |
| `X-API-Key` | Yes | `AUTH_API_KEY` (application API key). |
| `Content-Type` | Yes | `application/json`. |

**Request body:** None required (POST with `{}` or no body).

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-in-php-auth",
      "supabaseId": "supabase-auth-user-id",
      "email": "user@example.com",
      "fullName": "Jane Doe",
      "isActive": true
    },
    "application": {
      "id": "application-uuid",
      "organizationId": "organization-uuid",
      "name": "Website CMS",
      "isActive": true
    },
    "organizations": [
      {
        "id": "organization-uuid",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "roleId": "role-uuid",
        "roleName": "Admin",
        "permissions": [],
        "coreAppAccess": {}
      }
    ],
    "sessionId": "session-uuid-or-null",
    "message": "Multi-tier authentication successful"
  }
}
```

**How to use for roles:**

- **Check tenant access:** See if `data.organizations` contains an organization whose `id` equals `AUTH_ORG_ID`. If yes, the user has access to this tenant.
- **Role for this tenant:** Use the matching organization's `roleName` (and optionally `roleId`, `permissions`, `coreAppAccess`) as the user's role for the current tenant.
- **Fallback (M2 dual-read):** If the request fails (4xx/5xx) or the user is not in PHP-Auth yet, fall back to your existing role source (e.g. user_metadata or local tenant tables).

**Error handling:** 401 = missing/invalid API key or Bearer token. 403 = user not in PHP-Auth or not a member of the application's organization. 500 = server error; use fallback if you have dual-read.

---

#### 3. Writing audit information: Audit Log (push events to PHP-Auth)

Use to send **audit events** from the external app to the central PHP-Auth audit log.

**Endpoint:** `POST {AUTH_BASE_URL}/api/external/audit-log`

**Headers:**

| Header | Required | Value |
|--------|----------|--------|
| `X-API-Key` | Yes | `AUTH_API_KEY` (application API key). |
| `Content-Type` | Yes | `application/json`. |

No Bearer token is required for audit-log; the API key identifies the application.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | **Yes** | Audit action (e.g. `page_edit`, `content_publish`, `login_success`, `form_submit`). |
| `organizationId` | string | **Yes** | Must be exactly `AUTH_ORG_ID`. |
| `applicationId` | string | **Yes** | Must be exactly `AUTH_APPLICATION_ID`. |
| `userId` | string | No | PHP-Auth user ID (from validate-user `data.user.id`) if the action is tied to a user. |
| `resourceType` | string | No | Resource type (e.g. `page`, `article`, `form`). |
| `resourceId` | string | No | Resource ID. |
| `loginSource` | string | No | Source identifier (e.g. `website-cms`). |
| `metadata` | object | No | Extra JSON (key/value). |
| `ipAddress` | string | No | Client IP (defaults to request IP if omitted). |
| `userAgent` | string | No | Client user agent (defaults to request `User-Agent` if omitted). |

**Example (minimal):**

```json
{
  "action": "content_publish",
  "organizationId": "<AUTH_ORG_ID>",
  "applicationId": "<AUTH_APPLICATION_ID>",
  "userId": "user-uuid-from-validate-user",
  "resourceType": "article",
  "resourceId": "article-123",
  "loginSource": "website-cms",
  "metadata": { "revision": 2 }
}
```

**Success response (201):** `{ "success": true, "data": { "id": "log-entry-uuid", "createdAt": "2025-02-18T12:00:00.000Z" } }`

**Validation:** 400 = missing/invalid `action`, `organizationId`, or `applicationId`. 403 = `organizationId` or `applicationId` does not match the API key's application. 429 = rate limit (300 requests per minute per API key).

**Where to call:** After important actions (login, content publish, page save, role change, form submit). Prefer server-side so the API key is not exposed; if calling from the client, use a backend proxy that adds `X-API-Key`.

---

#### 4. Summary: how the three values are used

| Value | Where it comes from | How it's used |
|-------|---------------------|----------------|
| **Organization UUID** (`AUTH_ORG_ID`) | PHP-Auth → Application's organization | Sent in audit-log `organizationId`; used to match `data.organizations[].id` from validate-user for "user has access to this tenant." |
| **Application UUID** (`AUTH_APPLICATION_ID`) | PHP-Auth → Application record | Sent in audit-log `applicationId`; optional for logging/debugging. |
| **Application API key** (`AUTH_API_KEY`) | PHP-Auth → shown once on Application create | Sent in `X-API-Key` for both validate-user and audit-log; authenticates the external app to PHP-Auth. |

---

#### 5. Checklist (external app)

- [ ] Add `AUTH_BASE_URL`, `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_API_KEY` to env (and secrets where applicable).
- [ ] Implement "resolve current user's role" by calling **POST /api/external/validate-user** with Bearer (user's Supabase token) + X-API-Key; use `data.organizations` and match `AUTH_ORG_ID` to get role; optionally keep existing fallback for M2.
- [ ] Replace or supplement existing audit logging with **POST /api/external/audit-log** for key actions, sending `action`, `organizationId` = `AUTH_ORG_ID`, `applicationId` = `AUTH_APPLICATION_ID`, and optional fields; respect 429 (rate limit).
- [ ] Confirm in PHP-Auth that the Application card shows "Last used" after the first successful validate-user or audit-log call.

---

**When to do migration steps (interleave with PHP-Auth phases):** Do **M0** in the external app (env + validate-user + audit-log) using the org UUID, application UUID, and API key from PHP-Auth. Do **M1** once PHP-Auth has org + application (API key) and user–org–role assignments — i.e. after **Phase 4** and **Phase 5**. Then do **M2** in website-cms (dual-read). Do **M3** once PHP-Auth has a way for tenant apps (or Superadmin) to add/update user–org–role — Phase 5 APIs or Phase 7. Do **M4** last, after M2 and M3 are stable. Interleaving validates the integration early and surfaces contract/schema issues before Phase 9.
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
