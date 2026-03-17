# Phase 19 Expansion — Draft Step Plan (Review Before Adding to Planlog/Sessionlog)

**Source:** Decisions from session starting 3/16/2026.  
**Purpose:** Add enhancements to Project Management module, user handle for messaging, and activity-stream controls for message/conversation threading.  
**Status:** DRAFT — review before merging into [planlog.md](./planlog.md) and [sessionlog.md](./sessionlog.md).

---

## Design decisions (locked)

- **Orders vs invoices:** Keep **two tables** (orders, invoices). Orders = checkout + subscription payments + order created when invoice paid. Invoices = one-off ad hoc. Aligns with Stripe (Checkout vs Invoice API).
- **Project linking:** Add **project_id** to **invoices** (orders already have it). Project Transactions tab = merged list of linked orders + linked invoices. **Project total** = sum of **orders.total** only (avoid double-counting when invoice is paid and order is created).
- **Activity stream:** Single stream (crm_notes). Task threads via **task_id** on crm_notes. Messages get a **conversation UID** so threads can be looked up; message-focus UI (focus mode) to be designed later — controls in place now.
- **User identity:** User **handle/nickname** (editable) used in messaging and conversations; display in activity/comments; @-mentions later.

---

## Block A — Schema & linking (foundation)

- [ ] **Task start date:** Add `start_date` (DATE, nullable) to `tasks`. Migration; update RPC/types; task forms and list/detail.
- [ ] **Activity stream ↔ task thread:** Add `task_id` (UUID, nullable, FK → tasks) to `crm_notes`. Index. Migration; update RPC (e.g. get_contact_notes_dynamic or new get_notes_by_task_dynamic). Comment: note tied to task (support ticket thread).
- [ ] **Message conversation UID:** Add `conversation_uid` (TEXT or UUID, nullable) to `crm_notes`. For note_type = 'message', same UID links messages into one thread; entire conversation can be looked up by this UID. Migration; index; RPC/API return this field.
- [ ] **Time tracking schema:** Add table `task_time_logs` (id, task_id FK, user_id nullable, contact_id nullable, log_date DATE, minutes INTEGER, note TEXT, created_at). Migration; RLS; indexes.
- [ ] **Project phases:** Use task taxonomy (categories) as phases. Ensure task list/detail and project task list filter and group by taxonomy category; phase names = user-defined category names.
- [ ] **Invoices ↔ project:** Add `project_id` (nullable FK → projects) to `invoices`. Migration; index. When invoice is paid and order is created, copy project_id to that order so project total (sum of orders) includes it.

---

## Block B — User handle (nickname)

- [ ] **User handle column:** Add `handle` (TEXT, unique per tenant or app) to profile — e.g. tenant_users, profiles, or user_metadata. Migration if new column.
- [ ] **Handle generation & edit:** Auto-generate handle (e.g. last name + numeric suffix) for new users; editable in profile/settings. Used as display in comments/messages.
- [ ] **Display in activity/comments:** Show handle (fallback to email or "User") in task threads, member activity stream, and blog comments where author is a user.

---

## Block C — Task comment thread (activity stream)

- [ ] **Create note with task_id:** Extend createNote and API to accept `task_id`; when set, note is part of that task's thread. Enforce visibility: only users/contacts who can see the task can create or read task-scoped notes.
- [ ] **Get thread for task:** API (e.g. GET /api/tasks/[id]/notes or activity) returns notes where task_id = X, ordered by created_at, with author handle. Enforce task visibility.
- [ ] **Task detail UI — thread:** On task detail (admin and member), show comment thread; "Add reply" creates note with task_id and parent_note_id. Display handle.
- [ ] **Activity stream inclusion:** Extend getMemberActivity (and dashboard if desired) so notes with task_id in "tasks I'm on" appear in my activity; filter by type so stream can show task comments without duplicating general DMs.

---

## Block D — Conversation UID and message controls

- [ ] **Set conversation_uid on new message:** When creating a note with note_type = 'message', set or inherit conversation_uid (new thread = new UID; reply = same UID as parent). API and createNote support.
- [ ] **Get messages by conversation_uid:** API or RPC to return all notes (message type) with a given conversation_uid for full thread lookup. Used later for message-focus UI.
- [ ] **Activity type filter:** Ensure activity stream filter includes "Messages"; support filtering to message type only (foundation for "focus mode" UI to be designed later).

