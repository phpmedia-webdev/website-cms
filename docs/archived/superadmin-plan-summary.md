# Superadmin Layout & Tenant Plan — Summary for Review

**Purpose:** Summary of the updated Superadmin structure, terminology, and build steps. Confirm before updating `sessionlog.md`.

---

## 1. Terminology (standardized)

| Term | Meaning |
|------|--------|
| **Tenant** | The end-user client concept (the business/organization using the platform). |
| **Tenant Site** | The individual website — has a website name, schema, and feature set. This is the “site” we manage in the Superadmin list. |
| **Tenant Client** | The actual client business/organization name. Used rarely; distinct from “Tenant Site” when we need to refer to the org. |
| **Tenant User** | An admin or team member for a Tenant Site (stored in `client_admins` / `client_admin_tenants`). |

---

## 2. Superadmin menu structure

**Top-level:** **Superadmin** (sidebar link; can open Dashboard by default).

**Sub-links (order and labels):**

1. **Dashboard** — Landing / future metrics. Route: `/admin/super` or `/admin/super/dashboard`.
2. **Tenant Sites** — Global list of all tenant web apps (table). Route: `/admin/super/tenant-sites` (or keep `/admin/super/clients` and rename UI only; see Implementation note below).
3. **Tenant Users** — Master compiled list of all users across all tenant sites (site + role per row; users with multiple sites show multiple rows or aggregated). Route: `/admin/super/tenant-users`.
4. **Roles** — Global role manager (create/edit roles and custom sub-roles; feature plans). Route: `/admin/super/roles`.
5. **Code Library** — Global library of reusable code (copy/paste to donor folder). Route: `/admin/super/code-snippets` (rename UI label to “Code Library”).

**No tabbed dashboard.** Each item is a separate full-size page with its own route.

---

## 3. Tenant Sites section (full-size pages, no modals)

- **List:** Full page — table of all Tenant Sites (website name, schema/id, optional tenant client name, etc.). Actions: Add Tenant Site, open detail.
- **Detail:** Full page with a **Back** button (e.g. “← Back to Tenant Sites”). Content: site info (name, schema, features, etc.) and a **Related Tenant Users** section — table of users assigned to this site with role. Action: “Add user” (add existing or invite new) and link to user detail/edit where appropriate.
- **Add/Edit site:** Full page with Back button (no overlay modals).
- **Drill-down to users:** From Tenant Site detail, “Related Tenant Users” links to the same Tenant User records; can navigate to global **Tenant Users** list (e.g. filtered by this site) or to a user detail page.

---

## 4. Tenant Users (global table + two entry points)

- **Global Tenant Users table** (`/admin/super/tenant-users`):
  - Master list of all Tenant Users across all sites.
  - Columns: user (email, display name), site(s), role(s). Users on multiple sites show each site+role (e.g. one row per assignment or grouped with site badges).
  - **Superadmin users** included in the list with a **clear badge/icon** (e.g. “Superadmin”) so they are visible and distinguishable.

- **Two entry points:**
  1. **Standalone:** Superadmin → **Tenant Users** → full list; add/edit/invite from here.
  2. **From Tenant Site:** Superadmin → **Tenant Sites** → [Site] → Related Tenant Users section → add user for this site or open user; can link through to global Tenant Users or user detail.

- **First admin for a site:** Superadmin can define and set up a site’s first admin (e.g. from Tenant Site detail “Add user” → assign Admin role; or during site creation flow). This is the same “add user + assign role” flow.

- **New user invite:** When a **new** user is added to the table (not yet in Supabase Auth), they receive an **email to create their password** (invite flow). Existing users being assigned to another site do not need a new invite.

---

## 5. Roles & Code Library

- **Roles** (`/admin/super/roles`): Global role manager — built-in roles (Admin, Editor, Creator, Viewer) plus create/edit **custom sub-roles** (e.g. “Admin-NoCRM”) with feature sets. No change to current behavior; label and placement in nav as above.
- **Code Library** (`/admin/super/code-snippets`): Rename UI label from “Code Snippets” to “Code Library”; route can stay. Full-size list/detail pages with back navigation (already in place).

---

## 6. Implementation notes (for build)

- **Routes:** Decide whether to rename paths for consistency (e.g. `clients` → `tenant-sites`, `users` → `tenant-users`) or keep existing routes and only change sidebar labels. Summary assumes we can use either; sessionlog can specify.
- **Sidebar:** Update `superadminSubNav` (and any links) to: Dashboard, Tenant Sites, Tenant Users, Roles, Code Library. Remove “Clients” / “Local Users” as previously scoped; “Tenant Users” is the global list; site-scoped team is under Settings → Team for tenant admins.
- **Invite email:** Requires Supabase Auth invite (e.g. `inviteUserByEmail`) or custom email flow when adding a new Tenant User who does not yet have an account.

