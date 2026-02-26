# M4: Central-only read — step plan

**Purpose:** Remove fallback so role is read only from PHP-Auth when configured. Execute steps in order; check off as done.

**Principle:** When `isPhpAuthConfigured()` is true, we never read role from `user_metadata` or `tenant_user_assignments`. When not configured, keep current fallback so the app runs without central auth.

---

## Step 1 — resolve-role.ts: remove fallback in getRoleForCurrentUser

**File:** `src/lib/auth/resolve-role.ts`

- [x] **1.1** In `getRoleForCurrentUser()`: After the existing "if (isPhpAuthConfigured()) { try { … validateUser … return role } catch { } }" block, **do not** fall through to metadata or tenant_user_assignments when PHP-Auth is configured. Add `if (isPhpAuthConfigured()) return null;` before the metadata check (so when configured and validate-user didn't return, we return null).
- [x] **1.2** Keep the rest of the function as fallback for when `!isPhpAuthConfigured()` (metadata superadmin, then getRoleForUserOnSite for tenant admin).

**Result:** When PHP-Auth configured, role comes only from validate-user; on failure or missing org, return null.

---

## Step 2 — resolve-role.ts: remove fallback in getRoleForCurrentUserOnSite

**File:** `src/lib/auth/resolve-role.ts`

- [x] **2.1** In `getRoleForCurrentUserOnSite()`: Same pattern. After the validate-user block, if `isPhpAuthConfigured()` then `return null` instead of falling through to metadata and getRoleForUserOnSite.
- [x] **2.2** Keep fallback when not configured.

---

## Step 3 — resolve-role.ts: getEffectiveFeatureSlugsForCurrentUser

**File:** `src/lib/auth/resolve-role.ts`

- [x] **3.1** Remove the early-return that checks `user.metadata.type === "superadmin" && user.metadata.role === "superadmin"` and returns `"all"`. Rely only on `getRoleForCurrentUser()`; then if role === `PHP_AUTH_ROLE_SLUG.SUPERADMIN` return `"all"`.
- [x] **3.2** Ensure when role is null (e.g. PHP-Auth failed) we return `[]`, not `"all"`.

---

## Step 4 — resolve-role.ts: getTeamManagementContext

**File:** `src/lib/auth/resolve-role.ts`

- [x] **4.1** When `isPhpAuthConfigured()`: Get role via `getRoleForCurrentUser()`. Do not read metadata for superadmin or tenant_user_assignments for role. If role === SUPERADMIN → return canManage true, isOwner false, tenantSiteId, tenantUserId null. If role === ADMIN (PHP_AUTH_ROLE_SLUG.ADMIN) → canManage true; **is_owner** still read from `getAssignmentByAdminAndTenant(tenantUser.id, tenantSiteId)` so the Owner badge works (keep tenant_users + getAssignmentByAdminAndTenant for resolving tenant user id and is_owner only). If role is other or null → canManage false.
- [x] **4.2** When not configured: keep current logic (metadata superadmin, then assignment for admin + is_owner).
- [x] **4.3** Ensure we still resolve tenantSiteId from schema and tenantUser from getTenantUserByAuthUserId for the ADMIN case (we need tenantUserId for is_owner and for return value).

---

## Step 5 — resolve-role.ts: export role-based helpers

**File:** `src/lib/auth/resolve-role.ts` (or `src/lib/php-auth/role-mapping.ts`)

- [x] **5.1** Add and export `isSuperadminFromRole(role: string | null): boolean` — return `role === PHP_AUTH_ROLE_SLUG.SUPERADMIN`.
- [x] **5.2** Add and export `isAdminRole(role: string | null): boolean` — return `role === PHP_AUTH_ROLE_SLUG.ADMIN` (or include other admin-style roles if needed). Use for "can manage team" and similar.

**Result:** Callers can do `const role = await getRoleForCurrentUser(); if (isSuperadminFromRole(role)) …`.

---

## Step 6 — Middleware: use validate-user when PHP-Auth configured

**File:** `src/middleware.ts`

- [x] **6.1** When PHP-Auth is configured, we need role from validate-user for protected routes. In the protected-route block, after we have `user`, if `isPhpAuthConfigured()`: get session (access_token), call validate-user (you may need a small helper that runs in middleware context with the request cookies/session). Get org for this app (AUTH_ORG_ID); if user is in that org, get role (roleSlug or roleName) and map to PHP-Auth slug.
- [x] **6.2** Use that resolved role for: (a) isSuperadminRoute → allow only if role === SUPERADMIN; (b) else (admin routes) → allow if role is superadmin or admin (and for tenant access, "in org" from validate-user means they have access to this app). Replace direct `user.metadata.type` / `user.metadata.role` checks when configured.
- [x] **6.3** If validate-user fails or user not in org when configured → redirect to login (or dashboard for superadmin route) as appropriate.
- [x] **6.4** When not configured: keep current behavior (metadata + validateTenantAccess).
- [x] **6.5** Ensure MFA (AAL2) logic still runs after the role check; don't block challenge/enroll/success pages.

**Done:** Middleware calls validateUser(session.access_token) in Edge; uses role for /admin and /admin/super gating. /admin and /admin/login redirects also resolve role when PHP-Auth configured.

---

## Step 7 — supabase-auth: document or add async superadmin when configured

**File:** `src/lib/auth/supabase-auth.ts`

- [ ] **7.1** Keep `isSuperadmin(user)` for backward compatibility when PHP-Auth is not configured. Add a short JSDoc: when PHP-Auth is configured, prefer getRoleForCurrentUser() + isSuperadminFromRole(role) for server-side checks.
- [ ] **7.2** (Optional) Add `async function isSuperadminAsync(): Promise<boolean>` that calls getRoleForCurrentUser() and returns isSuperadminFromRole(role), for use in API routes so they don't have to repeat the pattern. Export from resolve-role or supabase-auth.

---

## Step 8 — API routes: replace metadata superadmin/admin checks

**Files:** (grep for `user.metadata.type` / `user.metadata.role` in API routes and server code)

- [ ] **8.1** `src/app/api/admin/tenant-sites/[id]/snippets/route.ts` — Replace metadata superadmin check with getRoleForCurrentUser() + isSuperadminFromRole(role). Return 403 if not superadmin when configured.
- [ ] **8.2** `src/app/api/settings/snippets/route.ts` — Replace metadata admin/superadmin check with getRoleForCurrentUser() + (isSuperadminFromRole(role) || isAdminRole(role)).
- [ ] **8.3** `src/app/api/admin/color-palettes/route.ts` and `[id]/route.ts` — Same: role from getRoleForCurrentUser(), then isAdminRole(role) or isSuperadminFromRole(role).
- [ ] **8.4** `src/app/api/settings/site-metadata/route.ts` — Same.
- [ ] **8.5** `src/app/api/settings/site-mode/route.ts` — Same (and the superadmin-only branch).
- [ ] **8.6** `src/app/api/settings/team/route.ts` — Uses getTeamManagementContext(); ensure that when PHP-Auth configured, context is from Step 4. No change if context already uses getRoleForCurrentUser().
- [ ] **8.7** `src/app/api/admin/me/context/route.ts` — Replace metadata admin/superadmin with getRoleForCurrentUser() + role check.
- [ ] **8.8** `src/app/api/admin/settings/design-system/route.ts` — Same.
- [ ] **8.9** `src/app/api/admin/integrations/route.ts` — Superadmin + AAL2; replace metadata superadmin with getRoleForCurrentUser() + isSuperadminFromRole(role).
- [ ] **8.10** `src/app/api/automations/on-member-signup/route.ts` — Uses metadata.type !== "member"; leave or align with role (member vs admin) from PHP-Auth if applicable.
- [ ] **8.11** `src/app/api/auth/mfa/recover/route.ts` — Currently allows only metadata superadmin. When PHP-Auth configured: require getRoleForCurrentUser() === SUPERADMIN (so only central superadmin can recover MFA). When not configured, keep metadata check.
- [ ] **8.12** `src/app/api/auth/mfa/unenroll/route.ts` — Same as recover if it checks superadmin.
- [ ] **8.13** Any other route that uses `isSuperadmin(user)` or `user.metadata.type`/`role`: switch to getRoleForCurrentUser() + isSuperadminFromRole / isAdminRole when PHP-Auth configured.

---

## Step 9 — Server components / pages

**Files:** Pages or server components that read metadata for display (e.g. super dashboard showing "User Type / Role").

- [ ] **9.1** `src/app/admin/super/page.tsx` — If it displays `user.metadata.type` / `user.metadata.role`, consider showing resolved role from getRoleForCurrentUser() when configured (so UI reflects central role).
- [ ] **9.2** Any other server component that gates on isSuperadmin(user): use getRoleForCurrentUser() + isSuperadminFromRole(role) when configured.

---

## Step 10 — Recovery doc

**File:** `docs/reference/m3-recovery-procedure.md`

- [ ] **10.1** Add a section "After M4 (central-only read)" stating that fallback is removed. Recovery is **only Option A** (fix user/org/role in PHP-Auth). Options B and C (temporary metadata or tenant_user_assignments) no longer work.
- [ ] **10.2** Keep Option A steps; add a note at the top that after M4, only Option A applies.

---

## Step 11 — Session / login (optional, later)

- [ ] **11.1** If you later want to avoid calling validate-user on every request in middleware, add: after successful login (and after MFA if required), call validate-user once and store role (and optionally type) in an encrypted cookie or server-side session; middleware reads from that. Defer until Step 6 is done and you measure performance.

---

## Test checklist (before / after deploy)

**Local (AUTH_* in .env.local, PHP-Auth reachable):**

1. **Superadmin:** Log in with a user that has role `website-cms-superadmin` in PHP-Auth for AUTH_ORG_ID. Open `/admin/super`, Superadmin → Verify session. Expect: PHP-Auth role shown, "Good to go" when session + MFA + role pass.
2. **Tenant admin:** Log in with a user that has `website-cms-admin` (or editor/creator/viewer) in PHP-Auth. Open `/admin/dashboard`. Expect: dashboard and admin routes work; `/admin/super` redirects to dashboard.
3. **No role / PHP-Auth down:** With PHP-Auth configured, remove your user from the org (or stop PHP-Auth). Reload `/admin/dashboard`. Expect: redirect to login (role = null).
4. **PHP-Auth not configured:** Unset the four AUTH_* vars, restart dev server. Expect: app still works using metadata + tenant_user_assignments.

**Vercel (AUTH_* in project env):**

5. Deploy, then repeat (1)–(3) on the deployed URL. Ensure AUTH_BASE_URL is reachable from Vercel (e.g. public PHP-Auth URL).

**If login shows “couldn’t be verified” (reason=no_central_role):** See [validate-user-troubleshooting.md](./validate-user-troubleshooting.md) for the PHP-Auth checklist, env checks, curl test, and audit log steps.

---

## Verification

- [ ] With PHP-Auth configured: log in as superadmin (user in PHP-Auth with website-cms-superadmin). Access super routes; expect success. Stop PHP-Auth or remove user from org; expect no access (redirect or 403).
- [ ] With PHP-Auth configured: log in as tenant admin (user in PHP-Auth with website-cms-admin). Access admin but not super; expect correct behavior.
- [ ] With PHP-Auth not configured (unset AUTH_* or use env flag): app still works with metadata + tenant_user_assignments fallback.
- [ ] MFA recover flow: only users who are superadmin **from PHP-Auth** can call recover when configured.
