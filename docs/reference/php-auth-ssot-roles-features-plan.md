# Plan: PHP-Auth as SSOT for Role Permissions and Features (Gating)

**Purpose:** Make PHP-Auth the single source of truth for (1) role definitions and (2) **which permissions and features each role has**. Both **features** and **permissions** are included in the roles API payload response; we implement both. Gating in website-cms still uses the local `role_features` table; this plan describes how to switch to PHP-Auth for features (and to use permissions from the same payload).

**Related:** [php-auth-roles-features-permissions.md](./php-auth-roles-features-permissions.md) (model and API contract), [php-auth-external-roles-api.md](./php-auth-external-roles-api.md) (roles list endpoint — full response shape with features/permissions).

---

## 1. PHP-Auth roles API upgrade (implemented)

The external roles API has been upgraded so each role includes **features** and **permissions** in the payload. Same call as before; response shape extended. We implement both: features for gating (sidebar, route guards), permissions for permission-based checks (e.g. "can invite", "can delete").

**Call:** `GET {AUTH_BASE_URL}/api/external/roles?scope=website-cms` with header `X-API-Key`.

**Response (200):** `{ "success": true, "data": { "roles": [ ... ] } }` where each role has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | PHP-Auth role id. |
| `name` | string | Internal/administrative name. |
| `slug` | string | Stable identifier (e.g. `website-cms-admin`). |
| `label` | string | User-facing display name. |
| **`features`** | array | Feature assignments for this role. Each item: `{ slug, label, parentSlug, isEnabled }`. From feature registry + auth_role_features. Deleted features are skipped. |
| **`permissions`** | array | Permission assignments for this role. Each item: `{ slug, label, parentSlug, isEnabled }`. From permission registry + auth_role_permissions. Deleted permissions are skipped. |

**PHP-Auth side (summary):** After loading roles by scope, the handler loads role–feature and role–permission assignments, batch-loads feature and permission details by ID (e.g. `getFeaturesByIds`, `getPermissionsByIds`), and returns each role with `features` and `permissions` arrays. Assignments whose feature or permission was deleted are skipped (no null entries).

**Reference:** Full endpoint description and examples in [php-auth-external-roles-api.md](./php-auth-external-roles-api.md). Use role `features[].slug` (and optionally filter by `isEnabled`) for gating; use role `permissions[].slug` for permission checks — both are part of the API payload and our implementation.

---

## 2. Current state (website-cms)

| Concern | Source today | Used for |
|--------|----------------|----------|
| **List of roles** (for assignment dropdowns) | PHP-Auth `GET /api/external/roles?scope=website-cms` | Superadmin Users, Settings → Users role picker |
| **Current user's role** | PHP-Auth validate-user (or fallback: tenant_user_assignments + metadata) | resolve-role.ts → role slug |
| **Which features a role has** | **Website-cms DB:** `role_features` (role_slug → feature_id) + `feature_registry` (id → slug) | **Gating:** `getEffectiveFeatureSlugs(tenantId, role)` → sidebar, route guards, View As |
| **Which features this tenant has enabled** | Website-cms DB: `tenant_feature_slugs` / `tenant_features` | Effective = tenant features ∩ role features |
| **Feature registry (list for gating table)** | Website-cms `feature_registry` or PHP-Auth `getFeatureRegistryFromPhpAuth()` (if API exists) | Superadmin Gating tab: toggles per tenant |

**Gating formula today:** `effective features = tenant-enabled features ∩ role-allowed features`. Role-allowed features come from **local** `role_features`; we will switch to **PHP-Auth** (roles API now returns `features` per role).

---

## 3. Goal: PHP-Auth SSOT for role → features (and permissions)

