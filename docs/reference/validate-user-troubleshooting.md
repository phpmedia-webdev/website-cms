# Validate-User Troubleshooting (PHP-Auth)

**Audience:** PHP-Auth operators and integrators (e.g. website-cms) when login says the user “couldn’t be verified” by central auth.

**Endpoint:** `POST /api/external/validate-user`  
**Live example:** `https://auth.phpmedia.com/api/external/validate-user`

---

## 1. What PHP-Auth does on validate-user

The route uses **multi-tier auth**: both **X-API-Key** (application) and **Authorization: Bearer &lt;accessToken&gt;** (user) are required.

1. **API key** → Look up application; reject if missing, invalid, or app inactive (401).
2. **Bearer token** → Verify with Supabase; reject if missing, invalid, or expired (401).
3. **User in DB** → Load user by Supabase id; reject if not found or inactive (401).
4. **Org access** → User must belong to the **application’s organization** (same org as the app). If not → **403** “Access denied: User does not have access to this application”.
5. **Success** → Return `{ success: true, data: { user, application, organizations, sessionId, message } }`.  
   Each item in `data.organizations` includes `id`, `roleName`, `roleSlug`, and org fields. The **calling app** uses `AUTH_ORG_ID` to pick the org that matches this deployment and then uses that org’s `roleName` / `roleSlug`.

So “couldn’t be verified” from the caller’s perspective usually means either:

- PHP-Auth returned **401/403** (auth/access failure), or  
- PHP-Auth returned **200** but the caller found **no org** in `data.organizations` whose `id === AUTH_ORG_ID` (config or data mismatch).

---

## 2. Checklist on PHP-Auth and env (live: auth.phpmedia.com)

Use this when a user cannot log in and the caller says validation failed.

### In PHP-Auth (database and app)

| Check | What to verify |
|-------|----------------|
| **User exists** | User exists in `users` and is linked to the same Supabase user (e.g. `supabase_user_id` = Supabase auth user id). |
| **User active** | `users.is_active` is true (inactive users get 401). |
| **User in the right org** | User has a row in `auth_user_organizations` for the **same organization** that the **application** belongs to. That org id must equal the caller’s `AUTH_ORG_ID`. |
| **Role on that org** | For that org, the user has a **role** (e.g. website-cms-admin, website-cms-superadmin). `getUserOrganizations` joins `auth_roles` and returns `roleName`, `roleSlug` per org. |
| **Application** | The application used by the caller (its UUID = caller’s `AUTH_APPLICATION_ID`) is under that same org and has `application_type` (e.g. `website-cms`) and is active. |
| **API key** | The caller’s `AUTH_API_KEY` is the API key for **that** application. If the key is for a different app or org, validation will fail or return the wrong org set. |

### On the caller (e.g. website-cms) env

For the **live** PHP-Auth at `https://auth.phpmedia.com`:

| Variable | Must be |
|----------|--------|
| `AUTH_BASE_URL` | `https://auth.phpmedia.com` |
| `AUTH_ORG_ID` | The **organization’s UUID** that this deployment belongs to (and that the PHP-Auth application belongs to). |
| `AUTH_APPLICATION_ID` | The **application’s UUID** (the app under that org in PHP-Auth). |
| `AUTH_API_KEY` | The API key for that application (from PHP-Auth Applications → that app). |

If any of these are from a different environment (e.g. local vs live), or the user is in a different org than `AUTH_ORG_ID`, the caller will not get a valid org/role and will show “couldn’t be verified”.

---

## 3. Typical causes of “couldn’t be verified”

- **User not in the org that matches `AUTH_ORG_ID`** (e.g. user in Org B, but caller’s `AUTH_ORG_ID` is Org A).
- **User in the org but no role** (no row in `auth_user_organizations` for that org, or role missing/invalid) — then `organizations` may be empty or missing that org.
- **`AUTH_ORG_ID` or `AUTH_APPLICATION_ID`** from a different org/app (e.g. local vs live).
- **Wrong or inactive API key** → PHP-Auth returns 401.
- **Invalid or expired Bearer token** → PHP-Auth returns 401.
- **User not in PHP-Auth or inactive** → PHP-Auth returns 401.
- **User not member of application’s organization** → PHP-Auth returns **403** (step “permission_intersection” in audit log).

---

## 4. What the caller can do to see the raw result

The calling app (e.g. website-cms) can call its own **php-auth-status** endpoint (e.g. `https://your-website-cms-url/api/admin/php-auth-status`) while signed in. That endpoint calls validate-user with the current session and returns the raw result, e.g.:

- `validateUser: { success: true, orgMatch: true, role: "website-cms-superadmin" }` → config and PHP-Auth are aligned; issue may be in middleware/session on the caller.
- `validateUser: { success: false, reason: "..." }` or no org/role → issue is likely PHP-Auth or env (org id, application id, API key, or user/org/role in PHP-Auth).

If that URL returns 403 (e.g. no superadmin metadata), debug from PHP-Auth and env using this doc.

---

## 5. Testing validate-user directly (curl)

From a machine that can reach PHP-Auth:

```bash
# Replace with real values from PHP-Auth (Applications → app → API key) and a valid Supabase access token
curl -s -X POST "https://auth.phpmedia.com/api/external/validate-user" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"
```

- **401** → Check API key (valid? for the right app? app active?) or Bearer token (valid? not expired? same Supabase project?).
- **403** → User is not a member of the application’s organization; fix user–org–role in PHP-Auth and ensure application’s org = `AUTH_ORG_ID`.
- **200** → Check `data.organizations` for an org with `id === AUTH_ORG_ID` and that it has `roleName` / `roleSlug`. If that org is missing, env or data is wrong (user in different org, or `AUTH_ORG_ID` wrong).

---

## 6. PHP-Auth audit logs

On failure, PHP-Auth logs `multi_tier_auth_failed` with a `metadata.step`:

| step | Meaning |
|------|--------|
| `api_key_validation` | Missing or invalid/inactive API key. |
| `user_token_validation` | Missing or invalid/expired Bearer token. |
| `user_validation` | User not in DB or user inactive. |
| `permission_intersection` | User is not a member of the application’s organization (403). |

Use these to see exactly where validation failed on the PHP-Auth side.

---

## 7. Summary

- **Validate-user** requires **API key + Bearer token**; then checks user exists, is active, and is in the **application’s organization**, and returns that user’s orgs with **roleName** and **roleSlug**.
- Caller needs **AUTH_BASE_URL**, **AUTH_ORG_ID**, **AUTH_APPLICATION_ID**, and **AUTH_API_KEY** set correctly for the **live** app at https://auth.phpmedia.com.
- Ensure in PHP-Auth: user exists, is active, is in the same org as the application (and as `AUTH_ORG_ID`), and has a role so `data.organizations` contains that org with `roleName`/`roleSlug`. Then use php-auth-status (or curl) and audit logs to confirm.
