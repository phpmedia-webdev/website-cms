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

**Shape (website-cms compatible, with features and permissions for role assignment and feature management):**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "uuid-of-role",
        "name": "Admin",
        "slug": "admin",
        "label": "Admin",
        "features": [
          { "slug": "website-cms-dashboard", "label": "Dashboard", "parentSlug": null, "isEnabled": true },
          { "slug": "website-cms-content", "label": "Content", "parentSlug": null, "isEnabled": true },
          { "slug": "website-cms-content-pages", "label": "Pages", "parentSlug": "website-cms-content", "isEnabled": true }
        ],
        "permissions": [
          { "slug": "content-publish", "label": "Publish content", "parentSlug": null, "isEnabled": true },
          { "slug": "content-delete", "label": "Delete content", "parentSlug": "content-publish", "isEnabled": true }
        ]
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
| `features` | array | Features assigned to this role. Each item: `slug`, `label`, `parentSlug` (parent feature slug or `null` for top-level; use to build hierarchy), `isEnabled`. Use for role assignment and feature management (e.g. sidebar, route guards). |
| `permissions` | array | Permissions assigned to this role. Each item: `slug`, `label`, `parentSlug` (parent permission slug or `null` for top-level; use to build hierarchy), `isEnabled`. |

**Features and permissions hierarchy:** Both `features` and `permissions` are flat arrays. Each item includes **`parentSlug`**: the slug of the parent feature or permission, or `null` for top-level. This matches the **Feature Registry** and **Permission Registry** in PHP-Auth, where items can have a `parent_id` for hierarchy. Callers can build a tree (e.g. for UI) by grouping children under the parent slug.

**Exact payload for parser alignment:** Top-level keys are `success` and `data`; `data` has one key, `roles` (array). First role object keys, in order: `id`, `name`, `slug`, `label`, `features`, `permissions`. Each **feature** has `slug`, `label`, `parentSlug` (string or null), `isEnabled`. Each **permission** has `slug`, `label`, `parentSlug` (string or null), `isEnabled`. Example of one full role from the response (copy as-is for parser tests):

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Admin",
        "slug": "admin",
        "label": "Admin",
        "features": [
          { "slug": "website-cms-dashboard", "label": "Dashboard", "parentSlug": null, "isEnabled": true },
          { "slug": "website-cms-content", "label": "Content", "parentSlug": null, "isEnabled": true },
          { "slug": "website-cms-content-pages", "label": "Pages", "parentSlug": "website-cms-content", "isEnabled": true }
        ],
        "permissions": [
          { "slug": "content-publish", "label": "Publish content", "parentSlug": null, "isEnabled": true },
          { "slug": "content-delete", "label": "Delete content", "parentSlug": "content-publish", "isEnabled": true }
        ]
      }
    ]
  }
}
```

You can rely on `slug` for mapping to your existing role slugs and use `features`/`permissions` when assigning a role to a user and when managing which features and permissions that user has. Use `parentSlug` on each feature and permission to build a hierarchy (e.g. tree UI) if needed.

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

- **Path:** Use **`/api/external/roles`** as the default. Full URL: `{AUTH_BASE_URL}/api/external/roles`.
- **Scope when sending:** If you send a `scope` query parameter, it must be a **valid role scope** (one of the scope values that exist in the PHP-Auth Roles table), e.g. **`website-cms`** (not `web_app`). Same for `AUTH_ROLES_SCOPE` if you use it to build the URL. Valid scopes are data-driven from the Roles table.
- **When to call:** For example when building role dropdowns, role-to-feature mapping, or any UI that needs the list of roles for the current app. Can be cached (e.g. by scope) and refreshed periodically or on deploy.
- **Same credentials:** Use the same `AUTH_BASE_URL`, `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, and `AUTH_API_KEY` you use for validate-user and audit-log. No user session or Bearer token is required.
- **Response shape:** `{ "success": true, "data": { "roles": [ { "id", "name", "slug", "label", "features", "permissions" }, ... ] } }`. Each role includes `features` and `permissions` (arrays of `{ slug, label, parentSlug, isEnabled }`) for assignment, feature management, and hierarchical display in role detail.

**Verifying the API and debugging display mismatches**

- **Compare curl vs app:** Call the endpoint with the same URL and key the app uses and check that each role has distinct feature/permission counts, e.g. `curl -s -H "X-API-Key: YOUR_WEBSITE_CMS_API_KEY" "https://auth.phpmedia.com/api/external/roles?scope=website-cms"`. In the JSON, each object in `data.roles` should have only that role’s assignments (Admin vs Creator vs Super Admin should differ).
- **If display is stale:** Set **`AUTH_ROLES_NOCACHE=1`** so the app appends `&_t=<timestamp>` to the roles request and no HTTP cache can return stale data.

---

## 8. How to call from the website (website-cms)

1. **In PHP-Auth (one-time):** Add roles (Admin, Editor, Creator, etc.) and set each role’s **scope** to the application-type identifier you will use for external callers (e.g. **`website-cms`**). That scope value is what this endpoint uses — valid scopes are read from the Roles table, not hardcoded. Optionally set the Application’s type to `website-cms` so it matches; if you leave it as `web_app`, the endpoint still accepts it when roles with scope `website-cms` exist (legacy fallback).
2. **From website-cms:** Call **GET** `{AUTH_BASE_URL}/api/external/roles` with header **X-API-Key:** `{AUTH_API_KEY}`. No query parameter needed.
3. **Optional:** To pass scope explicitly, use **GET** `{AUTH_BASE_URL}/api/external/roles?scope=website-cms` with the same header. The value must be one of the scopes that exist in the Roles table (e.g. `website-cms`).

**Example (no scope):**

```http
GET https://auth.phpmedia.com/api/external/roles
X-API-Key: your-application-api-key
```

**Example (with scope):**

```http
GET https://auth.phpmedia.com/api/external/roles?scope=website-cms
X-API-Key: your-application-api-key
```

## 9. How the endpoint works (PHP-Auth side)

The endpoint is **data-driven**: it loads the distinct **scope** values from the **auth_roles** table and uses those as the set of valid application-type identifiers. When you add a role and set its scope, that scope becomes available for this API. There is no hardcoded list of scopes; the “proper” calling behavior is derived from the Roles table. Application type (from the API key) must match one of those role scopes, or the legacy `web_app` → `website-cms` fallback applies when roles with scope `website-cms` exist.

## 10. Summary table

| Item | Value |
|------|--------|
| **Path** | `GET /api/external/roles` |
| **Auth** | `X-API-Key` (required) |
| **Query** | `scope` (optional; must be a valid role scope from the Roles table) |
| **Valid scopes** | From **auth_roles.scope** (distinct values) |
| **Response** | `{ "success": true, "data": { "roles": [ { "id", "name", "slug", "label", "features", "permissions" }, ... ] } }` |
| **Framework** | Express (PHP-Auth server) |

If you need another path or an additional response shape, we can add an alias or document it here.
