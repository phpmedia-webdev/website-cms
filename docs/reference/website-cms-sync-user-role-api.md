# PHP-Auth Sync User/Role API — For website-cms Dev Team

**Audience:** website-cms (and other calling apps) that need to **push user/role changes** back to PHP-Auth so central auth stays in sync when a user or role is updated in the CMS.

---

## 1. Overview

When website-cms changes a user’s role (or display name), or **creates a new user**, it should call this endpoint so PHP-Auth stays in sync. PHP-Auth is the source of truth for **which user has which role** for your application.

- **Auth:** Your application’s **X-API-Key** (same key used for validate-user).
- **Existing user:** Send **email**, **roleSlug**, and optionally **fullName**. PHP-Auth finds the user, checks they belong to your application’s organization, then assigns or updates their role for your app.
- **New user:** If the user does not exist in PHP-Auth yet, send **newUser: true** plus **email**, **roleSlug**, **fullName** (required for new users), and optionally **supabaseUserId**. PHP-Auth will create the user, add them to your application’s organization and application with the given role. Send **supabaseUserId** if the tenant already created the user in Supabase so the user can log in via validate-user later.

---

## 2. Endpoint

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path** | `/api/external/sync-user-role` |
| **Local** | `http://localhost:5000/api/external/sync-user-role` |
| **Live example** | `https://auth.phpmedia.com/api/external/sync-user-role` |

**Headers (required):**

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-API-Key` | Your application’s API key (same as for validate-user). |

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | **Yes** | User’s email address. Used to find the user, or as the new user’s email when `newUser` is true. |
| `roleSlug` | string | **Yes** | Role slug for this application (e.g. `website-cms-editor`, `website-cms-admin`). Must be a valid role in PHP-Auth for your app’s scope (see “Role slugs” below). |
| `fullName` | string | **Yes if newUser** | Display name. For existing users: optional (updates name if sent). For new users (`newUser: true`): **required**. |
| `newUser` | boolean | No | Set to **true** when the user does **not** exist in PHP-Auth and you want PHP-Auth to create them. When true and user is missing, PHP-Auth creates the user, adds them to your app’s organization and application with the given role. Requires `fullName`. |
| `supabaseUserId` | string | No | **Recommended for new users.** The Supabase Auth user id (e.g. from sign-up) so PHP-Auth can link the user. If provided, the user can later log in and use validate-user; if omitted, they must be linked (e.g. by an admin) before they can authenticate. |
| `addToOrgIfMissing` | boolean | No | Set to **true** when the user **exists** in PHP-Auth but has **no** organization or application assignment (e.g. they were only added/invited). PHP-Auth will add them to your application's organization and application with the given role. Optional: include `fullName` and/or `supabaseUserId` to update display name or link Supabase. If not set and user is not in your org, PHP-Auth returns **403** and suggests sending `addToOrgIfMissing: true`. |

---

## 3. Request format

**Existing user — role sync only:**

```json
{
  "email": "editor@example.com",
  "roleSlug": "website-cms-editor"
}
```

**Existing user — with display name update:**

```json
{
  "email": "editor@example.com",
  "roleSlug": "website-cms-admin",
  "fullName": "Jane Editor"
}
```

**New user (tenant created the user; sync to PHP-Auth):**

Set **newUser: true** and include **fullName** (required). Optionally include **supabaseUserId** if you already created the user in Supabase so they can log in via validate-user.

```json
{
  "email": "newuser@example.com",
  "roleSlug": "website-cms-editor",
  "fullName": "New User",
  "newUser": true,
  "supabaseUserId": "uuid-from-supabase-auth"
}
```

**Example (curl) — existing user:**

```bash
curl -s -X POST "https://auth.phpmedia.com/api/external/sync-user-role" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY" \
  -d '{"email":"editor@example.com","roleSlug":"website-cms-editor","fullName":"Jane Editor"}'
```

**Example (curl) — new user:**

```bash
curl -s -X POST "https://auth.phpmedia.com/api/external/sync-user-role" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY" \
  -d '{"email":"newuser@example.com","roleSlug":"website-cms-editor","fullName":"New User","newUser":true,"supabaseUserId":"YOUR_SUPABASE_USER_UUID"}'
