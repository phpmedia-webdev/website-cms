# PHP-Auth: External Roles API (for website-cms and other tenant apps)

**Purpose:** This document describes the **GET /api/external/roles** endpoint so the website-cms (or other tenant) dev team can integrate it. Use it to retrieve the list of roles scoped for the calling application (e.g. `website-cms`).

---

## 1. Endpoint summary

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path** | `/api/external/roles` |
| **Auth** | `X-API-Key` header (required) — same API key as validate-user and audit-log. |
| **Query** | **`scope`** (optional). If omitted, PHP-Auth uses the application type from the API key. If set, must match the Application type in PHP-Auth (e.g. `website-cms`); otherwise 403. |
| **Response** | JSON: `{ "success": true, "data": { "roles": [ ... ] } }` |

**Base URL:** Same as your existing PHP-Auth base (e.g. `AUTH_BASE_URL`). Full URL example: `{AUTH_BASE_URL}/api/external/roles`.

---

## 2. Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | **Yes** | Your application API key (from PHP-Auth, created with the Application). Same value as used for validate-user and audit-log. |
| `Content-Type` | No | Optional `application/json`; no request body for GET. |

No Bearer token or user session is required — this is **application-only** auth (API key).

---

## 3. Query parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `scope` | No | Application-type scope used to filter roles (e.g. `website-cms`). **If omitted:** PHP-Auth uses the **application’s own `applicationType`** (from the API key), so you automatically get roles for your app. **If provided:** It must match the application’s type; otherwise the API returns **403** (so a caller cannot request roles for another app’s scope). |

**Recommendation for website-cms:** Omit `scope` and let PHP-Auth derive it from the API key. If you prefer to pass it explicitly (e.g. for caching or logging), use the same value as your application type in PHP-Auth (e.g. `scope=website-cms`).

---

## 4. Response (200 OK)

**Shape (website-cms compatible):**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "uuid-of-role",
        "name": "Admin",
        "slug": "admin",
        "label": "Admin"
      },
      {
        "id": "uuid-of-role-2",
        "name": "Editor",
        "slug": "editor",
        "label": "Editor"
      }
    ]
  }
}
```

| Field (per role) | Type | Description |
|------------------|------|-------------|
| `id` | string (UUID) | PHP-Auth role id (e.g. for future APIs or display). |
| `name` | string | Internal/administrative name (e.g. "Admin", "Editor"). |
| `slug` | string | Stable identifier for APIs and tenant app logic (e.g. `admin`, `editor`). |
| `label` | string | User-facing display name (e.g. "Admin", "Editor"); falls back to `name` if not set. |

You can rely on `slug` for mapping to your existing role slugs (e.g. admin, editor, creator, viewer, superadmin) and use `label` for UI.

---

## 5. Error responses

| Status | Condition | Body (example) |
|--------|-----------|------------------|
| **401** | Missing or invalid `X-API-Key` | `{ "success": false, "error": "X-API-Key header required" }` or `"Invalid API key"` |
| **403** | Application inactive, or `scope` query does not match the application’s type | `{ "success": false, "error": "Application is inactive" }` or `"Scope does not match this application; omit scope or use the application's type"` |
| **404** | Application not found (internal consistency) | `{ "success": false, "error": "Application not found" }` |
| **500** | Server error while loading roles | `{ "success": false, "error": "Failed to fetch roles" }` |

---

## 6. Example requests

**Minimal (recommended):** No query; scope is derived from the API key.

```http
GET /api/external/roles HTTP/1.1
Host: your-php-auth-host
X-API-Key: your-application-api-key
```

**With explicit scope (optional):**

```http
GET /api/external/roles?scope=website-cms HTTP/1.1
Host: your-php-auth-host
X-API-Key: your-application-api-key
```

**cURL:**

```bash
curl -X GET "{AUTH_BASE_URL}/api/external/roles" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY"
```

---

## 7. Integration notes for website-cms

- **Path:** Use **`/api/external/roles`** as the default. No need to set `AUTH_ROLES_PATH` unless you later point to a different PHP-Auth path. Full URL: `{AUTH_BASE_URL}/api/external/roles`.
- **When to call:** For example when building role dropdowns, role-to-feature mapping, or any UI that needs the list of roles for the current app. Can be cached (e.g. by scope) and refreshed periodically or on deploy.
- **Same credentials:** Use the same `AUTH_BASE_URL`, `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, and `AUTH_API_KEY` you use for validate-user and audit-log. No user session or Bearer token is required.
- **Response shape:** Matches the first option you support: `{ "success": true, "data": { "roles": [ { "id", "name", "slug", "label" }, ... ] } }`. You can parse `data.roles` and map `slug` (and optionally `label`) into your existing role handling.

### 7.1 How website-cms calls (checklist)

1. **In PHP-Auth (one-time):** Set the Application’s **Application type** to **`website-cms`**. Ensure roles (Admin, Editor, Creator, etc.) exist with **scope** `website-cms` on the Roles page.
2. **From website-cms:** Call **GET** `{AUTH_BASE_URL}/api/external/roles` with header **X-API-Key:** `{AUTH_API_KEY}`. No query parameter (scope is derived from the application type).
3. **Optional:** To pass scope explicitly, set **AUTH_ROLES_SCOPE=website-cms** in `.env.local`; we then send `?scope=website-cms`. The scope name must be exactly **`website-cms`** (not `web_app` or any other value); it must match the Application type in PHP-Auth.

---

## 8. Summary table

| Item | Value |
|------|--------|
| **Path** | `GET /api/external/roles` |
| **Auth** | `X-API-Key` (required) |
| **Query** | `scope` (optional; omit to use API key’s application type) |
| **Response** | `{ "success": true, "data": { "roles": [ { "id", "name", "slug", "label" }, ... ] } }` |
| **Framework** | Express (PHP-Auth server) |

If you need another path or an additional response shape, we can add an alias or document it here.
