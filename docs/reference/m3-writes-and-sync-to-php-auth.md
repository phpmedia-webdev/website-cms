# M3: User/role updates — local storage and sync to PHP-Auth

**Purpose:** When a tenant admin or superadmin adds, edits, or removes a user (or changes role/owner) in website-cms, the app (1) updates local state and (2) notifies PHP-Auth so it can remain the SSOT for user/role information.

---

## Two stores

| Store | Purpose |
|-------|--------|
| **Local (website-cms)** | `tenant_user_assignments`: who is assigned to which tenant site and with which role (and `is_owner`). Used for fallback during M2–M3 and for display. `role_slug` in this table has a FK to `admin_roles(slug)` so we store **legacy** slugs (`admin`, `editor`, etc.) here. |
| **Central (PHP-Auth)** | `auth_user_organizations` (or equivalent): SSOT for “user X has role Y in org Z” for this application. PHP-Auth uses its own role slugs (e.g. `website-cms-admin`). |

---

## Update flow (add / change role / remove)

1. **User action**  
   Tenant admin (Settings → Users) or superadmin (Tenant Sites → [site] → Related Tenant Users) adds a user, changes role/owner, or removes from site.

2. **API**  
   - **POST** add: `POST /api/settings/team` or `POST /api/admin/tenant-sites/[id]/users`  
   - **PATCH** update/remove: `PATCH /api/settings/team` or `PATCH /api/admin/tenant-sites/[id]/users`  
   Body includes `user_id` (tenant user id), `role_slug` (PHP-Auth slug from dropdown), and optionally `is_owner`.

3. **Local write**  
   - **Assign/update:** `assignUserToSite(tenantUserId, tenantSiteId, legacyRoleForDb, isOwner)`  
     - Upserts into `tenant_user_assignments` with `admin_id`, `tenant_id`, `role_slug` (legacy), `is_owner`.  
     - Legacy slug is derived from the request’s PHP-Auth slug via `phpAuthSlugToLegacySlug()` so the FK to `admin_roles(slug)` is satisfied.  
   - **Remove:** `removeUserFromSite(tenantUserId, tenantSiteId)` deletes the row.

4. **Sync to PHP-Auth**  
   After a successful local write, the API calls:
   ```ts
   syncUserOrgRoleToPhpAuth({
     supabaseUserId: tenantUser.user_id,
     email: tenantUser.email,
     roleSlug: phpAuthSlug,
     fullName: tenantUser.display_name ?? undefined,
     operation: "assign" | "update" | "remove",
     newUser: true,           // assign: so PHP-Auth creates user if missing
     addToOrgIfMissing: true, // assign + update: so user who exists in PHP-Auth but has no org/app gets added to your org and app
   });
   ```
   - **Implementation:** `src/lib/php-auth/sync-user-org-role.ts`  
   - **Assign/update:** `POST {AUTH_BASE_URL}/api/external/sync-user-role` (see [website-cms-sync-user-role-api.md](./website-cms-sync-user-role-api.md)). Body: `{ email, roleSlug, fullName?, newUser?, supabaseUserId?, addToOrgIfMissing? }`; org/app from X-API-Key.  
   - **Remove:** legacy `POST {AUTH_BASE_URL}/api/external/user-org-role` with `operation: "remove"` (no-op if endpoint missing).  
   - **Headers:** `X-API-Key: AUTH_API_KEY`, `Content-Type: application/json`  
   - Sync is fire-and-forget; 4xx/5xx are logged, not thrown.

---

## Flow: Admin/superadmin adds a new user here → user gets into PHP-Auth

1. **Admin or superadmin** adds a user in website-cms:
   - **Superadmin:** Superadmin → Tenant Sites → [site] → add user (email, role, optional invite).
   - **Tenant admin:** Settings → Team → add member (email, role, optional invite).