```

**Existing user in PHP-Auth but not in your org (no org/app assignment):**

Send **addToOrgIfMissing: true** so PHP-Auth adds them to your org and app with the given role. Optional: `fullName`, `supabaseUserId`.

```json
{
  "email": "user@example.com",
  "roleSlug": "website-cms-editor",
  "addToOrgIfMissing": true,
  "fullName": "Display Name"
}
```

**Example (curl) — existing user not in org:**

```bash
curl -s -X POST "https://auth.phpmedia.com/api/external/sync-user-role" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY" \
  -d '{"email":"user@example.com","roleSlug":"website-cms-editor","addToOrgIfMissing":true,"fullName":"Display Name"}'
```

**Result:** PHP-Auth adds the user to your application's organization and application with the given role. Response `data.action` will be `org_app_assigned` and the message will be "User added to organization and application with role".

---

## 4. What PHP-Auth needs to update correctly

| Information | Existing user | New user (`newUser: true`) |
|-------------|----------------|----------------------------|
| **email** | Find the user. | New user’s email. |
| **roleSlug** | Role for this app (must exist in your app’s scope). | Same; user is created and assigned this role for your app and org. |
| **fullName** | Optional; updates display name if sent. | **Required.** Used as the new user’s display name. |
| **newUser** | Omit or false. | **true** — tells PHP-Auth to create the user if not found. |
| **supabaseUserId** | Not used. | **Recommended.** Supabase Auth user id so PHP-Auth can link the user; they can then log in and use validate-user. If omitted, the user can be linked later (e.g. by an admin). |
| **Application / org** | From **X-API-Key**. | Same; new user is added to your app’s organization and application. |

**Role slugs:** Get the list of valid slugs for your app from:

`GET /api/external/roles?scope=website-cms`  
(with the same `X-API-Key`). Use the `slug` field of each role in the response (e.g. `website-cms-editor`, `website-cms-superadmin`).

---

## 5. Success response

**Existing user (200):**

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "editor@example.com", "fullName": "Jane Editor", "isActive": true },
    "role": { "id": "role-uuid", "name": "Editor", "slug": "website-cms-editor" },
    "action": "role_updated",
    "fullNameUpdated": true
  },
  "message": "User role synced successfully"
}
```

**New user created (201):**

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "newuser@example.com", "fullName": "New User", "isActive": true },
    "role": { "id": "role-uuid", "name": "Editor", "slug": "website-cms-editor" },
    "action": "user_created",
    "fullNameUpdated": false
  },
  "message": "User created and assigned to application"
}
```

**User in PHP-Auth but not in your org — added to org/app (200, with addToOrgIfMissing: true):**

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "fullName": "Display Name", "isActive": true },
    "role": { "id": "role-uuid", "name": "Editor", "slug": "website-cms-editor" },
    "action": "org_app_assigned"
  },
  "message": "User added to organization and application with role"
}
```

| Field | Description |
|-------|-------------|
| `data.user` | User record (updated or newly created). |
| `data.role` | The role that was set (id, name, slug). |
| `data.action` | **`user_created`** — user was created and assigned to your app and org. **`role_assigned`** — existing user was assigned to this app for the first time. **`role_updated`** — existing user’s role for this app was updated. **`org_app_assigned`** — user existed but had no org/app; they were added to your org and app with the given role (when `addToOrgIfMissing: true`). |
| `data.fullNameUpdated` | `true` if you sent `fullName` and it was updated (existing user only). |

---

## 6. Error responses

| Status | Meaning |
|--------|---------|
| **400** | Missing or invalid body: `email` or `roleSlug` missing; **role not found** for the slug in your app’s scope; or **fullName missing when newUser is true**. Message will suggest using `GET /api/external/roles?scope=...` for valid slugs, or that fullName is required for new user creation. |
| **401** | Invalid or missing **X-API-Key** (or app inactive). |
| **403** | **User not in your app’s organization**, or **user inactive**. When the user exists in PHP-Auth but is not in your org, the response suggests sending **addToOrgIfMissing: true** to add them to your org and app in one request. |
| **404** | **User not found** (no user in PHP-Auth with that email). When `newUser` is not true, the response body will say: *“User not found. Send newUser: true and fullName (and optionally supabaseUserId) to create the user.”* Also **Application not found**. |
| **500** | Server error; PHP-Auth logs will have details. |

