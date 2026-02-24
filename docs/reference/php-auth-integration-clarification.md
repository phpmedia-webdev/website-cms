# PHP-Auth integration — clarification before coding

**Purpose:** Single reference for implementing M0 (connect website-cms to PHP-Auth) with dual-read. See [sessionlog.md](../sessionlog.md) for the full M0 step (detailed) and migration phases. For table mapping (roles, permissions, features) between website-cms and PHP-Auth, see [php-auth-website-cms-tables-cross-reference.md](./php-auth-website-cms-tables-cross-reference.md).

**Dual-read is temporary.** We are fully migrating away from the current tables that manage roles and features (`tenant_user_assignments`, user_metadata for roles, etc.). Dual-read is a transition phase (M2) to avoid lockout; the target state is PHP-Auth as the **sole source** for roles and features (M4). After migration is verified, fallback will be removed and those tables can be deprecated.

**User scope and PHP-Auth's job:** In PHP-Auth, users are scoped to one or more **organizations**, one or more **applications**, and a **role** for those applications. This app (and every tenant app) must use the **proper user scope** for access — i.e. the scope that applies to *this* application and *this* organization. It is **PHP-Auth's job** to look at the **calling app** (identified by the API key → organization id + application id), identify the user from the Bearer token, and return an auth response **based on that org, that app, and that user**. So PHP-Auth effectively builds the auth token/context for "this user's access to this application"; tenant apps then use that scoped response for access and do not have to infer scope from a raw list of all orgs/apps the user belongs to.

---

## 1. Scope (what we're building)

- **Login:** Unchanged. Still Supabase Auth (`auth.users`). No change to sign-in flow.
- **Role resolution:** Add **dual-read (temporary)**: try PHP-Auth `POST /api/external/validate-user` first; if success and user is in this app's org, use that role. Otherwise **fallback** to current logic (user_metadata for superadmin, `tenant_user_assignments` for tenant admins). Prevents lockout during migration. **End state:** roles/features come only from PHP-Auth; current role tables will no longer be used.
- **Effective features (sidebar):** Continue to derive from **role** + website-cms `feature_registry` / `role_features` / `tenant_features`. PHP-Auth returns `roleName` (e.g. "Admin"); we map to our role slug (e.g. `admin`) and call existing `getEffectiveFeatureSlugs(tenantSiteId, roleSlug)` so sidebar and route guards work without PHP-Auth needing to know our feature slugs.
- **Audit:** Push selected events to PHP-Auth `POST /api/external/audit-log` (server-side only; API key in env). Events: e.g. `login_success`, `login_failed`, `content_publish`, `page_save`, `role_assigned`, `form_submit` (expand as needed).

---

## 2. Environment variables (per sessionlog M0)

| Variable | Description | Where set |
|----------|-------------|-----------|
| `AUTH_BASE_URL` | PHP-Auth API base URL (no trailing slash). | Local: `.env.local`; Vercel: Environment Variables. |
| `AUTH_ORG_ID` | Organization UUID from PHP-Auth (from the Application's org). | Same. |
| `AUTH_APPLICATION_ID` | Application UUID from PHP-Auth. | Same. |
| `AUTH_API_KEY` | Application API key from PHP-Auth (secret). | Same; never commit. |

**Prerequisites (done):** Org, Application, and API key created in PHP-Auth; you have the three UUIDs and the API key. Add these four to Vercel (and locally) before or with the first deploy.

**Where to develop this migration:** Use **localhost** for the migration dev process. Run website-cms locally (`pnpm run dev`), set the four AUTH_* vars in `.env.local`, and point `AUTH_BASE_URL` at your PHP-Auth instance. If PHP-Auth runs locally, its default port in that codebase is **5000** (e.g. `http://localhost:5000`); use another port only if your PHP-Auth is explicitly configured for it. For a deployed staging URL, use that as `AUTH_BASE_URL`. You get fast iteration and easy debugging; if PHP-Auth runs locally, Vercel cannot reach it anyway. After M0 works locally, deploy to Vercel (or a preview), add the same AUTH_* vars there, and verify validate-user and audit-log in the hosted environment before considering M0 complete.

---

## 3. Where role resolution is used (dual-read insertion points)

PHP-Auth validate-user is called with the app's `X-API-Key` (and user's Bearer token). PHP-Auth resolves the **calling app** (org + application from the API key) and returns the user's access **for that app** — so the response is already scoped to this application and org.

