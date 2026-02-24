# PHP-Auth ↔ Website-CMS: Roles & Features Table Cross-Reference

**Purpose:** Map website-cms tables that manage roles and features to PHP-Auth's model so we can migrate cleanly. PHP-Auth defines **roles** as having both **permissions** (global to applications) and **features** (from `feature_registry`, scoped per application type). Website-cms will have its own set of features in PHP-Auth's feature_registry (scope `website-cms`).

**User scope:** Users in PHP-Auth are scoped to one or more organizations, one or more applications, and a role for those applications. It is **PHP-Auth's job** to look at the **calling app** (org id + application id from the API key) and the user (from the Bearer token) and return the auth context for *that* app — so this app and all tenant apps use the proper user scope for access.

---

## 1. PHP-Auth model (summary)

| Concept | Scope | Purpose |
|--------|--------|---------|
| **Permissions** | Global to applications | Coarse-grained capabilities (e.g. file save, access to PII). Same permission set can be used across apps. |
| **Features** | Per application **type** | Stored in `feature_registry` with **scope** (e.g. `website-cms`). Each app type has its own feature list. Scope is a string, not application instance id. |
| **Roles** | Central (PHP-Auth) | Roles have **scope** (application type), **permissions**, and **features** (from auth_role_features). User's role in an org determines their permissions + features for that org/app. |

So for website-cms:

- **Roles** and **user–org–role** assignments live in PHP-Auth (`auth_user_organizations` with role_id).
- **Features** for website-cms are rows in PHP-Auth's `feature_registry` with `scope = 'website-cms'`.
- **Permissions** (file save, PII, etc.) are global; website-cms can use them for guardrails; sidebar/routes are driven by **features** (scope website-cms).

---

## 2. Website-CMS (current) — tables we are migrating away from

All in **public** schema, Supabase.

| Table | Purpose | Key columns |
|------|---------|-------------|
| **admin_roles** | Global role definitions. | `slug` (PK): admin, editor, creator, viewer + custom; `label`, `description`, `is_system`. |
| **feature_registry** | Global list of features (sidebar items, capabilities). | `id` (UUID), `slug`, `label`, `description`, `parent_id`, `group_slug`, `display_order`, `is_core`, `is_enabled`. Special: `slug = 'superadmin'` not assignable to roles. |
| **role_features** | Which features each role can use (global). | `role_slug` → admin_roles, `feature_id` → feature_registry, `is_enabled`. |
| **tenant_features** | Which features are enabled per tenant (site). | `tenant_id` → tenant_sites, `feature_id` → feature_registry. Effective = tenant_features ∩ role_features. |
| **tenant_user_assignments** | User ↔ tenant site with role. | `admin_id` → tenant_users, `tenant_id` → tenant_sites, `role_slug` → admin_roles, `is_owner`. |
| **tenant_users** | Tenant user identity. | `id`, `user_id` (→ auth.users), `email`, `display_name`, `status`. |
| **tenant_sites** | Registry of tenant/site deployments. | `id`, `name`, `slug`, `schema_name`, `deployment_url`, etc. |

**Effective features (current):** `getEffectiveFeatureSlugs(tenantId, roleSlug)` = **tenant_features** ∩ **role_features** (by feature_id), then resolve to slugs. Used for sidebar and route guards.

**Role resolution (current):** Superadmin from `auth.users.user_metadata`; tenant admins from `tenant_user_assignments` + `tenant_users` (by auth user id) → `role_slug`.

---

## 3. PHP-Auth — tables that hold roles, permissions, and features

**Confirmed schema (from PHP-Auth team):**

| Concept | PHP-Auth table(s) | Purpose |
|---------|-------------------|---------|
| Users & org membership | `users` | Core user (linked to Supabase auth). |
| | `organizations` | Tenants. |
| | `auth_user_organizations` | User ↔ org with **role** (`user_id`, `organization_id`, `role_id`). One role per user per org. |
| Roles | **auth_roles** | Role definitions. Columns include `id`, `name`, `slug`, **`scope`** (application-type slug, e.g. `auth-hub`, `website-cms`), `is_system_role`, etc. Roles are scoped by **application type** (scope), not by application instance. So "Admin" for website-cms is one role with `scope = 'website-cms'`. |
| Permissions (global) | **permission_registry** | Global permission list (`id`, `slug`, `label`, `description`, `display_order`, `is_enabled`). No scope. |
| | **auth_role_permissions** | Role ↔ permission (`role_id`, `permission_id`, `is_enabled`). |
| Features (per application type) | **feature_registry** | Features scoped by **application type**. Columns include `id`, `slug`, `label`, **`scope`** (e.g. `website-cms`), `display_order`, `is_enabled`, …. Scope is a string (application-type), not `application_id`. Website-cms's features are all rows with `scope = 'website-cms'`. |
| | **auth_role_features** | Role ↔ feature (`role_id`, `feature_id`, `is_enabled`). |
| Applications | **auth_applications** | One row per deployed app (`id`, `organization_id`, `name`, **`application_type`** (e.g. `website-cms`), `api_key_prefix`, `api_key_hash`, …). `application_type` aligns with role scope and feature_registry scope. |