---

## 7. When to call this endpoint

Call **sync-user-role** whenever website-cms:

- **Creates a new user** — Call with **newUser: true**, **email**, **roleSlug**, **fullName**, and optionally **supabaseUserId** (if you created them in Supabase). PHP-Auth will create the user and assign them to your app and org.
- **Changes a user’s role** (e.g. Editor → Admin) — Call with email, roleSlug, and optionally fullName.
- **Changes a user’s display name** — Include fullName in the payload so PHP-Auth stays in sync.
- **User in PHP-Auth table but no org/app/role** — Call with **addToOrgIfMissing: true**, **email**, **roleSlug**, and optionally fullName and supabaseUserId. PHP-Auth will add them to your org and app with the given role (response `data.action` = `org_app_assigned`).

Call it **after** you have persisted the change in your own DB (and, for new users, after creating them in Supabase if you use Supabase). If the call fails, retry or surface an error (e.g. add user to org in PHP-Auth, fix role slug, or for 404 use newUser: true if you intended to create).

---

## 8. Checklist for implementation

1. **Environment:** Use the same **AUTH_BASE_URL** and **AUTH_API_KEY** as for validate-user.
2. **Existing user (role or name change):** Send `email`, `roleSlug`, and optionally `fullName`. Send **addToOrgIfMissing: true** so users who exist but have no org/app get added to your org.
3. **New user:** Send `email`, `roleSlug`, `fullName`, **`newUser: true`**, and optionally `supabaseUserId` (recommended so they can log in via validate-user). Also send **addToOrgIfMissing: true** so that if the user already exists in PHP-Auth but has no org, they get added.
4. **User in table but no org/app:** Send `email`, `roleSlug`, **addToOrgIfMissing: true**, and optionally `fullName`, `supabaseUserId`. PHP-Auth adds them to your org and app with the given role.
5. **Role slugs:** Use slugs from `GET /api/external/roles?scope=website-cms` (or your app’s scope). Do not hardcode.
6. **Errors:** Handle 400 (e.g. fullName required for new user), 403 (user not in org or inactive; response may suggest addToOrgIfMissing: true), and 404. For 404, if you intended to create the user, send the same request again with `newUser: true` and `fullName`.
7. **Idempotency:** Same email + roleSlug is safe; PHP-Auth returns `role_updated` or `role_assigned`. For new user, sending the same payload twice with `newUser: true` would create a duplicate if the first call succeeded; call once after creating the user in your system.

---

## 9. Related endpoints / Check if a user is in the PHP-Auth user list (for testing)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/external/validate-user` | Validate a logged-in user and get role, permissions, features (see [website-cms-validate-user-api.md](website-cms-validate-user-api.md)). |
| `GET /api/external/roles?scope=website-cms` | List valid role slugs for your app. |
| `POST /api/external/validate-api-key` | Check that your API key is valid. |
| `GET /api/external/check-user?email=<email>` | Check if a user with that email exists and is in the **calling application’s organization**. See below. |

### 9.1 Check-user (is this user in the PHP-Auth user list?)

**Endpoint:** `GET /api/external/check-user?email=<email>`  
**Auth:** `X-API-Key` (same as sync-user-role).  
**Query:** `email` (required). It’s normalized to lowercase.

**Behavior:**

- If a user with that email **exists** and is in the **calling application’s organization** → **200** with `exists: true` and minimal user info.
- If the user **doesn’t exist**, or exists but is in **another org** → **200** with `exists: false` (no indication that they exist elsewhere).
- **400** if `email` is missing.

**Response format:**

- **User in your org:**  
  `{ "success": true, "data": { "exists": true, "user": { "id": "...", "email": "...", "fullName": "...", "isActive": true } } }`
- **Not in list (or in another org):**  
  `{ "success": true, "data": { "exists": false } }`

**Example:**

```bash
curl -s "https://auth.phpmedia.com/api/external/check-user?email=user@example.com" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY"
```

