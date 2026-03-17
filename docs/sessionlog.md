# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

**Phase 19 — Project members, client, assignee scoping (current focus)** — Full plan: [project-members-and-client-plan.md](./project-members-and-client-plan.md). Core PM taxonomy: Project Type, Project Status, Task Type, Task Status, Task Priority, **Project Roles** (new). Support project title: "Support Requests for – (client-name)"; reserved terms optional.

**Implementation order (start here):**

- [x] **1. Migration — project client (org):** Add `client_organization_id` (nullable FK → organizations) to projects; update RPCs/types; API create/update accept it.
- [x] **2. Migration — project_roles section:** Add Project Roles as core taxonomy section (is_staple); seed default terms (Project lead, Contributor, Stakeholder, Designer, Developer); lib `getProjectRoleTerms()`.
- [x] **3. Migration — project_members:** Table project_members (id, project_id, user_id, contact_id, role_term_id nullable FK → taxonomy_terms, created_at); unique (project_id, user_id) and (project_id, contact_id); RLS; indexes.
- [x] **4. Lib + API — project members:** listProjectMembers(projectId), addProjectMember(projectId, { user_id | contact_id, role_term_id? }), removeProjectMember(id); GET/POST/DELETE `/api/projects/[id]/members`.
- [x] **5. Project detail — client selector:** Client = Contact picker or Organization picker (mutually exclusive). If org: "Add org members" (all or tick) → project_members. Persist contact_id or client_organization_id.
- [x] **6. Project detail — members section:** List project members as circle badges (initials + role); "Add member" (team + contacts) with role picker from Project Roles.
- [x] **7. Task assignee scoping:** When task has project with members, restrict assignee picker to project members (use GET /api/projects/[id]/members); pass projectId into TaskFollowersSection.
- [x] **8. Task assignee — team + contacts:** Allow adding team (user) and contacts from project members in Assignments section; multiple responsible/followers.
- [ ] **9. Support project:** Title "Support Requests for – (client-name)"; project_type_term_id = Support; add GPUM contact to project_members when creating perpetual support project.
- [ ] **10. Reserved taxonomy terms (optional):** Prevent deletion of reserved slugs (e.g. project_type.support, project_status.perpetual) in Settings → Taxonomy; document list.

**Workflow:** Check off here → sync to planlog Phase 19 project members block → at session end, changelog + remove completed from here.

---

**Phase 19: Project Management Module + expansion (3/16/2026)** — from [planlog.md](./planlog.md). Schema, RPC/API, and core Admin UI done. Expansion: user handle, task threads, conversation UID, Project Transactions tab, Sidebar Activities, time tracking. Scope in [prd.md](./prd.md).

**Workflow:** These steps live in both planlog (Phase 19 expansion + Phase 04 Content consolidation) and here. Check off in sessionlog → sync checkoffs to planlog → at session end, move completed items to changelog for history.

**Implementation order (work from this list):** Do **taxonomy color** first; then use taxonomy (with color) in projects, tasks, task priority, and other places as needed.

- [x] **Schema — task start_date:** Add start_date to tasks; migration; forms/list/detail.
- [x] **Schema — task_id on crm_notes:** task_id (FK → tasks) on crm_notes for task threads; migration; RPC.
- [x] **Schema — conversation_uid on crm_notes:** conversation_uid for message threading; migration; RPC/API.
- [x] **Schema — task_time_logs:** Table task_time_logs; migration; RLS; indexes.
- [x] **Schema — project_id on invoices:** project_id on invoices; copy to order when invoice paid.
- [x] **User handle — schema & profile:** handle column (unique per tenant); profile/settings: handle field + checkbox "Communicate in messages, comments" (required for group/social messaging); handle editable.
- [x] **User handle — auto-generate on first support ticket:** When GPUM creates a support ticket and has no handle and has not ticked the messaging checkbox: auto-generate handle so ticket can be created; do NOT enable social messaging (checkbox stays unchecked); user can change handle later in profile.
- [x] **User handle — activity when auto-generated:** When handle is auto-generated at ticket creation, add activity stream entry (visible to user and admin): message that a handle was auto-generated and they can change it in Profile.
- [x] **User handle — display:** Show handle in task threads, activity stream, blog comments.
- [x] **Conversation (thread) — create/get:** One thread model: conversation = comment thread = support ticket thread. conversation_uid identifies thread (task thread: `task:${taskId}`). createNote sets task_id + conversation_uid; RPC get_notes_by_conversation_uid_dynamic; API GET/POST /api/tasks/[id]/notes; task detail UI: thread + "Add reply", display handle. (Messages/focus filter later.)
- [x] **Task followers — UI:** Add/edit followers (and optionally creator, responsible) on task in admin. Task detail: Assignments section — list followers with label (contact or user), add follower (role + contact search), remove. API GET/POST/DELETE /api/tasks/[id]/followers. Needed so task thread "Add reply" has a contact.
- [x] **Conversation — activity inclusion:** getMemberActivity includes notes for tasks I'm on (and messages by conversation_uid when applicable).
- [x] **Project detail — Transactions tab:** Merged orders + invoices; project total (sum orders); link/unlink project_id; copy project_id when order from invoice.
- [x] **Time tracking — API & UI:** Time log API; task detail time logs; project rolled-up total; not in activity stream.
- [x] **Priority & taxonomy colors:** Task priority colors; project type color chips (Projects section).
- [x] **Taxonomy — color option (do first):** Add optional color field to taxonomy_terms (migration). Categories (parent and child) and tags: each term has an optional color chip (stored value). UI: Admin → Settings → Taxonomy; add color to the shared Edit Category / Edit Tag modal (Categories tab and Tags tab). When creating a new sub-item (child category or tag), auto-inherit the color from the parent.
- [x] **Task priority as taxonomy:** Implement task priority as taxonomy-driven (dedicated section in section_taxonomy_config; terms tag-like). Remove hardcoded low/medium/high from tasks (migration: priority_term_id or relationship; backfill; drop enum/CHECK). Manage priority terms in Settings → Taxonomy; task create/edit and lists use selected priority term (label + color from taxonomy).
- [x] **Projects/tasks — taxonomy UI (with color):** Add taxonomy assignment to project and task create/edit/detail (TaxonomyAssignmentForContent or equivalent for content_type project/task). Display categories and tags with taxonomy color where shown (lists, detail).
- [x] **Activity stream — task state changes:** Log task status changes to stream (no time logs).
- [x] **Support project (per GPUM):** Create when GPUM starts support (first ticket), not on member creation; status = perpetual; category = Support Ticket; one project per GPUM; all support_ticket tasks link to it.
- [x] **Integration — support tickets:** GPUM submit ticket; create/reuse perpetual Support project (status = perpetual, category = Support Ticket) when GPUM starts support; task_type support_ticket.
- [x] **Integration — calendar:** event project_id; project detail Events tab (list + Unlink); event form Project (optional) selector; API create/update accept project_id.

