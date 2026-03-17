# Project Members, Client, and Task Assignee Scoping — Step Plan

**Purpose:** Clarify requirements and create an implementation plan for (1) project client (contact or organization), (2) project members, (3) scoping task assignee search to project members, and (4) multiple assignees per task. Includes discussion of “one task per member” vs “one task, many assignees.”

---

## 1. Current state (brief)

- **Projects:** `contact_id` exists (used for support: “this contact’s Support project”). `required_mag_id` for visibility. No “client” or “organization” as first-class; no project members table.
- **Tasks:** `creator_id`, `responsible_id` on task; **task_followers** table with roles `creator | responsible | follower` and `user_id` OR `contact_id`. Unique per (task_id, role, user_id) or (task_id, role, contact_id) — so we can have **multiple responsible** and **multiple followers** (each person once per role). “My tasks” already shows tasks where the user/contact is creator, responsible, or in task_followers.
- **Task assignee UI:** Task detail “Assignments” section adds **contacts only** (search via `/api/crm/contacts/search`); no team-member picker in that section. Creator/responsible may be set elsewhere (e.g. task create form). Assignee search is **not** scoped to any project list.
- **CRM:** `organizations` and `contact_organizations` (many-to-many) exist. No project–organization link yet.

---

## 2. Requirements (clarified)

### 2.1 Project client

- **Choose a client** for the project. Two mutually exclusive options:
  - **CRM contact** → client is that contact; display that contact as “Client” on project.
  - **Organization** → client is that organization; display the organization as “Client.” When choosing an organization, optionally **add org members as project members**: “Add all” or tick which contacts (from that org) to include.
- **Support projects:** Today we use `contact_id` to mean “this contact’s support project.” That can stay as-is; for “client” we can treat support project as “client = this contact” and optionally reuse the same field or introduce a dedicated client concept (see schema below).

### 2.2 Project members

- **Members** = people who can be assigned to tasks on this project (and who appear in the scoped assignee picker).
- **Sources:**
  - If client is an **organization**: optionally add some or all org contacts as members (bulk add + tick which).
  - **Additional members:** any mix of **internal admin team** (users) and **CRM contacts**.
- **Display:** On project detail, show members as **circle badges with initials** (avatar-style).
- **Effect:** **Task assignee search** (when adding creator/responsible/follower) is **scoped to project members** (instead of all contacts / all team).

### 2.3 Multiple assignees and “My tasks”

- Tasks already support **multiple assignees** via `task_followers`: one creator, one or more responsible, many followers; each can be user or contact. “My tasks” already includes a task for everyone who is creator, responsible, or follower.
- **Requirement:** Ensure multiple assignees are clearly supported in UI (add team + contacts from project members, multiple responsible/followers) so each sees the task in “My tasks.” No schema change required for “multiple assignees” per se; only UX and scoping to project members.

### 2.4 “One task per member” vs “one task, many assignees” (time tracking)

- **One task, many assignees:** One task row; many rows in `task_followers`. Time logs are on the **task** (we have `task_time_logs` with optional `user_id` / `contact_id`), so we can already attribute time to a person per log entry. “My tasks” shows the same task to everyone assigned.
- **One task per member (duplicated):** Some PM tools create **one task per assignee** (e.g. “Design review” → 3 tasks, one per person). That is often for:
  - **Per-person time tracking** where each “task” is really a personal work item with its own time and status.
  - **Different due dates or status per person** (e.g. “Review by Ray by Friday,” “Review by Sam by Monday”).
- **Recommendation:** Keep **one task, many assignees**. We already have `task_time_logs.user_id` / `contact_id` to attribute time to a person; “My tasks” already shows the task to all assignees. If we need “per-person due date” or “per-person status” later, we could add a separate concept (e.g. “task_assignee” with due_date_override) rather than duplicating the task. So: **no separate unique task per member** for this phase.

---

## 3. Schema (proposed)

### 3.1 Project client

- **Option A — Reuse and extend:** Keep `contact_id` for “client when client is a contact.” Add `client_organization_id` (nullable FK → organizations). If `client_organization_id` is set, client display = organization; if not, client display = contact from `contact_id`. Support project continues to use `contact_id` only.
- **Option B — Explicit client type:** Add `client_type` ('contact' | 'organization' | null) and `client_contact_id` + `client_organization_id` (one non-null when client_type is set). Clearer but more columns and migration from existing `contact_id`.
- **Recommendation:** **Option A.** Add `client_organization_id` nullable. Use `contact_id` as “client contact” when client is a contact; use `client_organization_id` when client is an organization. Support project: leave `contact_id` as-is (and do not set `client_organization_id`). One migration: add `client_organization_id`, backfill not required.