**Website-cms:** The auth-test page calls this via `GET /api/admin/php-auth-user-lookup?email=...`. Default path is `api/external/check-user`. If your PHP-Auth server uses a different path, set **AUTH_CHECK_USER_PATH** in env (e.g. `api/v1/check-user`).

---

## 10. GPU → GPUM: Public user signs up and becomes a member

When a **public user (GPU)** signs up on the tenant app and becomes a **member (GPUM)** using Supabase Auth, the tenant app should register them in PHP-Auth so they are linked to the correct **org, app, and role (GPUM)**. PHP-Auth does **not** read your database; you send everything in one API call.

### Do not add API key or application ID to Supabase Auth

- **Do not** put the PHP-Auth API key or application ID in the Supabase Auth flow (e.g. in sign-up payload, user metadata, or client).
- The **application is identified by the API key** when your **server** calls PHP-Auth. Your tenant app backend already has `AUTH_API_KEY` and `AUTH_APPLICATION_ID` in env; use the same key in the `X-API-Key` header when calling `sync-user-role`. That is enough for PHP-Auth to know org and app.

### Recommended flow (Supabase Auth + PHP-Auth)

1. **User signs up** in your app (Supabase Auth). You get back the Supabase user (e.g. `user.id`, `user.email`, and optionally `user.user_metadata.full_name` or a display name from your form).
2. **Your server** (not the client) calls **`POST /api/external/sync-user-role`** with:
   - **Headers:** `X-API-Key: <your AUTH_API_KEY>` (server-side only).
   - **Body:** `email`, `roleSlug` (GPUM — see below), `fullName`, `newUser: true`, and **`supabaseUserId`** = the Supabase user id from step 1.
3. PHP-Auth creates the user (if needed), links them via `supabase_user_id`, and assigns them to **your application’s organization and application** with the **GPUM** role. No need to send org or app id; they come from the API key.

### What PHP-Auth needs to link the new user (all in the sync call)

| You send in the body | PHP-Auth uses it for |
|----------------------|----------------------|
| **email** | New user’s email (and to avoid duplicates). |
| **fullName** | Display name (required for new user). |
| **roleSlug** | Role for this app — use the **GPUM** role slug (e.g. `gpum` or whatever is configured for your app’s scope in PHP-Auth). |
| **newUser: true** | Tells PHP-Auth to create the user and assign to org/app/role. |
| **supabaseUserId** | Links PHP-Auth user to Supabase Auth so later logins (Bearer token) work with validate-user. **Important:** send the Supabase user id from the sign-up response so the member can log in. |

**Org and app:** Inferred from **X-API-Key** (the key is for one application, which belongs to one organization). PHP-Auth does not need application ID or org ID in the body.

### GPUM role slug

- PHP-Auth must have a role that represents **GPUM** (General Purpose User Member) for your application’s scope (e.g. `website-cms`). The slug might be `gpum` or similar.
- **Get the exact slug** from: `GET /api/external/roles?scope=website-cms` (with your `X-API-Key`). Use the `slug` of the role you use for members (e.g. the one named “GPUM” or “General Purpose User Member”).
- Use that slug as **roleSlug** in the sync-user-role call when converting a new sign-up to a member.

### Summary

- **No** API key or application ID in the Supabase Auth process; keep them on the server.
- **Yes:** After Supabase sign-up, have your **server** call sync-user-role with **email**, **fullName**, **roleSlug** (GPUM slug from roles API), **newUser: true**, and **supabaseUserId** (from Supabase). PHP-Auth will create the user and link them to the correct org, app, and GPUM role.

---

## 11. Edge cases (admin, superadmin, direct signup)

This section covers edge cases for the three ways users can be added: **admin/superadmin** (in PHP-Auth or tenant app), **direct signup** (GPU → GPUM on tenant app), and mixed flows.

### How users can be added

