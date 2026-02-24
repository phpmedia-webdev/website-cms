# M3 recovery procedure (lockout prevention)

**Purpose:** If you lose access to the website-cms admin (e.g. PHP-Auth is down, or your user/role is missing or wrong in PHP-Auth), use one of these paths to recover. Keep this until M4 is stable and central-only read is verified.

**When this applies:** During and after M3 (writes to central). Role resolution uses **dual-read**: we try PHP-Auth validate-user first, then **fallback** to `user_metadata` (superadmin) or `tenant_user_assignments` (tenant admins). Lockout can happen if (1) PHP-Auth returns 4xx/5xx and (2) fallback data is missing or wrong.

---

## Option A: Fix the user in PHP-Auth (preferred)

1. In **PHP-Auth** (UI or DB): ensure your user exists in `users` with the correct `supabase_user_id` (same as `auth.users.id` in Supabase).
2. Ensure you have an **auth_user_organizations** row for the **organization** that maps to this website-cms tenant (`AUTH_ORG_ID`), with the correct **role** (e.g. Website-CMS-Admin or website-cms-superadmin for full access).
3. If PHP-Auth was down, restore it and retry; website-cms will call validate-user again and use the central role.

---

## Option B: Temporary fallback via Supabase (superadmin only)

If you cannot use PHP-Auth immediately (e.g. outage, or you need to unblock quickly):

1. In **Supabase Dashboard** → Authentication → Users, open your user.
2. Edit **User Metadata** (raw JSON). Ensure:
   - `type`: `"superadmin"`
   - `role`: `"superadmin"`
3. Save. The next request in website-cms will hit the **fallback** in `getRoleForCurrentUser()` (see `src/lib/auth/resolve-role.ts`): if PHP-Auth fails or is not configured, we use `user_metadata.type` and `user_metadata.role` for superadmin and grant access.
4. After PHP-Auth is fixed, restore your user/org/role in PHP-Auth and optionally remove or correct metadata in Supabase so central is the source again.

---

## Option C: Temporary fallback via tenant_user_assignments (tenant admin)

If you are a **tenant admin** (not superadmin) and you’re locked out because your assignment or role is missing in PHP-Auth:

1. In **Supabase** (SQL or a backend that can write to the public schema): ensure there is a row in **tenant_user_assignments** for your `tenant_user` (admin_id) and the **tenant_site** (tenant_id) for this deployment, with the desired `role_slug` (e.g. `admin` or `website-cms-admin`).
2. The dual-read fallback uses `getRoleForUserOnSite` and `legacySlugToPhpAuthSlug`, so the next request will resolve your role from the DB and grant access.
3. After PHP-Auth is fixed, add or correct your user–org–role in PHP-Auth so future requests use central; optionally sync or leave the assignment row for redundancy during transition.

---

## Summary

| Situation                         | Action                                                                 |
|----------------------------------|-------------------------------------------------------------------------|
| PHP-Auth down or misconfigured   | Use Option B (superadmin) or C (tenant admin) to restore access; fix PHP-Auth. |
| User missing in PHP-Auth        | Add user in PHP-Auth (Option A).                                       |
| Wrong org/role in PHP-Auth      | Fix auth_user_organizations in PHP-Auth (Option A).                    |
| Need immediate unblock          | Use Option B or C, then fix central (Option A) when possible.          |

**After M4 (central-only read):** Fallback will be removed. Recovery will be **only Option A** (fix user/role in PHP-Auth). Keep this doc and the PHP-Auth recovery path (e.g. secret recovery mode in PHP-Auth) documented.