### 3.2 Project members (with role from taxonomy)

- **New table:** `project_members`.
  - Columns: `id`, `project_id` (FK → projects), `user_id` (nullable), `contact_id` (nullable), **`role_term_id`** (nullable FK → taxonomy_terms), `created_at`. Constraint: exactly one of `user_id` or `contact_id` set.
  - Unique on (project_id, user_id) and (project_id, contact_id) so the same person is not added twice.
- **Role:** Each member can have a **role** chosen from a dedicated taxonomy section **Project Roles** (e.g. “Designer”, “Developer”, “Stakeholder”, “Project lead”). This is implemented as a new **core taxonomy section** `project_roles` (see §3.4). The UI uses a role picker that lists terms from that section; `project_members.role_term_id` stores the chosen term (nullable if no role selected).
- **Population:**
  - When client is an **organization:** UI offers “Add org members to project” → for each selected contact (or all), insert into `project_members` with `contact_id` and optional role_term_id.
  - **Additional members:** Admin adds team (user_id) or contacts (contact_id) via project detail with optional role; each insert into `project_members`.
- **Support project:** When creating the perpetual support project, add the GPUM contact as the only project member (and client = that contact via `contact_id`).

### 3.3 Tasks (no change for multiple assignees)

- Keep `task_followers` as-is. Multiple responsible and multiple followers already allowed. Only change is **where** we get the list of candidates: from **project members** instead of global contact search + full team.

### 3.4 Core (non-deletable) taxonomy sections for project management

These sections are **core** and **non-deletable** (`is_staple = true` in `section_taxonomy_config`). Terms are managed in Settings → Taxonomy; admins can add/edit terms within each section but cannot delete the section itself.

| Section (`section_name`) | Display name   | Purpose |
|--------------------------|----------------|--------|
| `project_type`           | Project type   | Type of project (e.g. Standard, **Support**). |
| `project_status`        | Project status | Status (e.g. New, Active, Closed, **Perpetual**). |
| `task_type`             | Task type      | Type of task (e.g. default, support_ticket). |
| `task_status`           | Task status    | Task status (e.g. open, in_progress, done). |
| `task_priority`          | Task priority  | Priority (e.g. low, medium, high). |
| **`project_roles`**      | **Project roles** | **Member role on a project (e.g. Designer, Developer, Stakeholder). Used by project_members.role_term_id.** |

**Implementation note:** Project Type, Project Status, Task Type, Task Status, and Task Priority already exist. Add **Project Roles** as a new section in a migration (insert into `section_taxonomy_config` with `is_staple = true`); optionally seed a few default terms (e.g. “Project lead”, “Contributor”, “Stakeholder”). Lib: add `getProjectRoleTerms()` and use it for the project member role picker.

### 3.5 Support project and reserved taxonomy terms

- **Support project title:** Auto-created perpetual support project uses title **"Support Requests for – (client-name)"** (e.g. "Support Requests for – Acme Corp"). The client name comes from the CRM contact (client = that contact via `contact_id`).
- **Project type:** The project uses the **Project Type** taxonomy term whose slug is **"support"** (already seeded in migration 164_project_status_and_type_as_taxonomy.sql: `('Support', 'support', 'category', ARRAY['project_type'])`). So the reserved type is already in the taxonomy; we rely on this term for support projects.
- **Reserving terms:** To “manage this properly” with pre-configured taxonomy and avoid accidental deletion of required terms (e.g. “Support”, “Perpetual”), we have two options:
  - **Option A — Reserved list in app:** Maintain a hardcoded list of reserved term slugs per section (e.g. `support` in `project_type`, `perpetual` in `project_status`). In Settings → Taxonomy, **prevent deletion** of any term whose `(section, slug)` is in that list (and optionally show a “Reserved” badge). No schema change.
  - **Option B — Column on terms:** Add `is_reserved` (boolean, default false) to `taxonomy_terms`. Seed reserved terms with `is_reserved = true`; UI and API prevent deletion of reserved terms. Requires migration and backfill for existing core terms.
- **Recommendation:** **Option A** for this phase: document the reserved slugs (Support, Perpetual, and any other required defaults) in prd-technical or this plan; implement “cannot delete term if slug is in reserved list for that section” in the Taxonomy settings UI. We can add `is_reserved` later if we want tenant-level reserved terms.

---

## 4. Step plan (implementation order)

### Phase A — Project client and project members (schema + core API)