---

## Block E — Project Transactions tab

- [ ] **Project detail — Transactions tab:** New tab on project detail: list orders where project_id = this project and invoices where project_id = this project (merged list). Read-only with link to order/invoice detail.
- [ ] **Project total:** Display sum of orders.total where project_id = this project (exclude invoice amounts to avoid double-counting).
- [ ] **Link transaction to project:** From project Transactions tab or from order/invoice detail, allow setting/clearing project_id. When creating order from paid invoice, copy project_id from invoice to order.

---

## Block F — Sidebar: Activities

- [ ] **Replace Calendar with Activities:** New top-level sidebar section "Activities." Under it: Events (calendar), Projects, Resources. Update sidebar-config and Sidebar component.
- [ ] **Feature gating & roles:** Update feature registry and roles for Activities (Events, Projects, Resources); ensure Calendar is no longer top-level.

---

## Block G — Time tracking (task-level)

- [ ] **Time log API:** Create/list/update/delete time log entries for a task (authorized by task visibility). Task total = sum of minutes; optionally sync to tasks.actual_time or display only.
- [ ] **Task detail — time logs UI:** Add/edit time log (date, minutes, optional note). Show total time on task; project detail shows rolled-up total from all tasks.
- [ ] **Exclude from activity stream:** Time log entries do not create activity stream items; only significant task/project state changes (e.g. task completed) go to stream.

---

## Block H — Priority & project types (visual)

- [ ] **Task priority colors:** Add color mapping for priority (e.g. high=red). Task list and detail show color chip/label. (Optional: expand to 5 levels later.)
- [ ] **Project types (taxonomy) color chips:** Add optional color to taxonomy terms for project types (Projects section). Projects list shows color chip per project type. Document: extend to other taxonomy sections later if desired.

---

## Block I — Custom view presets (optional)

- [ ] **Schema for presets:** Table user_view_presets (user_id, view_type 'projects'|'tasks', name, payload JSON). Migration; RLS.
- [ ] **API:** List/create/update/delete presets per user and view_type.
- [ ] **UI:** Projects list and tasks list: dropdown "View: [preset]"; "Save current view"; "Manage presets."

---

## Block J — Activity stream: task state changes

- [ ] **Log task state changes:** When task status (or other key fields) changes, create activity stream entry (e.g. note type task_status_change or event) so stream shows "Task X marked done" etc., without cluttering with time logs.

---

## Block K — Existing Phase 19 items (unchanged)

Keep these in planlog as-is; sessionlog "Next up" can reference them:

- [ ] Admin UI — time tracking (proposed_time, actual_time; punch-style optional)
- [ ] Integration — activity stream (log task/project events; filter by MAG)
- [ ] Integration — support tickets (GPUM submit ticket; perpetual Support project)
- [ ] Integration — e-commerce (project_id on orders; project detail linked orders) — *covered in Block E*
- [ ] Integration — calendar (event project_id; project detail linked events)
- [ ] Member area (GPUM): Projects, Support Tickets, Tasks
- [ ] Feature registry, sidebar gating & roles for projects

---

## Suggested order for implementation

1. Block A (schema: task start_date, task_id on crm_notes, conversation_uid, task_time_logs, project_id on invoices)
2. Block B (user handle)
3. Block C (task thread create/get and UI)
4. Block D (conversation_uid on messages; get by conversation_uid; message filter)
5. Block E (Project Transactions tab + total + link)
6. Block F (Sidebar Activities)
7. Block G (time tracking)
8. Block H (priority/type colors)
9. Block I (view presets — optional)
10. Block J (task state in activity stream)
11. Block K remaining (support tickets, member area, feature registry)

---

## Summary for sessionlog "Next up"

After review, the sessionlog "Next up" can list in order:

- Block A steps (schema)
- Block B (user handle)
- Block C (task thread)
- Block D (conversation UID / message controls)
- Block E (Project Transactions tab)
- Block F (Sidebar Activities)
- Block G (time tracking)
- Block H (colors)
- Block I (presets — optional)
- Block J (task state changes)
- Block K (support tickets, member area, feature registry)

---

*End of draft. Review and approve before adding to planlog.md and sessionlog.md.*