- [ ] **Project Events tab — calendar view (UI):** Replace or augment the Events tab on project detail with a **calendar mirror** (same month / week / list views as main admin calendar). Events shown are those linked to this project (wiring in place: `listEventsByProjectId`, project_id on events). **Create event** from this view (e.g. click slot or "Add event") opens create form with **project_id pre-filled** to this project so the new event is auto-linked. Keep Unlink (and optional Edit) in the calendar/list UI. Wiring already done; this is the UI update only.

## Some Cleanup
- [ ] **Sidebar — Content consolidation:** One top-level Content with sub-items Text Blocks, Media, Galleries; remove separate Media top-level. (Do before roles/gate.)
- [ ] **Custom view presets (optional):** user_view_presets table; API; View dropdown on projects/tasks lists.
- [ ] **Feature registry, sidebar gating & roles (Phase 19):** projects in registry; sidebar gating; roles.

---

## Site Visitor Analytics

*(After Phase 19 expansion; before pre-fork.)* Scope: schema, tracking, API, admin dashboard graph, GPUM page views in activity stream.

- [ ] **Site Visitor Analytics — schema:** Table(s) for visitor events or aggregates (tenant-scoped). Optional: member page views (contact_id, path, visited_at) for GPUM. Migration; RLS.
- [ ] **Site Visitor Analytics — tracking:** Record public page visits (API or middleware); minimal data (path, date). No PII for anonymous. When logged-in GPUM: optionally record with contact_id for activity stream.
- [ ] **Site Visitor Analytics — API:** Endpoints for aggregated stats (date range, path) for admin.
- [ ] **Site Visitor Analytics — dashboard:** Admin dashboard widget/section with visitor statistics and graph.
- [ ] **Site Visitor Analytics — GPUM page views in activity stream:** Record GPUM page views; include in getMemberActivity so "Viewed: …" shows in member activity stream (and admin contact view). Content pages only if desired.

---

## Pre-fork: Security review & fork deployment checklist

**Carries over to the new fork.** Two parts:

- [ ] **a. Security review** — Review the app for security concerns (auth, RLS, input validation, per-feature pass). See planlog → Code Review, Security & Modular Alignment; Error handling (404/500, membership denied); Performance as needed for v1.
- [ ] **b. Fork deployment checklist** — Create and document the checklist needed for deploying a fork of the application.
  - Test Automated Client Setup Script (`pnpm setup-client <schema-name>`)
  - Template (root) domain deployment: Vercel, env vars, superadmin user, test auth
  - Integrations: test script injection, enable/disable, superadmin-only access
  - Document and lock down the fork deployment checklist for future client launches (e.g. first fork: **phpbme**, domain **phpbme.com**)

---
## Reference (design locked / Phase 19)

- **Invoicing (locked):** Schema, number generator, shared sequence with orders, flow, customer identifiers — see changelog 2026-03-14 entry and planlog Phase 19 as needed.
- **Phase 19 (Project Management):** Taxonomy for projects/tasks, MAG parent/child (done), CRM Organizations (done). Remaining: Project Management (projects + tasks) step-by-step in planlog.
- **Support project (per GPUM):** Created when GPUM starts a support process (first ticket), not on member creation. **Status** = perpetual (lives with the life of the client). **Category** = Support Ticket (taxonomy). One perpetual Support project per GPUM; all their support_ticket tasks link to it.
- **Conversation = thread:** One unified activity-stream concept: a conversation is a comment thread, support ticket thread, or message thread. Identified by `conversation_uid` (task threads use `task:${taskId}`). Get/set by conversation_uid; same createNote flow.

---
## Paused / Later

- **Member area (GPUM) UI** — Projects, Support Tickets, Tasks in member area: do later (after current step plan). Planlog Phase 19 has the spec.

_(Optional — move items to planlog when they become backlog.)_
