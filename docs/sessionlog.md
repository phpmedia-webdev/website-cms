# Session Log

**Purpose:** Active, focused session continuity. Not a living document — kept lean.

**Workflow:**
- **Session start:** Developer announces "start of work session." Open `sessionlog.md`; use **Next up** and **Context** to pick up where you left off.
- **Session end:** Developer announces "end of work session."
  1. Check off any completed `sessionlog` items.
  2. Sync those completions to `planlog.md` (check off corresponding items).
  3. **Delete** those items from `sessionlog.md` to keep it lean.
  4. Add **session context** (what was done, even if incomplete) to `changelog.md` — "Context for Next Session" in the new entry.
- **Abrupt stop:** Same as session end. Update sessionlog, sync planlog, prune sessionlog, add changelog context so the next session can continue.

---

## Current Focus

**MVP: Tenant roles, feature scope, team, and profile.** Execute the build plan below: Superadmin Dashboard (tabbed), Users (scoped), Profile under Settings; sites + related users tables; no Integrations UI (header scripts in Code Snippets + manual variable per site).

---

## Superadmin final layout

- **Superadmin** (main sidebar link; opens Dashboard).
- **Sub-item: Dashboard** — Tabbed full-page view:
  1. **Tenants** — Master table of web apps (sites table). Add/edit sites. Click row → detail: site info + related users and roles (editable). Single source of truth for schema; to fully use a site, log into that site.
  2. **Roles** — Global roles and role→feature mapping.
  3. **Code Snippets** — Global code snippet library. Header scripts (GA, VisitorTracking, Simple Commenter, etc.) live here for dev copy/paste; variable (e.g. ID) set manually per site in code or env. No Integrations tab.
- **Sub-item: Users** — Scoped to current site. Table to add admins and team for this site; assign role. User-editable profile is under **Settings** (not Superadmin).
- **Profile** — One per user (same name, email, avatar on every site). Under **Settings** (e.g. Settings → Profile) for all site users.

---

## Build plan (order of work)

**Principles:** Roles = Admin, Editor, Creator, Viewer. Effective features = tenant features ∩ role features. Only superadmin can assign Admin role; tenant admin can add team with Editor/Creator/Viewer only. Non-admin role feature set ⊆ Admin role feature set.

### Done
- [x] **Feature registry + role feature set:** Migrations 081, 083. `feature_registry`, `admin_roles`, `role_features`; types + `feature-registry.ts`; Roles UI at `/admin/super/roles`.
- [x] **Tenant registry + tenant feature set:** Migrations 082, 084. `client_tenants`, `tenant_features`; types + `client-tenants.ts`; `getEffectiveFeatures(tenantId, roleSlug)`; Clients list, Add client, client detail with Features tab.
- [x] **Quick wins (session wrap):** Migration 085 added (`client_admins`, `client_admin_tenants`) — run in SQL Editor when ready. Integrations removed from Superadmin sidebar and dashboard (header scripts remain in Code Snippets).

### Next (in order)

1. **client_admins + client_admin_tenants (user-tenant-role)**
   - [x] Migration file 085 created (run in SQL Editor when ready). Tables: `public.client_admins`, `public.client_admin_tenants`.
   - [ ] Types + lib: CRUD for admins, assign/remove user to tenant with role; list users per tenant.
   - [ ] Auth/session: resolve current user's role from `client_admin_tenants` for current tenant (for sidebar and route guards).

2. **Superadmin Dashboard (tabbed) + sidebar**
   - [ ] Refactor `/admin/super` into tabbed Dashboard: **Tenants** | **Roles** | **Code Snippets**. Tenants tab = current Clients list/table; Roles tab = current Roles page content; Code Snippets = placeholder or existing snippets UI.
   - [x] Sidebar: Remove Integrations from Superadmin (done). Still to add: sub-item "Users" → `/admin/super/users`.

3. **Superadmin Users page + Related users on tenant detail**
   - [ ] `/admin/super/users`: list admins/team for **current site**; add user, assign role (superadmin can set Admin; others Editor/Creator/Viewer).
   - [ ] Client (tenant) detail: "Related users" section — list users for that tenant, add/remove, set role (same rules). Reuse same tables and APIs.

4. **Page headers + effective features**
   - [ ] Superadmin pages: show "Managing: [current site name]" (or "Superadmin" when no site context).
   - [ ] Sidebar + route guards: use `getEffectiveFeatures(tenant_id, user.role)` so team cannot see more than their role allows.

5. **Profile page (all site users)**
   - [ ] **Settings → Profile** (`/admin/settings/profile`): one profile per user (name, email, avatar, etc.); editable by self. Available to anyone with Settings access (or dedicated Profile link). Superadmin and client team both use this (no separate super profile page).

6. **Tenant admin: Settings → Team**
   - [ ] `/admin/settings/team`: list team, add member (email, display name, role = Editor | Creator | Viewer only). Only role=Admin can add; cannot assign Admin.

### Other / Deferred
- [ ] Phase 12 full component library; Phase 11, 10, dynamic Page (deferred).
- [ ] Client startup script (creates schema, assigns superadmin) — separate from this plan.

---

## Context for handoff

- (See changelog "Context for Next Session" for latest.)