- **`getRoleForCurrentUser()`** in `src/lib/auth/resolve-role.ts` — used by admin layout and others. **Dual-read:** Call PHP-Auth validate-user with current user's Supabase access token + `X-API-Key`. If 200, use the returned (scoped) role: e.g. `data.organizations` includes the org for this app (`id === AUTH_ORG_ID`), use that org's `roleName` (normalized to our slug). Else fallback to existing logic (superadmin from metadata, else tenant_user_assignments).
- **`getEffectiveFeatureSlugsForCurrentUser()`** in same file — depends on role. **Dual-read:** If role came from PHP-Auth, map `roleName` → our role slug (e.g. "Admin" → `admin`, "Editor" → `editor`) and call `getEffectiveFeatureSlugs(tenantSiteId, roleSlug)` (existing). If role came from fallback, keep current behavior. Superadmin still returns `"all"` without calling PHP-Auth. **Confirmed:** PHP-Auth's validate-user does **not** currently return feature slugs for the application; using `roleName` → slug and existing `getEffectiveFeatureSlugs(tenantSiteId, roleSlug)` is the correct approach for M0/M2.

**Session token for validate-user:** Server-side we have the session (e.g. via `createServerSupabaseClientSSR()` and `getSession()`). Pass the **access_token** (JWT) as `Authorization: Bearer <access_token>` to PHP-Auth.

---

## 4. Use PHP-Auth slug as the single reference (no internal slug)

**We do not maintain a separate "internal" slug.** PHP-Auth is the SSOT for roles, permissions, and feature assignments. The role slug we use and reference everywhere in website-cms is the **PHP-Auth slug** (unique for this application type). If validate-user returns `roleName` we convert it to the PHP-Auth slug; if it returns `roleSlug` we use it as-is.

We use **only the role for the org that matches AUTH_ORG_ID**. PHP-Auth auth-hub "Super-Admin" does **not** cross-grant website-cms; only application-scoped roles (website-cms-*) are used.

Official PHP-Auth slugs for website-cms:

| PHP-Auth Role Name       | PHP-Auth Slug (use this everywhere) | Label (display) |
|--------------------------|--------------------------------------|-----------------|
| Website-CMS-SuperAdmin   | website-cms-superadmin               | SuperAdmin      |
| Website-CMS-Admin        | website-cms-admin                    | Admin           |
| Website-CMS-Editor       | website-cms-editor                   | Editor          |
| Website-CMS-Creator      | website-cms-creator                  | Creator         |
| Website-CMS-GPUM         | website-cms-gpum                     | GPUM            |

**GPUM is different:** Website-CMS-GPUM is **not** for typical admin users (Admin, Editor, Creator, Viewer, SuperAdmin). It is for **CRM members** who need to be authenticated as a member — i.e. end-users (e.g. contacts in the CRM) who log in to access member-only content or member area. They do not get the admin sidebar or admin dashboard; they are authenticated as members. Use `website-cms-gpum` when resolving member auth and when distinguishing admin-style roles from member role in code.

(Viewer not in list; if PHP-Auth adds it, use `website-cms-viewer`.)

**Implementation:** `src/lib/php-auth/role-mapping.ts` exports `PHP_AUTH_ROLE_SLUG`, `toPhpAuthRoleSlug()`, `PHP_AUTH_ADMIN_ROLE_SLUGS`, and `isMemberRole(roleSlug)`. Use `isMemberRole(role)` when you need to treat GPUM as member (e.g. member-area access, not admin dashboard). For admin layout/sidebar/team management, only admin-style roles (SuperAdmin, Admin, Editor, Creator, Viewer) get access; GPUM users are authenticated as members, not given the admin UI.

---

## 4b. Role identifier and behavior (who decides what each role can do)

**Yes — we take the role (from PHP-Auth) and determine in code what to do with it.** The “what to do” (admin vs creator vs viewer, etc.) was built in website-cms and stays in website-cms; we are only changing *where the role comes from* (PHP-Auth instead of tenant_user_assignments / user_metadata).

- **Role source:** PHP-Auth validate-user returns the user’s role for this app (today we use `roleName`; the API may also expose `roleId`). We map that to a **slug** (e.g. `admin`, `creator`, `viewer`) so existing code keeps working.
- **Behavior in website-cms:** We already have logic that branches on that slug:
  - **Admin:** e.g. can manage team (Settings → Users), full tenant features per role_features.
  - **Editor / Creator / Viewer:** different feature sets from `getEffectiveFeatureSlugs(tenantSiteId, roleSlug)`, sidebar/route guards, team management (admin only).
  - **GPUM:** Not an admin role. Used for **CRM members** — authenticated members (e.g. CRM contacts who have an account) who access member-only content. They do not get the admin sidebar/dashboard; use for member auth and member-area access only.
- So: PHP-Auth tells us *which* role the user has; website-cms code decides *what that role is allowed to do* (features, team management, etc.). We do not move that authorization logic into PHP-Auth.
- **Later, roleId:** If we switch to using PHP-Auth’s `roleId` (UUID) instead of or in addition to `roleName`, we would add a mapping in code (or config) from roleId → slug (or roleId → behavior) so that:
  - Our existing branches (e.g. “if role === 'admin'”) continue to work, or
  - We resolve roleId to a slug first and then use the same feature/guard logic.  
  Using roleId is more stable if PHP-Auth renames roles (name changes, id stays the same). No code change required until we have roleId in the validate-user response and decide to use it.

