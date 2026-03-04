# PHP-Auth: External Feature Registry API (for website-cms gating table)

**Purpose:** This document describes the **GET /api/external/feature-registry** endpoint. Website-cms calls it to build the superadmin Site Settings → Gating table. The API derives scope from the caller’s **API key** and returns only features for that application; no scope query parameter. This is consistent for future users.

---

## 1. Endpoint summary

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path** | `/api/external/feature-registry` |
| **Auth** | `X-API-Key` header (required). |
| **Query** | None. Scope is derived from the API key. |
| **Server behavior** | Resolves the application/scope from the API key and returns only features for that scope; other scopes are excluded. |

**Usage (website-cms):** `GET {AUTH_BASE_URL}/api/external/feature-registry` with header `X-API-Key: <key>`. The response includes only features for the application associated with that key (e.g. website-cms).

---

## 2. Query parameters

None. Scope is derived from the API key on the server.

---

## 3. Response (200 OK)

**Shape:**

```json
{
  "success": true,
  "data": {
    "features": [
      {
        "id": "uuid",
        "slug": "crm",
        "label": "CRM",
        "scope": "website-cms",
        "order": 10,
        "display_order": 10,
        "is_enabled": true
      }
    ]
  }
}
```

| Field (per feature) | Type | Description |
|---------------------|------|-------------|
| `id` | string (UUID) | Feature id. Used to match `parentId` for hierarchy. |
| `parentId` | string (UUID) or null | Parent feature id, or null for top-level. Child when `child.parentId === parent.id`. |
| `slug` | string | Required. Stable identifier (e.g. `crm`, `content`). |
| `label` | string | Display name (e.g. "CRM", "Content"). |
| `scope` | string | Optional. Application-type scope (e.g. `website-cms`) in the response. |
| `order` or `display_order` | number | Sort order; ascending for display. |
| `is_enabled` | boolean | Optional; default true. |

The client builds parent/child structure from the flat list using `parentId` → `id` (and optionally `groupSlug`). No `parentSlug` is returned; resolve parent slug from the same list if needed.

---

## 4. Implementation (PHP-Auth)

- **Scope from API key:** The handler derives the application/scope from the API key and returns only features for that scope. No scope query parameter; consistent for all callers.
- Website-cms calls with only the API key and receives only features for its application (e.g. website-cms).

---

## 5. How website-cms calls it

- **Request:** `GET {AUTH_BASE_URL}/api/external/feature-registry` with header `X-API-Key: <key>`.
- **Response:** Only features for the application associated with that key. Used for the Site Settings → Gating tab (list of toggles).
