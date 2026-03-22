# Session Log

**Purpose:** Handoff + **working checklist** for the current sprint chunk.

**Workflow:** See **`.cursor/rules/sessions.mdc`** — **Verbatim chunk rule:** copy checkbox blocks from [planlog.md](./planlog.md) into **Next up**; check off here **and** the matching lines in planlog; session end → changelog, trim completed lines from this chunk.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Performance:** [prd.md](./prd.md), [planlog.md](./planlog.md).

---

## Next up

**Current focus:** **Task UI — Resources bento MVP** on task detail/edit: `task_resources` + minimal list/assign from **`resources`** (Phase 21). See [changelog 2026-03-21 22:06 CT](./changelog.md) **Context for Next Session** and [planlog](./planlog.md) Phase 21 (**MVP — Task UI Resources bento tile**). Task assignees Directory wiring is checked off in planlog Phase 18C.

**Active chunk — verbatim from [planlog](./planlog.md) Phase 18C (keep checkboxes in sync with planlog):**

### Phase 18C: Directory (unified picker) & Messages / notifications

**Status:** Planned — **prerequisite** before deepening Tasks/Projects UX (task detail polish, cross-module assignees, **task comments / threads** that would otherwise keep overloading `crm_notes`). Spec alignment: [prd.md — Shared identity UX (forks)](./prd.md#shared-identity-ux-forks) (auth unchanged). **No CRM history backfill required in dev** unless desired later.

**Directory (read model for pickers)** — SSOT remains `crm_contacts`, `members`, `auth.users` / team; Directory is **not** a second writable identity store.

- [x] **Design lock:** Document in [prd-technical.md](./prd-technical.md) — **§ Phase 18C** (Directory row shape, sources, dedup, security).
- [x] **Implementation:** Migration **`188_directory_search_rpc.sql`** — `get_directory_search_dynamic`; `src/lib/supabase/directory.ts`; **`GET /api/directory`**. Run **188** in SQL Editor.
- [x] **Wire pickers — Events:** `EventParticipantsResourcesTab` → `/api/directory`.
- [ ] **Wire pickers — Projects / Tasks:** Project members, task assignees / followers → Directory API.
- [ ] **Performance:** Indexes on underlying tables; avoid N+1; document cost in planlog Performance note if hot path.
- [ ] **Fork note:** Custom pickers must not drop enumeration-safe patterns from PRD (Directory is admin/authenticated use).

**Messages & notifications (two logical stores, one UI tab)** — GPUM and admin both use a single **“Messages and notifications”** surface; merged API normalizes rows. Internal CRM-only notes may remain **`crm_notes`** or move to timeline with `visibility = admin_only` (see design lock).

- [x] **Design lock (prd-technical):** [§ Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging) — table roles, column lists, enums (`kind`, `visibility`, `thread_type`), UI filter mapping, MAG rules, pruning/idempotency, RLS requirements, cutover vs `crm_notes`, edge-case defaults.
- [x] **Schema — contact notifications timeline:** Tenant table **`contact_notifications_timeline`** — migration **`190_contact_notifications_timeline.sql`** (`recipient_user_id`, indexes, partial unique `source_event`). **Run in Supabase SQL Editor** per tenant DB after 189. (Name avoids confusion with calendar `events`.)
- [x] **Schema — threads:** **`conversation_threads`**, **`thread_messages`**, **`thread_participants`** — migration **`191_conversation_threads_and_messages.sql`**. **Run in SQL Editor** after 190.
- [x] **RLS (v1 in migrations):** Tables enabled with **authenticated** full-access policies + grants (matches legacy tenant CRM pattern). **GPUM must not see `admin_only` timeline rows** — enforce in **API / routes** (see §18C.7); tighten policies in a follow-up migration if desired.
- [x] **Write path — prove (v1):** Authenticated **POST** `/api/crm/contacts/[id]/notifications-timeline` inserts timeline rows (`staff_note`, etc.); **POST** `/api/conversation-threads` (+ optional `first_message`) and **POST** `.../[threadId]/messages` for threads. Lib: `contact-notifications-timeline.ts`, `conversation-threads.ts`.
- [ ] **Read APIs:** **GET** notifications-timeline + thread messages **done** for admin; still need merged **stream** for GPUM + **Messages and notifications** tab (`UNION`/sort), cursors, and **visibility** filtering for GPUM routes.
- [ ] **UI — contact detail:** **v1 shipped:** `ContactNotificationsTimelineSection` on Notes tab. **Remaining:** merge/filters/deep links.
- [ ] **UI — Messages and notifications:** Single tab GPUM + admin; filters (transactions vs messages, etc.); thread drill-in for task/support/DM/MAG.
- [ ] **Cutover (dev):** New writes to new tables; stop growing `crm_notes` for types you migrate (messages, duplicate system events); **reconcile** Phase 19 bullets that add `task_id` / `conversation_uid` on `crm_notes` — prefer new thread table or dual-write during transition (document choice in prd-technical).
- [ ] **Edge cases checklist (document decisions):** Leave MAG → lose group thread access? Guest blog comment authors; read receipts (`last_read_at` on participants); admin system-wide feed for superadmin.

**Then (not verbatim — see planlog):** Task **detail** / task UI polish; migration **187** applied this tenant (re-run other schemas as needed). Phase 00 shared identity UX copy/emails; other backlog → [planlog](./planlog.md).

---

## Backlog (full steps in planlog)

| Track | Where |
|--------|--------|
| Calendar — reminders, ICS, cron | planlog **Phase 20** |
| Resources — after migration **183** | planlog **Phase 21** |
| Site visitor analytics | planlog / future |
| Pre-fork — security + fork checklist | planlog |

---

## Reference

- **Technical spec (Phase 18C):** [prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging)
- **Tasks:** Customizer slugs + migration **187**; **Resources:** migration **183** (usage UI open)
- **Support (GPUM):** Perpetual Support project; **Threading (today):** `crm_notes` + `conversation_uid` / `task_id`
- **Paused:** GPUM member Projects/Support/Tasks UI — planlog Phase 19
