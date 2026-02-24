# PHP-Auth: Roles, Features, and Permissions (M5)

**Purpose:** Single reference for the PHP-Auth model and API contract used by website-cms for M5 (superadmin redesign, SSOT). For table-level mapping see [php-auth-website-cms-tables-cross-reference.md](./php-auth-website-cms-tables-cross-reference.md).

---

## 1. PHP-Auth model (M5)

PHP-Auth manages auth for **multiple organizations and applications**. Website-cms is an **application type** with many instances/forks (one per tenant). Roles and features are scoped by **application type** (e.g. `website-cms`), not by application instance.

### 1.1 feature_registry

- **Scope:** Per **application type** via a `scope` field (e.g. `scope = 'website-cms'`).
- **Sort:** Use the **order** field for sort order (e.g. for the tenant feature gating list in website-cms).
- **Purpose:** List of features this application type can have. Website-cms filters by `scope = 'website-cms'` to get the feature set for this app. This filtered set is used to build the feature gating table in the website-cms superadmin section.

### 1.2 permission_registry

- **Scope:** **Global** — can apply to any role in any application.
- **Purpose:** Options like: Delete file, upload files, bulk delete, publish/unpublish, invite users, etc. They are like feature options but apply across applications. Not limited to a single app type.

### 1.3 Roles (auth_roles)

- **Created only in PHP-Auth.** Website-cms does **not** create or edit roles; it only consumes them.
- A role is built by:
  1. Choosing a **scope** of features from `feature_registry` (e.g. `website-cms`),
  2. Selecting a **subset of those features** (via auth_role_features),
  3. Selecting **permissions** from `permission_registry` (via auth_role_permissions),
  4. Assigning a **name**, **slug**, and **label** (display) to the role.
- **Label:** Short display name shown in the application (e.g. "Admin"). The **slug** (e.g. `website-cms-admin`) is used for identity; the **label** is what website-cms shows in the UI.
- **Example:** Role "Website-CMS-Admin" with slug `website-cms-admin` and label "Admin" — website-cms shows "Admin" in role pickers and uses `website-cms-admin` for API/DB.

### 1.4 Website-cms usage

- **Display:** Use role **label** from PHP-Auth in the UI (e.g. role picker, user list).
- **Identity:** Use role **slug** everywhere in code and when calling PHP-Auth or storing assignments.
- **Role list:** Fetched from PHP-Auth (scope `website-cms`); no role creation in website-cms. Superadmin "Roles" page is read-only (list roles and their assigned permissions and features).

---

## 2. Required PHP-Auth API contract (M5)

Website-cms needs the following endpoints from PHP-Auth. Implement in PHP-Auth and call from website-cms with `X-API-Key` (application API key). Base URL: `AUTH_BASE_URL`.

### 2.1 List roles for application type

**Purpose:** Role picker in Superadmin → Users and Settings → Users; read-only Roles page.

**Detailed API reference:** See [php-auth-external-roles-api.md](./php-auth-external-roles-api.md) for the full endpoint spec (path, headers, query, response shape, errors). The endpoint is implemented in PHP-Auth (Express). Website-cms calls `GET {AUTH_BASE_URL}/api/external/roles?scope=website-cms` with `X-API-Key`; response is `{ "success": true, "data": { "roles": [ { "id", "name", "slug", "label" }, ... ] } }`. If PHP-Auth used a different path, set **AUTH_ROLES_PATH** in website-cms.

| Item | Value |
|------|--------|
| **Method / path** | `GET /api/external/roles` (default). Override with env **AUTH_ROLES_PATH** (e.g. `api/v1/roles`) if PHP-Auth uses a different path. |
| **Query** | `scope=website-cms` (or infer from API key’s application type) |
| **Headers** | `X-API-Key: <AUTH_API_KEY>`, `Content-Type: application/json` |
| **Response (200)** | `{ "success": true, "data": { "roles": [ { "id": "uuid", "name": "Website-CMS-Admin", "slug": "website-cms-admin", "label": "Admin" }, ... ] } }` |
| **Notes** | Only roles for the calling app’s type (website-cms). Exclude GPUM from admin assignment picker if desired, or filter in website-cms. |

### 2.2 List feature_registry by scope

**Purpose:** Tenant feature gating table (list of toggleable features); sort by **order**.

| Item | Value |
|------|--------|
| **Method / path** | `GET /api/external/feature-registry` (or equivalent) |
| **Query** | `scope=website-cms` |
| **Headers** | `X-API-Key: <AUTH_API_KEY>`, `Content-Type: application/json` |
| **Response (200)** | `{ "success": true, "data": { "features": [ { "id": "uuid", "slug": "crm", "label": "CRM", "scope": "website-cms", "order": 10, "is_enabled": true }, ... ] } }` |
| **Notes** | Sort by `order` ascending for display. Used for gating table in Superadmin Dashboard (Gating tab). |

### 2.3 List role–feature and role–permission assignments (read-only Roles page)

**Purpose:** Superadmin read-only "Roles" page: show each role’s assigned features and permissions.

| Item | Value |
|------|--------|
| **Method / path** | `GET /api/external/roles/:roleId/assignments` or `GET /api/external/roles?scope=website-cms&include=features,permissions` (or equivalent) |
| **Headers** | `X-API-Key: <AUTH_API_KEY>`, `Content-Type: application/json` |
| **Response (200)** | Roles list with per-role `features[]` and `permissions[]` (ids and/or slugs/labels). Shape to be defined in PHP-Auth; website-cms consumes for read-only display. |
| **Notes** | Optional for first iteration; read-only Roles page can show just role list first, then add features/permissions when this API exists. |

---

## 3. Summary

| Concept | PHP-Auth | Website-cms |
|--------|----------|-------------|
| **Roles** | Created and stored in PHP-Auth (auth_roles). Scoped by application type (e.g. `website-cms`). | Read-only list from API; use **slug** for identity, **label** for display. No role creation. |
| **Features** | feature_registry with **scope** and **order**. | Fetch by scope `website-cms`; use **order** for gating table sort. |
| **Permissions** | permission_registry (global) + auth_role_permissions. | Shown on read-only Roles page when API provides them. |
| **Role picker** | GET roles (scope=website-cms). | Superadmin Users, Settings → Users: dropdown from API; fallback to fixed list if API unavailable. |