**Validate-user response (today):** Returns `data.organizations[]` with `roleName`, `permissions`, `coreAppAccess`. It does **not** currently return feature slugs or IDs for the application. For M0/M2, website-cms maps `roleName` → slug and uses existing `getEffectiveFeatureSlugs(tenantSiteId, roleSlug)` from local data.

---

## 4. Cross-reference: Website-CMS → PHP-Auth (migration target)

| Website-CMS (current) | PHP-Auth (target) | Notes |
|-----------------------|-------------------|--------|
| **admin_roles** | **auth_roles** | Role definitions. Use `scope = 'website-cms'` for CMS roles. Align slug/name (Admin, Editor, Creator, Viewer). Super-Admin is a role in auth_roles (e.g. scope `auth-hub`, `is_system_role = true`). |
| **feature_registry** | **feature_registry** (`scope = 'website-cms'`) | Website-cms's features are rows with `scope = 'website-cms'`. Migrate slugs/labels (dashboard, crm, content, settings, superadmin, etc.). No per-application-instance list; scope is application-type. |
| **role_features** | **auth_role_features** | Role ↔ feature for roles with scope `website-cms`. Recreate the same assignments (Admin, Editor, etc. → feature IDs from feature_registry where scope = website-cms). |
| **tenant_features** | *(none)* | PHP-Auth has **no** equivalent. Effective features = role's features (auth_role_features for that role's scope). For M0/M2 assume all role features are enabled for the org; per-tenant toggles could be added in PHP-Auth later. |
| **tenant_user_assignments** | **auth_user_organizations** | User ↔ org with role_id. One org per website-cms deployment (AUTH_ORG_ID). Role comes from here (roleName in validate-user). |
| **tenant_users** | **users** (PHP-Auth) | Identity; link via Supabase user id (`supabase_user_id`). |
| **tenant_sites** | **organizations** (+ **auth_applications**) | Tenant site ↔ organization. App instance = auth_applications row with that org and `application_type = 'website-cms'`. |

**Permissions:** PHP-Auth adds a separate layer (permission_registry + auth_role_permissions) that website-cms doesn't have today. Use for things like "file save", "access PII"; they're additive.

---

## 5. Effective features after migration (M4)

- **Today (website-cms):** effective = tenant_features ∩ role_features; role from tenant_user_assignments or user_metadata.
- **After M4 (PHP-Auth only):**
  - **Role** from validate-user → `data.organizations[]` where `id === AUTH_ORG_ID` → `roleName`.
  - **Features** for that role: PHP-Auth has no tenant-level feature toggles today, so effective = that role's features (from auth_role_features for the role's scope `website-cms`). If validate-user later returns feature slugs/IDs for the app, use those directly; otherwise website-cms may need an API or cached mapping of role → feature slugs for scope `website-cms`.
  - **Tenant/org-level toggles:** Not present in PHP-Auth; all role features are effectively enabled for the org. PHP-Auth could add an org-level or app-level feature-flag table later.

---

## 6. Confirmed (from PHP-Auth team)

- **Table names and scope:** auth_roles, permission_registry, auth_role_permissions, feature_registry (scope = application-type string), auth_role_features, auth_applications (application_type), auth_user_organizations (user_id, organization_id, role_id). Scope is **application type** (e.g. `website-cms`), not application instance.
- **Tenant/org-level feature toggles:** PHP-Auth has none. Effective = role's features; for M0/M2 assume all role features enabled for the org.
- **Validate-user:** Does not return feature slugs/IDs; website-cms uses roleName → slug + local getEffectiveFeatureSlugs for M0/M2.
- **Role slugs:** Website-cms uses and references the **PHP-Auth slug** only (no separate "internal" slug). PHP-Auth is SSOT. Official slugs: website-cms-superadmin, website-cms-admin, website-cms-editor, website-cms-creator, website-cms-gpum (and website-cms-viewer if added). See php-auth-integration-clarification.md §4.
- **Superadmin (two distinct roles in PHP-Auth):**
  - **Super-Admin (auth-hub scope):** For the PHP-Auth app only. Does **not** grant website-cms access.
  - **Application-scoped (scope website-cms):** Website-CMS-SuperAdmin / website-cms-superadmin → our `superadmin`. Only that role is used for full access to this app.

---

## 7. Summary

| Area | Website-CMS (current) | PHP-Auth (target) |
|------|------------------------|-------------------|
| **Roles** | `admin_roles` (slug, label) | **auth_roles** (name, slug, scope e.g. `website-cms`). |
| **Permissions** | (none) | **permission_registry** + **auth_role_permissions** (global). |
| **Features** | `feature_registry` (global) + `role_features` | **feature_registry** (`scope = 'website-cms'`) + **auth_role_features**. |
| **Per-tenant feature toggles** | `tenant_features` | None; effective = role's features. |
| **User–tenant–role** | `tenant_user_assignments` + `tenant_users` | **auth_user_organizations** (user_id, organization_id, role_id). |