| Source | Flow | Sync-user-role? |
|--------|------|------------------|
| **PHP-Auth invite** | Superadmin/admin invites by email; user accepts invite (Supabase Auth + PHP-Auth user created, assigned to org). App assignment can be done in PHP-Auth (User Edit → Role Assignments). | Optional: tenant can call sync-user-role later to add app role or link Supabase if needed. |
| **PHP-Auth User Edit** | Admin assigns existing user to org/app/role (no new user creation). | No. |
| **Tenant app – direct signup** | User signs up on tenant (Supabase); tenant server calls sync-user-role with **newUser: true**, email, fullName, roleSlug (e.g. GPUM), supabaseUserId. | **Yes.** Creates user in PHP-Auth and assigns to org/app/role. |
| **Tenant app – admin adds user** | Tenant admin creates a user (e.g. in Supabase and/or tenant DB). Tenant server calls sync-user-role with **newUser: true**, email, fullName, roleSlug (e.g. editor/admin), supabaseUserId (if Supabase user was created). | **Yes.** Same as above; use the appropriate roleSlug (not necessarily GPUM). |

### Edge cases and behavior

| Edge case | Behavior |
|-----------|----------|
| **User already exists in PHP-Auth; tenant sends newUser: true** | PHP-Auth finds the user by email and does **not** create a duplicate. It continues with the existing-user path: checks org, assigns or updates app role, optionally updates fullName. Safe to send newUser: true when unsure. |
| **Existing user in PHP-Auth but no Supabase link yet** | User was created via invite or another path and has no `supabase_user_id`. If the tenant sends **supabaseUserId** in the sync call (with or without newUser: true), PHP-Auth **links** the account: it sets `supabase_user_id` on the existing user so that validate-user (Bearer token) will resolve correctly. Response includes `supabaseUserIdLinked: true` when this happens. |
| **Duplicate sync call (same email, newUser: true, twice)** | First call creates user and returns 201. Second call finds user by email, treats as existing user, assigns/updates role. No duplicate user. Idempotent. |
| **User exists but in a different organization** | PHP-Auth returns **403** “User does not belong to this application's organization”. The user is in another org; they must be assigned to this app’s org in PHP-Auth (e.g. by admin) before sync can assign them to this app. |
| **User exists but is inactive** | PHP-Auth returns **403** “User is inactive”. Reactivate the user in PHP-Auth before syncing. |
| **New user without fullName** | If **newUser: true** and **fullName** is missing or empty, PHP-Auth returns **400** “fullName is required when newUser is true”. Tenant should collect a display name or send a default (e.g. email local part or “Member”). |
| **New user without supabaseUserId** | Allowed. User is created and assigned to org/app/role but has no Supabase link. They cannot use validate-user (Bearer token) until linked. Tenant can call sync again later with the same email and **supabaseUserId** (no newUser needed); PHP-Auth will link the existing user. |
| **Email case sensitivity** | Lookup is by email as sent. To avoid duplicate users (e.g. User@example.com vs user@example.com), normalize email to lowercase (or match PHP-Auth’s convention) before calling. |
| **Role slug wrong or not in scope** | PHP-Auth returns **400** with a message that includes the app scope and suggests `GET /api/external/roles?scope=...` for valid slugs. Use the roles API to get the correct GPUM (or other) slug. |
| **Tenant admin adds user without creating in Supabase first** | Tenant can call sync-user-role with newUser: true, email, fullName, roleSlug, and **omit** supabaseUserId. User is created in PHP-Auth and assigned. When the user later signs up in Supabase (or is created there), tenant can call sync again with the same email and **supabaseUserId**; PHP-Auth will link the existing user (no newUser needed). |

### Summary table: what to send

| Scenario | newUser | email | fullName | roleSlug | supabaseUserId |
|----------|---------|--------|----------|----------|----------------|
| Direct signup (GPU → GPUM) | true | ✓ | ✓ | GPUM slug | ✓ (from Supabase) |
| Tenant admin adds member (with Supabase) | true | ✓ | ✓ | GPUM slug | ✓ |
| Tenant admin adds editor/admin (with Supabase) | true | ✓ | ✓ | editor/admin slug | ✓ |
| Tenant admin adds user (no Supabase yet) | true | ✓ | ✓ | any | omit |
| Later: link Supabase to existing user | omit | ✓ | omit or ✓ | any | ✓ |
| Role or name change (existing user) | omit | ✓ | optional | ✓ | omit |