---

## 7. Updated build plan steps (order of work)

**Principles (unchanged):** Effective features = tenant features ∩ role features. Only Superadmin can assign Admin role; Tenant Site admin can add team with Editor/Creator/Viewer only. Non-admin role feature set ⊆ Admin role feature set.

### Already done (reference)
- Feature registry + role feature set (081, 083); tenant registry + tenant features (082, 084); getEffectiveFeatures; Clients list, Add client, client detail with Features tab.
- Migration 085 (`client_admins`, `client_admin_tenants`) — run when ready.
- Code Snippets (Code Library) list/detail; Roles UI.

### Step 1 — Data & auth for Tenant Users
- Types + lib: CRUD for `client_admins`, assign/remove user to tenant with role; list users per tenant; list all users across tenants (for global table).
- Auth/session: resolve current user’s role from `client_admin_tenants` for current tenant (sidebar + route guards).
- Invite flow: when adding a **new** user (no Auth account yet), send invite email (e.g. Supabase `inviteUserByEmail` or custom) so they can set password.

### Step 2 — Superadmin sidebar and routes
- Rename/order Superadmin sub-links: **Dashboard** | **Tenant Sites** | **Tenant Users** | **Roles** | **Code Library**.
- Ensure each is a full-size page (no tabbed dashboard). Dashboard = `/admin/super` (or `/admin/super/dashboard`). Tenant Sites = current clients list route (rename UI to “Tenant Sites”). Tenant Users = new route `/admin/super/tenant-users` (global table). Roles and Code Library = existing routes, labels updated.

### Step 3 — Tenant Sites (full-size pages, back button)
- Tenant Sites list: full page, table, “Add Tenant Site” → full page form with Back.
- Tenant Site detail: full page with Back to Tenant Sites; site info + **Related Tenant Users** table (users for this site with role). “Add user” from here (same data as global Tenant Users; two entry points).
- No overlay modals for primary flows; use full pages + back navigation.

### Step 4 — Tenant Users global table + badge
- `/admin/super/tenant-users`: full page, table of all Tenant Users (all sites). Columns: email, display name, site(s), role(s). Rows can be one per (user, site) or grouped.
- Superadmin users shown with a **badge/icon** (e.g. “Superadmin”) so they are clearly distinguished.
- Add user / invite from this page; from Tenant Site detail, “Add user” can reuse same APIs and optionally redirect or link to this list (e.g. with site filter).

### Step 5 — First admin and Settings → Team
- First admin: Superadmin can set a site’s first admin from Tenant Site detail (add user, assign Admin role; invite if new).
- Tenant admin (Settings → Team): `/admin/settings/team` — list team for **current** site; add member (Editor/Creator/Viewer only). Only Admin can add; cannot assign Admin. Profile remains under Settings → Profile.

### Step 6 — Page headers and effective features
- Superadmin pages: show “Managing: [current site name]” when in site context, or “Superadmin” when not.
- Sidebar + route guards: use `getEffectiveFeatures(tenant_id, role)` so team cannot see more than their role allows.

### Step 7 — Profile
- Settings → Profile: one profile per user (name, email, avatar, etc.); editable by self. Available to all site users with Settings access. No separate super profile page.

---

## 8. Edge cases / considerations

- **Superadmin in Tenant Users table:** Ensure Superadmin users are either stored in the same tables with a flag/role or joined from Auth so they appear in the global list with a badge; and that “add first admin” does not conflict with how Superadmins are identified.
- **User on multiple sites:** Global Tenant Users list must show each site+role (multiple rows or one row with multiple site/role chips). Adding the same user to another site = new row in `client_admin_tenants`; no new invite.
- **Invite only for new users:** Only send “create password” email when the user does not already exist in Auth. If we create a `client_admins` row and link to an existing Auth user (e.g. by email), no invite.
- **Route naming:** If we rename `clients` → `tenant-sites` and add `tenant-users`, all links (sidebar, redirects, Tenant Site detail “Back”, etc.) must be updated consistently.

---

**Next:** Review this summary; once confirmed, we will update `sessionlog.md` to reflect this plan and remove/rewrite the previous “Superadmin final layout” and “Build plan” sections accordingly.
