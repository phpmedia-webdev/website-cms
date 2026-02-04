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

**MVP: Tenant roles, feature scope, team, and profile.** Superadmin: Dashboard | Tenant Sites | Tenant Users | Roles | Code Library (separate full-size pages). Tenant Site list/detail with back navigation; global Tenant Users table with two entry points; invite email for new users. Profile under Settings. No Integrations UI (header scripts in Code Library).

---

## Priority next step

- **Content editor: modal → full page.** On the content creation link, change the editor from a **modal view to a full page view** with a **back button top left**. The current modal is too small for comfortable editing.

---

## Terminology

| Term | Meaning |
|------|--------|
| **Tenant** | End-user client concept (business/organization). |
| **Tenant Site** | Individual website — name, schema, feature set. |
| **Tenant Client** | Actual client business name (used rarely). |
| **Tenant User** | Admin or team member for a Tenant Site. |

---

## Route and table renames (consistent naming)

**Routes (Superadmin):**
- `/admin/super/clients` → `/admin/super/tenant-sites`
- New: `/admin/super/tenant-users`
- `/admin/super/code-snippets` → `/admin/super/code-library`
- Dashboard: `/admin/super` or `/admin/super/dashboard`; Roles: `/admin/super/roles` (unchanged).

**Tables (migration 086 + code):**
- `client_tenants` → `tenant_sites`
- `client_admins` → `tenant_users`
- `client_admin_tenants` → `tenant_user_assignments` (junction: which user is on which site with which role)

All code references to old routes and table names must be updated when implementing.

---

## Superadmin layout

- **Superadmin** (sidebar link; opens Dashboard).
- **Sub-links (order):** Dashboard | Tenant Sites | Tenant Users | Roles | Code Library.
- **No tabbed dashboard** — each item is a full-size page with its own route.
- **Tenant Sites:** List (full page) → detail (full page with Back); detail includes Related Tenant Users section. Add/Edit site = full page with Back (no overlay modals).
- **Tenant Users:** Global table at `/admin/super/tenant-users`; Superadmin users shown with badge. Two entry points: standalone list and from Tenant Site detail → Related Tenant Users.
- **First admin:** Handled by the client startup script: script always assigns superadmin access; has an **optional first-user (admin)** field so you can scaffold the site before inviting the first tenant admin. If not set by script, first admin can be added later via Tenant Site detail (Add user → Admin) or Settings → Team (once an admin exists).
- **New user:** When adding a user who has no Auth account yet, send invite email to create password.
- **Profile:** Settings → Profile for all site users (one profile per user; editable by self). UI left plain for later design pass.

---

## MVP: What’s left (from docs/reference/mvp-status.md + PRD)

**MVP** = one deployable template: content, media, galleries, CRM, memberships, forms, basic public pages, plus tenant/superadmin structure (sites, users, roles, profile, team) with minimal polish and known gaps.

**Done toward MVP:** Auth/MFA, design system, content (no Page in library), media/galleries/MAG, CRM (contacts, forms, submissions, activity stream), code generator, code library (MVP variant), **tenant registry** (tenant_sites, tenant_features), **roles + feature registry**, **tenant users + assignments**, **Tenant Sites / Tenant Users / Roles / Code Library** Superadmin UI, **Profile** (Settings → Profile), **dynamic header** (site + role). Build passes.

**Remaining (ordered):**

1. **Smoke-test core flows (no new features)**  
   - Manually verify: content (post/snippet), media, galleries, CRM (contacts, custom fields, forms, submit, submissions), memberships (MAG), code generator (batch, redeem). Fix anything broken.

2. **Settings → Team**  
   - [ ] `/admin/settings/team`: list team for **current** site; add member (Editor/Creator/Viewer only). Only Admin can add; cannot assign Admin.

3. **Effective features (sidebar + route guards)**  
   - [ ] Use `getEffectiveFeatures(tenant_id, role)` so sidebar and route guards hide or block features the role doesn’t have. Team cannot see more than role allows.

4. **Client startup script (Phase 11 CLI)**  
   - [ ] Script creates schema, **always assigns superadmin access**, **optional first-user (admin)**. Enables new tenant sites; optionally invite first admin or scaffold first and add later via UI.

**Optional for MVP:** Phase 12 full component library (code snippets + donor is enough for dev reference).  
**Explicitly out of MVP (defer):** Phase 10 API, Phase 13/14 archive/reset, Phase 15 full polish, Phase 9B Marketing, full member routes/content protection, RAG/Digicards/Team 18b.

---

## Build plan (order of work)

**Principles:** Effective features = tenant features ∩ role features. Only Superadmin can assign Admin role; Tenant Site admin can add team with Editor/Creator/Viewer only. Non-admin role feature set ⊆ Admin role feature set.

### Done
- [x] **Feature registry + role feature set:** Migrations 081, 083. `feature_registry`, `admin_roles`, `role_features`; types + `feature-registry.ts`; Roles UI at `/admin/super/roles`.
- [x] **Tenant registry + tenant features:** Migrations 082, 084. `client_tenants`, `tenant_features`; types + `client-tenants.ts`; `getEffectiveFeatures(tenantId, roleSlug)`; Clients list, Add client, client detail with Features tab.
- [x] **User-tenant-role tables:** Migration 085 (`client_admins`, `client_admin_tenants`) — run in SQL Editor when ready.

### Next up (this phase: Profile + dynamic header)

- [x] **Migration 087: profiles + profile_field_values** — `public.profiles` (user_id, display_name, avatar_url, title, company, bio, phone); `public.profile_field_values` (user_id, field_key, value). RLS: users read/update own row(s).
- [x] **Types + lib:** `src/types/profiles.ts`, `src/lib/supabase/profiles.ts` — get/upsert profile, get/set custom field values.
- [x] **Settings → Profile:** `/admin/settings/profile` — form for core fields + custom key-value; email read-only. Add "Profile" to Settings sub-nav in Sidebar.
- [x] **Dynamic header:** Admin layout header shows current site name + role (from tenant_sites + getRoleForCurrentUser or "Superadmin"); when no tenant: "Platform · Superadmin".

### Remaining (in order)

- [x] **Migration 086**, route renames, **Tenant Users data & auth**, **Tenant Sites pages**, **Tenant Users global table** — done (see Done above and previous sessions).
- [x] **Profile** (migration 087, types/lib, Settings → Profile, sidebar link) and **dynamic header** — done.

6. **Settings → Team** (first admin via client startup script)
   - [ ] Client startup script: always assigns superadmin access to the new site; **optional first-user (admin)** parameter — when provided, script creates/invites first tenant admin; when omitted, you can scaffold then add first admin later via Tenant Site detail or Team.
   - [ ] `/admin/settings/team`: list team for **current** site; add member (Editor/Creator/Viewer only). Only Admin can add; cannot assign Admin.

7. **Page headers + effective features**
   - [ ] Superadmin pages: “Managing: [current site name]” or “Superadmin” when no site context.
   - [ ] Sidebar + route guards: use `getEffectiveFeatures(tenant_id, role)` so team cannot see more than role allows.

### Other / Deferred
- [ ] Phase 12 full component library; Phase 11 (script in “MVP: What’s left” above), Phase 10, dynamic Page (deferred).

---

## Context for handoff

- (See changelog "Context for Next Session" for latest.)