2. **If the email is not yet in local `tenant_users`:**
   - With **invite: true:** we call Supabase `inviteUserByEmail`, create a row in `tenant_users`, then assign to the site.
   - Without invite: we return *"User not found. Use invite: true to invite by email."*

3. **If the email is already in `tenant_users`** (e.g. they were added to another site before): we only create the **assignment** to this site (no new Supabase user).

4. **After local write:** we always call `syncUserOrgRoleToPhpAuth` with **operation: "assign"** and **newUser: true**. That sends `POST /api/external/sync-user-role` with `email`, `roleSlug`, `fullName`, `newUser: true`, and `supabaseUserId`. PHP-Auth will create the user if they don’t exist, or **assign them to your app’s org** if they already exist by email (no duplicate).

So **adding a user here (with invite or to a site) should get them into the PHP-Auth table** for your org/app. If sync fails (4xx/5xx), we log it but don’t show it in the UI; the local DB is still updated.

---

## Edge case: User in local table and in PHP-Auth but check-user returns exists: false

This happens when the user **exists in PHP-Auth by email** but is **not assigned to this application’s organization** (e.g. they were created/invited in PHP-Auth but never assigned to your app, or an earlier sync failed). The **check-user** endpoint returns `exists: false` because it only returns true when the user is in **your** org.

**Fix from website-cms:** When we **update** a user (change role or owner), we send **addToOrgIfMissing: true** on both assign and update. PHP-Auth then adds the user to your org and app with the given role (response `data.action` = `org_app_assigned`). So one add or edit (e.g. change role and save) will assign them to your org and they’ll be in sync. No need to re-add them; just edit and save.

---

## Why you might not see the change in PHP-Auth

Website-cms sends assign/update to `POST {AUTH_BASE_URL}/api/external/sync-user-role` (see [website-cms-sync-user-role-api.md](./website-cms-sync-user-role-api.md)). If you don’t see the change in PHP-Auth:

1. **The endpoint is not implemented or returns an error**  
   If PHP-Auth does not have `POST /api/external/sync-user-role` or returns 4xx/5xx, the central store is not updated. Website-cms logs a warning but does not surface it to the user; the local DB is still updated.

2. **What PHP-Auth provides**  
   The PHP-Auth team document [website-cms-sync-user-role-api.md](./website-cms-sync-user-role-api.md) describes the contract: body `{ email, roleSlug, fullName?, newUser?, supabaseUserId? }`, org/app from X-API-Key. Implement that endpoint and return 2xx on success.

5. **Audit**  
   The same API route pushes an audit event to PHP-Auth (`role_assigned`, `role_updated`, or `role_removed`) via `pushAuditLog(...)`.

---

## Role slug handling

- **UI and API request/response:** Use **PHP-Auth slugs** (e.g. `website-cms-admin`) from `GET /api/admin/roles?for=assignment`.
- **Local DB (`tenant_user_assignments.role_slug`):** Store **legacy** slugs (`admin`, `editor`, etc.) because of the FK to `admin_roles(slug)`. Convert with `phpAuthSlugToLegacySlug()` before writing and `legacySlugToPhpAuthSlug()` when reading for display or for sync.
- **PHP-Auth sync:** Always send **PHP-Auth slug** in `roleSlug` (or `null` for remove).

---

## Summary

- **Local:** All add/edit/remove flows write to `tenant_user_assignments` (and optionally `tenant_users` on add) using legacy `role_slug` where required.  
- **Central:** The same flows call `syncUserOrgRoleToPhpAuth(...)`, which POSTs to PHP-Auth’s `user-org-role` endpoint so PHP-Auth can update its SSOT.  
- **Bug fix (2026-02):** The API was sending PHP-Auth slugs into `assignUserToSite`, which writes to a column with an FK to `admin_roles(slug)`. That caused “Failed to update.” The fix is to pass `phpAuthSlugToLegacySlug(roleSlug)` into `assignUserToSite` and keep sending the PHP-Auth slug to `syncUserOrgRoleToPhpAuth`.