1. **Migration — project client (organization):** Add `client_organization_id` (nullable FK → organizations) to `projects`. Update RPCs that return project (get_projects_dynamic, get_project_by_id_dynamic) to include it. Types and lib: Project type, create/update, API accept `client_organization_id` and optionally `contact_id` (already exists).
2. **Migration — project_roles section:** Add **Project Roles** as a core taxonomy section (`section_name = 'project_roles'`, `is_staple = true`). Optionally seed default terms (e.g. Project lead, Contributor, Stakeholder). Lib: `getProjectRoleTerms(schema)` (same pattern as `getProjectTypeTerms`).
3. **Migration — project_members:** Create table `project_members` (id, project_id, user_id, contact_id, **role_term_id** nullable FK → taxonomy_terms, created_at); unique (project_id, user_id) and (project_id, contact_id); RLS; indexes.
4. **Lib + API — project members:** `listProjectMembers(projectId)`, `addProjectMember(projectId, { user_id | contact_id, role_term_id? })`, `removeProjectMember(id)`. API: GET/POST/DELETE `/api/projects/[id]/members`. Return member with role term label; resolve display labels (user → profile/email, contact → name/email).
5. **Project detail — client selector:** On create/edit (or detail if editable): “Client” = Contact picker **or** Organization picker (mutually exclusive). If organization: show “Add org members to project” with “Add all” or checkboxes per contact in that org; on confirm, insert into `project_members` (contact_id, optional role_term_id) for selected. Persist `contact_id` or `client_organization_id` on project.
6. **Project detail — members section:** List project members (from `project_members`); show as **circle badges with initials** (and optional tooltip/name + role). “Add member” → pick from team or contacts (type-ahead) and **role** from Project Roles taxonomy picker; add to `project_members`. When client is organization and “Add org members” was used, those contacts already appear here.

### Phase B — Scoping task assignees to project members

7. **API — assignee candidates by project:** `GET /api/projects/[id]/members` returns members (with labels and role); when adding a task follower from a project context, front end uses this list as the **only** options for assignee (creator/responsible/follower).
8. **Task form / task detail — assignee picker:** When the task belongs to a project that has project members, **restrict** the “Add assignee” (creator/responsible/follower) search/dropdown to **project members only**. If project has no members (or project members not yet implemented), fall back to current behavior (e.g. all contacts or all team) so existing flows don’t break. Pass `projectId` into TaskFollowersSection (or equivalent) and use project members as the candidate list when available.

### Phase C — Multiple assignees (UX and consistency)

9. **Task assignee UI — team + contacts from project members:** Ensure the “Assignments” section can add both **team members** (user_id) and **contacts** (contact_id) from the **project member list**, with roles creator / responsible / follower. Add team member option and source both from project members when `projectId` is set.
9. **“My tasks”:** Already shows tasks where current user (or contact) is creator, responsible, or in task_followers. No change needed once we allow adding multiple responsible/followers from project members.

### Phase D — Support project, reserved terms, and docs

11. **Support project:** When creating the perpetual support project for a GPUM, set `contact_id` (client = that contact) and add that contact as the only **project member** so support tasks can assign only that contact if desired (and future “scoped by project members” still works).
11. **Docs:** Update sessionlog/planlog and prd-technical with: project client, project_members (with role_term_id), Project Roles section, core PM taxonomy sections list, support project title, assignee-scoping behavior.

---

## 5. Summary

| Item | Approach |
|------|----------|
| **Project client** | Contact (reuse `contact_id`) or Organization (new `client_organization_id`). Display “Client” on project from contact or org. |
| **Project members** | New table `project_members` (project_id, user_id \| contact_id, **role_term_id** from Project Roles taxonomy). Role picker from Settings → Taxonomy (project_roles section). Filled when choosing org (“add org members”) and by “Add member” (team + contacts). Shown as circle badges with initials (and role) on project detail. |
| **Task assignee scoping** | When adding creator/responsible/follower for a task in a project, restrict picker to **project members** (API returns project members; UI uses that list). Fallback to current behavior if no project or no members. |
| **Multiple assignees** | Keep one task, many assignees via `task_followers`. No “one task per member” duplication. Time tracking stays on task with user_id/contact_id on time log. |
| **Support project** | Title **"Support Requests for – (client-name)"**; Project Type = taxonomy term **Support**; keep `contact_id`; add that contact to `project_members` when creating. |
| **Core PM taxonomy sections** | Project Type, Project Status, Task Type, Task Status, Task Priority, **Project Roles** (all `is_staple`, non-deletable). Reserved term slugs (e.g. Support, Perpetual) protected from deletion in Taxonomy UI (optional this phase). |

This plan is ready to be refined (e.g. naming, or whether client is editable only on create vs also on edit) and then broken into concrete tickets or session steps.