---

## 5. Audit log (where and what to send)

- **Server-side only:** Call audit-log from API routes or server actions so `AUTH_API_KEY` is never exposed to the client.
- **Required body fields:** `action`, `organizationId` (= `AUTH_ORG_ID`), `applicationId` (= `AUTH_APPLICATION_ID`). Optional: `userId` (recommended: **PHP-Auth user id** from validate-user `data.user.id`, so audit log matches PHP-Auth's user drill-down; not the Supabase auth user id), `resourceType`, `resourceId`, `loginSource` (e.g. `"website-cms"`), `metadata`, `ipAddress`, `userAgent`.
- **Suggested events (start small):** `login_success`, `login_failed` (after auth callback or login API); optionally `content_publish`, `page_save`, `role_assigned`, `form_submit` in follow-up. Add a small helper (e.g. `pushAuditLog({ action, ... })`) that reads env and POSTs to `{AUTH_BASE_URL}/api/external/audit-log` with `X-API-Key`.
- **Rate limit:** 300 req/min per API key; handle 429 (e.g. log and skip or retry once).

---

## 6. Implementation order (suggested)

1. **Env and config** — Add the four AUTH_ vars to app config (e.g. `src/lib/php-auth/config.ts` or env helper). Document in prd-technical or sessionlog; you're adding to Vercel manually.
2. **Validate-user client** — New module (e.g. `src/lib/php-auth/validate-user.ts`): given Supabase access token, call `POST {AUTH_BASE_URL}/api/external/validate-user` with `Authorization: Bearer <token>`, `X-API-Key: AUTH_API_KEY`; return parsed response or throw/return error. Handle 401/403/5xx; no fallback in this module.
3. **Dual-read in resolve-role** — In `getRoleForCurrentUser()`: if AUTH_* env is set, try validate-user; if success and org matches `AUTH_ORG_ID`, map roleName → slug and return; else fallback to current logic. In `getEffectiveFeatureSlugsForCurrentUser()`: use role from same dual-read (so if we got role from PHP-Auth, use our getEffectiveFeatureSlugs(tenantSiteId, mappedSlug); superadmin still "all").
4. **Audit helper** — New helper (e.g. `src/lib/php-auth/audit-log.ts`): `pushAuditLog(body)` that POSTs to `{AUTH_BASE_URL}/api/external/audit-log` with `X-API-Key` and required fields. Call from login callback and login API (login_success / login_failed); expand to other events later.
5. **Tests** — With PHP-Auth running and env set, log in and confirm role/features still correct (and fallback works when PHP-Auth unavailable or user not in org).

---

## 7. Status vs sessionlog

- **M0 (Connect):** Env + validate-user + audit-log = what we implement. Sessionlog M0 checklist: add env, implement validate-user (with fallback for M2), implement audit-log.
- **M1 (Populate central):** Complete when (1) org + application exist in PHP-Auth and you have the API key and UUIDs, and (2) your user (and any other admins) exist in PHP-Auth's `users` table (same `supabase_user_id` as in auth.users) and have the correct org/role in `auth_user_organizations`. In PHP-Auth's sessionlog, M1 may still show ⏳ until both conditions are done.
- **M2 (Dual-read, temporary):** Implemented by the dual-read logic above (try PHP-Auth first, fallback to current). Exists only to prevent lockout during migration.
- **M3/M4:** Later — writes to central (PHP-Auth), then **central-only read**. At M4 we remove fallback and fully migrate away from `tenant_user_assignments` and role/feature data in website-cms; PHP-Auth becomes the sole source for roles and features.

---

## 8. Files to add or touch

| Area | Files |
|------|--------|
| Config | New: e.g. `src/lib/php-auth/config.ts` (read AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, AUTH_API_KEY; export `isPhpAuthConfigured()`). |
| Validate-user | New: `src/lib/php-auth/validate-user.ts` (call PHP-Auth validate-user; return user + organizations or null). |
| Role mapping | New: `src/lib/php-auth/role-mapping.ts` or inline in resolve-role (roleName → slug). |
| Dual-read | Edit: `src/lib/auth/resolve-role.ts` (getRoleForCurrentUser, getEffectiveFeatureSlugsForCurrentUser). |
| Audit | New: `src/lib/php-auth/audit-log.ts` (pushAuditLog). Call from: auth callback, login API, (later) content/role/form handlers. |

No change to login UI or Supabase Auth; only to how we **resolve** role and how we **log** audit events.
