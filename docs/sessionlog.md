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

**MVP: Tenant roles, feature scope, team, and profile.** Superadmin creates roles and assigns features; superadmin assigns first admin and any user to any role/tenant; tenant admin adds team (Editor, Creator, Viewer only) under Settings → Team. Feature scope enforced so team never has more than Admin. All site users (superadmin, admin, client team) have a profile page to manage their details: superadmin profile under Superadmin as a sub-item; other admins and team under Settings menu.

---

## Next Up — Plan: Roles, features, tenant admins, team

**Principles:** Roles = Admin, Editor, Creator, Viewer. Effective features = tenant features ∩ role features. Only superadmin can assign Admin role; tenant admin can add team with Editor/Creator/Viewer only. Non-admin role feature set ⊆ Admin role feature set.

1. **Feature registry + role feature set (public schema)**
   - [ ] Feature registry (table or code): Content, Galleries, Media, CRM, Forms, Settings, etc.
   - [ ] `role_features` (role_slug, feature_id): Superadmin sets which features each role has. Validate: Editor/Creator/Viewer ⊆ Admin.
   - [ ] Migration + seed or code list for roles (admin, editor, creator, viewer).

2. **Tenant feature set**
   - [ ] Schema: tenant_features (tenant_id, feature_id) or column on client_tenants. Superadmin toggles which features this tenant’s site has.
   - [ ] API + helper `getEffectiveFeatures(tenantId, role)` = tenant ∩ role. Use for sidebar and route guards.

3. **Phase 03: client_tenants, client_admins, client_admin_tenants (with role)**
   - [ ] Migration + lib (`client-tenants.ts`). Superadmin: create tenant, set tenant features; create first admin (role=admin); assign any user to any tenant with any role (admin/editor/creator/viewer).
   - [ ] Auth metadata: tenant_id, role from client_admin_tenants.

4. **Superadmin UI: roles + tenant features + assign users**
   - [ ] `/admin/super/roles` (or under super settings): edit feature set per role (Admin, Editor, Creator, Viewer).
   - [ ] Client detail: Features tab (tenant feature toggles); Admins tab (list, add user, assign role). Only superadmin can set role=Admin.

5. **Enforce feature scope (sidebar + routes)**
   - [ ] Sidebar config API returns `getEffectiveFeatures(tenant_id, user.role)`; sidebar and route protection use it. Team cannot see more than Admin.

6. **Tenant admin: Settings → Team**
   - [ ] `/admin/settings/team`: list team, add team member (email, display name, role = Editor | Creator | Viewer only). Same tables; permission: only role=Admin can add; cannot assign Admin role.

7. **Profile page (all site users)**
   - [ ] **Superadmin:** Profile as sub-item under Superadmin (e.g. `/admin/super/profile`). Sidebar: Superadmin → Profile. Manage own details (name, email, avatar, etc.); superadmin users are few.
   - [ ] **Other admins and client team:** Profile under Settings menu (e.g. `/admin/settings/profile`). Same profile fields; user edits own record. Visible to anyone with Settings access (or dedicated “Profile” link in Settings nav).

### Other / Deferred
- [ ] Phase 12 full component library; Phase 11, 10, dynamic Page (deferred).

---

## Context for handoff

- (See changelog "Context for Next Session" for latest.)
