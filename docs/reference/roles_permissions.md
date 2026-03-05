# Roles and Permissions (Feature Assignment)

This document describes how roles and their feature assignments are stored and modified in the **public** schema of the shared Supabase project. It is intended for rebuilding the role–feature modification experience in PHP-AUTH (or any parallel app that has access to the same database).

---

## Overview

- **Roles** are global: the same role (e.g. `editor`, `creator`) can be used on any tenant; its **feature set** is defined once and applies everywhere.
- **Effective features** for a user = **tenant features ∩ role features** (each tenant can enable/disable features; the role defines which of those the user is allowed to use).
- Role–feature assignment is stored in a junction table; the CMS does not store feature data on the role row itself.

---

## Tables (public schema)

### 1. `admin_roles`

Role definitions. One row per role.

| Column        | Type      | Notes |
|---------------|-----------|--------|
| `slug`        | TEXT      | Primary key. e.g. `admin`, `editor`, `creator`, `viewer`, or custom slugs. |
| `label`       | TEXT      | Display name. |
| `description` | TEXT      | Optional. |
| `is_system`   | BOOLEAN   | Default `true`. System roles cannot be deleted. |
| `created_at`  | TIMESTAMPTZ | |
| `updated_at`  | TIMESTAMPTZ | |

**System roles (cannot be deleted):** `admin`, `editor`, `creator`, `viewer`. Custom roles have `is_system = false`.

---

### 2. `feature_registry`

Master list of features (sidebar items, capabilities). One row per feature.

| Column         | Type      | Notes |
|----------------|-----------|--------|
| `id`           | UUID      | Primary key. |
| `slug`         | TEXT      | Unique. e.g. `dashboard`, `crm`, `content`, `settings`. |
| `label`        | TEXT      | Display name. |
| `description`  | TEXT      | Optional. |
| `parent_id`    | UUID      | Optional. FK to `feature_registry(id)`. For hierarchy (e.g. CRM → Contacts). |
| `group_slug`   | TEXT      | Optional. Grouping (e.g. `admin`, `crm`). |
| `display_order`| INTEGER   | Default 0. Order for UI. |
| `is_core`      | BOOLEAN   | Default false. |
| `is_enabled`   | BOOLEAN   | Default true. Only `is_enabled = true` features are shown for assignment. |
| `created_at`   | TIMESTAMPTZ | |
| `updated_at`   | TIMESTAMPTZ | |

**Special feature:** The feature with `slug = 'superadmin'` must **not** be assignable to roles. Exclude it from the role–feature UI and never write it into `role_features`.

---

### 3. `role_features`

Junction table: which features each role is allowed to use.

| Column       | Type      | Notes |
|--------------|-----------|--------|
| `role_slug`  | TEXT      | FK to `admin_roles(slug)` ON DELETE CASCADE. |
| `feature_id` | UUID      | FK to `feature_registry(id)` ON DELETE CASCADE. |
| `is_enabled` | BOOLEAN   | Default true. The CMS only reads rows with `is_enabled = true`. |
| `created_at` | TIMESTAMPTZ | |
| **Primary key** | (role_slug, feature_id) | |

Role features are global (no tenant/organization column).

---

## Operations for the "modify role features" page

### 1. List roles

`SELECT * FROM public.admin_roles ORDER BY slug`

### 2. List features (for the checklist)

`SELECT * FROM public.feature_registry WHERE is_enabled = true ORDER BY display_order, label`

- Exclude the row where `slug = 'superadmin'`.
- Optionally order by hierarchy (roots then children via `parent_id` and `display_order`).

### 3. Get current feature IDs for a role

`SELECT feature_id FROM public.role_features WHERE role_slug = $1 AND is_enabled = true`

### 4. Save role features (replace)

1. `DELETE FROM public.role_features WHERE role_slug = $1`
2. For each selected `feature_id` (excluding the superadmin feature):  
   `INSERT INTO public.role_features (role_slug, feature_id, is_enabled) VALUES ($1, $2, true)`

The CMS does a full replace: delete all for the role, then insert the new set.

---

## Business rules

1. **System roles** (`admin`, `editor`, `creator`, `viewer`): features can be changed; the role row must not be deletable.
2. **Custom roles:** can be created, updated, and deleted; `is_system = false`.
3. **Superadmin feature:** Never show or write `slug = 'superadmin'` in role–feature assignment.
4. **New role slugs:** lowercase, `[a-z0-9_]` only (e.g. `content_manager`).

---

## Optional: hierarchy (CMS behavior)

- Checking a **parent** feature: add parent + all children (by `parent_id`) to the role's set.
- Unchecking a **parent**: remove parent and all its children.
- Children can be toggled individually.

---

## Summary for PHP-AUTH

- **Read:** `admin_roles`, `feature_registry` (exclude `slug = 'superadmin'`), `role_features` for the selected role.
- **Write:** For a role, replace `role_features`: delete all rows for that `role_slug`, then insert one row per selected `feature_id` (never the superadmin feature).
- Same Supabase project and public schema; use a DB role that can read/write these tables (e.g. service role bypasses RLS).