- **Roles:** Already from PHP-Auth (list + user's role via validate-user). No change.
- **Role → features:** Must come from PHP-Auth (not from website-cms `role_features`). Used for:
  - `getEffectiveFeatureSlugs(tenantId, roleSlug)` → sidebar visibility, route guards, View As.
- **Role → permissions:** Implemented in the API payload (`role.permissions`). We use these for permission-based checks (e.g. "can delete", "can invite") in API routes and UI when needed.
- **Tenant-enabled features:** Stay in website-cms (`tenant_feature_slugs`). We only change where **role → feature slugs** are read from.

---

## 4. What PHP-Auth provides (implemented)

**Option A is implemented.** The roles API now returns features and permissions per role.

- **Endpoint:** `GET /api/external/roles?scope=website-cms` (unchanged).
- **Per role:** `id`, `name`, `slug`, `label`, **`features`**, **`permissions`**.
- **`features`:** `[{ slug, label, parentSlug, isEnabled }, ...]` from feature registry and auth_role_features. Deleted features are skipped. **parentSlug** (string or null) is used by website-cms to build a tree for the role detail view.
- **`permissions`:** `[{ slug, label, parentSlug, isEnabled }, ...]` from permission registry and auth_role_permissions. Deleted permissions are skipped.

Website-cms uses **both**: `role.features` for gating (e.g. extract `slug` for each item, optionally filter by `isEnabled`) and `role.permissions` for permission-based checks. The API payload includes both arrays per role; one call supplies role list + role→features + role→permissions; cache in website-cms.

---

## 5. Website-cms code changes (phased)

### Phase 1: PHP-Auth exposes role → features (and permissions) — ✅ Done

- **PHP-Auth:** Roles API returns `features` and `permissions` per role (see §1 and [php-auth-external-roles-api.md](./php-auth-external-roles-api.md)). Storage: `getFeaturesByIds`, `getPermissionsByIds`; handler loads role–feature and role–permission assignments, batch-loads details, returns each role with `features` and `permissions` arrays. Deleted assignments skipped.
- **Website-cms:** Optional: verify response in php-auth-status or when loading roles; parse and log `features`/`permissions` to confirm shape.

### Phase 2: Resolve "role → feature slugs" from PHP-Auth

- **New (or extended) helper:** e.g. `getRoleFeatureSlugsFromPhpAuth(roleSlug: string): Promise<string[]>` in `src/lib/php-auth/` that:
  - Calls (or reads from cache) `GET /api/external/roles?scope=website-cms`, finds the role with `slug === roleSlug`, and returns `role.features.map(f => f.slug)` (optionally only where `f.isEnabled === true`).
  - Cache the roles response (in-memory or short TTL) so repeated gating checks do not hit the API every time.
- **Change `getEffectiveFeatureSlugs` (feature-registry.ts):** When PHP-Auth is configured, call `getRoleFeatureSlugsFromPhpAuth(roleSlug)` instead of `listRoleFeatureSlugs(roleSlug)`; fallback to `listRoleFeatureSlugs(roleSlug)` if PHP-Auth unavailable or request fails (dual-read during transition).
- **Call sites:** No change; `getEffectiveFeatureSlugs(tenantId, role)` and `getEffectiveFeatureSlugsForCurrentUser()` will use PHP-Auth once the helper is wired.

### Phase 3: Central-only read (optional); deprecate local role_features for gating

- Remove fallback to `listRoleFeatureSlugs` so role→features are only from PHP-Auth when configured.
- Document that `role_features` is not SSOT for gating; PHP-Auth is.

### Phase 4: Permissions (included in API payload; implement in website-cms)

- **Permissions are included in the roles API response** (`role.permissions`: `[{ slug, label, isEnabled }, ...]`). We implement permission resolution alongside features.
- Use `role.permissions` from the same roles API response (or cached roles) to get "current user's permission slugs" (resolve user's role, then that role's permissions).
- Use in API routes or UI for "can invite", "can delete", etc., when needed.

---

## 6. Summary table

| Item | Today | After plan |
|------|--------|------------|
| Role list (dropdown) | PHP-Auth roles API | Unchanged |
| User's role | validate-user / fallback | Unchanged |
| **Role → feature slugs** | website-cms `role_features` + `feature_registry` | **PHP-Auth** (roles API: role.features[].slug) |
| Tenant-enabled features | website-cms `tenant_feature_slugs` | Unchanged |
| Effective features (gating) | tenant ∩ **local** role features | tenant ∩ **PHP-Auth** role features |
| **Role → permission slugs** | Not used | **PHP-Auth** (roles API: role.permissions[].slug in payload); implement helpers in website-cms for permission checks |

---

## 7. Hierarchical features/permissions (roles API — implemented)

**Context:** In website-cms, sidebar navigation has nested pages (top-level items with sub-items). Features and permissions are grouped to match this layout. The roles API provides **parentSlug** (string or null) on each feature and permission so we can build a tree.

**Implemented:**

1. **API payload:** The roles API returns `features` and `permissions` with **parentSlug** on each item (parent feature/permission slug, or null for top-level).
2. **Website-cms:** We parse the payload in `fetch-roles.ts` (types include `parentSlug`; `buildFeatureOrPermissionTree()` builds a tree from the flat list), and the Superadmin role detail view displays Permissions and Features tabs with **sort order and hierarchy** (plain text, top-level bold/larger, sub-levels indented and progressively smaller; up to 3 levels). Read-only; no toggles — assignment stays in PHP-Auth.
3. **Code:** `PhpAuthFeatureOrPermissionItem` (parentSlug), `buildFeatureOrPermissionTree()`, `RoleDetailView` with `RoleTreeList`; detail page builds trees and passes them to the view. See [php-auth-external-roles-api.md](./php-auth-external-roles-api.md) for the API shape.

---

## 8. Checklist (for planlog / implementation)

- [x] **PHP-Auth:** Roles API returns **features and permissions** per role in the payload (Option A implemented). Document: [php-auth-external-roles-api.md](./php-auth-external-roles-api.md).
- [ ] **Website-cms:** Add `getRoleFeatureSlugsFromPhpAuth(roleSlug)` (and caching if needed).
- [ ] **Website-cms:** In `getEffectiveFeatureSlugs`, use PHP-Auth for role feature slugs when configured; keep fallback to `listRoleFeatureSlugs` during transition.
- [ ] **Website-cms:** (Optional) Remove fallback once PHP-Auth is verified in production (central-only).
- [x] **Docs:** [php-auth-external-roles-api.md](./php-auth-external-roles-api.md) updated with features and permissions in the response shape.
- [ ] **Website-cms:** Implement permission resolution from `role.permissions` (same payload as features) for permission-based checks when needed.
- [ ] **Deprecation:** Document that `role_features` is not SSOT for gating; PHP-Auth is.
- [x] **Hierarchical features/permissions:** API provides **parentSlug**; website-cms parses it, builds tree (`buildFeatureOrPermissionTree`), renders roles Permissions/Features in role detail with hierarchy (read-only). See §7.
