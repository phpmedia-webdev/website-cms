# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

**Phase 19: Project Management Module + expansion (3/16/2026)** — from [planlog.md](./planlog.md). Schema, RPC/API, and core Admin UI done. Expansion: user handle, task threads, conversation UID, Project Transactions tab, Sidebar Activities, time tracking. Scope in [prd.md](./prd.md).

**Workflow:** These steps live in both planlog (Phase 19 expansion + Phase 04 Content consolidation) and here. Check off in sessionlog → sync checkoffs to planlog → at session end, move completed items to changelog for history.

**Implementation order (work from this list):**

- [x] **Schema — task start_date:** Add start_date to tasks; migration; forms/list/detail.
- [x] **Schema — task_id on crm_notes:** task_id (FK → tasks) on crm_notes for task threads; migration; RPC.
- [x] **Schema — conversation_uid on crm_notes:** conversation_uid for message threading; migration; RPC/API.
- [x] **Schema — task_time_logs:** Table task_time_logs; migration; RLS; indexes.
- [x] **Schema — project_id on invoices:** project_id on invoices; copy to order when invoice paid.
- [x] **User handle — schema & profile:** handle column (unique per tenant); profile/settings: handle field + checkbox "Communicate in messages, comments" (required for group/social messaging); handle editable.
- [ ] **User handle — auto-generate on first support ticket:** When GPUM creates a support ticket and has no handle and has not ticked the messaging checkbox: auto-generate handle so ticket can be created; do NOT enable social messaging (checkbox stays unchecked); user can change handle later in profile.
- [ ] **User handle — activity when auto-generated:** When handle is auto-generated at ticket creation, add activity stream entry (visible to user and admin): message that a handle was auto-generated and they can change it in Profile.
- [x] **User handle — display:** Show handle in task threads, activity stream, blog comments.
- [x] **Conversation (thread) — create/get:** One thread model: conversation = comment thread = support ticket thread. conversation_uid identifies thread (task thread: `task:${taskId}`). createNote sets task_id + conversation_uid; RPC get_notes_by_conversation_uid_dynamic; API GET/POST /api/tasks/[id]/notes; task detail UI: thread + "Add reply", display handle. (Messages/focus filter later.)
- [x] **Task followers — UI:** Add/edit followers (and optionally creator, responsible) on task in admin. Task detail: Assignments section — list followers with label (contact or user), add follower (role + contact search), remove. API GET/POST/DELETE /api/tasks/[id]/followers. Needed so task thread "Add reply" has a contact.
- [x] **Conversation — activity inclusion:** getMemberActivity includes notes for tasks I'm on (and messages by conversation_uid when applicable).
- [x] **Project detail — Transactions tab:** Merged orders + invoices; project total (sum orders); link/unlink project_id; copy project_id when order from invoice.
- [ ] **Time tracking — API & UI:** Time log API; task detail time logs; project rolled-up total; not in activity stream.
- [ ] **Priority & taxonomy colors:** Task priority colors; project type color chips (Projects section).
- [ ] **Custom view presets (optional):** user_view_presets table; API; View dropdown on projects/tasks lists.
- [ ] **Activity stream — task state changes:** Log task status changes to stream (no time logs).
- [ ] **Support project (per GPUM):** Create when GPUM starts support (first ticket), not on member creation; status = perpetual; category = Support Ticket; one project per GPUM; all support_ticket tasks link to it.
- [ ] **Integration — support tickets:** GPUM submit ticket; create/reuse perpetual Support project (status = perpetual, category = Support Ticket) when GPUM starts support; task_type support_ticket.
- [ ] **Integration — calendar:** event project_id; project detail linked events.
- [ ] **Sidebar — Content consolidation:** One top-level Content with sub-items Text Blocks, Media, Galleries; remove separate Media top-level. (Do before roles/gate.)
- [ ] **Feature registry, sidebar gating & roles (Phase 19):** projects in registry; sidebar gating; roles.

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
