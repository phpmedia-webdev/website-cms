# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

**CRM Contacts List** — Pagination, selection, bulk actions, and trash. See **CRM Contacts List — implementation steps** below. (Event Calendar is at a good stopping point; see Context for Next Session for handoff.)

---

## Context for Next Session (handoff for another machine)

- **Repo:** website-cms. Use **pnpm** (not npm). Dev server: `pnpm run dev` (port 3000).
- **Next session:** Start with **CRM Contacts List — implementation steps** (below). Implement in order: pagination → selection → bulk action bar → bulk actions → trash/backend.
- **Calendar (reference):** Admin calendar at `/admin/events`; public at /events; ICS feed. Resources CRUD at /admin/events/resources. See [changelog.md](./changelog.md) for full handoff.
- **Key paths for CRM:** `src/app/admin/crm/contacts/ContactsListClient.tsx`, `page.tsx`, `src/lib/supabase/crm.ts`. No RLS or DB left in a vulnerable state.

---

## Calendar — Next up (when resuming)

- [x] 1. **Resources CRUD (24)** — Page exists; polish/discoverability if needed.
- [x] 2. **Conflict check (14–17)** — Optional double-booking warning.
- [n/a] 3. **Event status / cancelled (33)** — Optional.
- [x] 4. **Event detail drawer/modal (23)** — Optional.
- [n/a] 5. **Deferred:** Feature guard (32) — with other sidebar updates.

**Reference:** Full checklist → [planlog.md](./planlog.md).

---

## My View (calendar) — implementation steps

**Goal:** Toggle in calendar header (centered). When on, show only events where the logged-in user is a participant (`team_member:<userId>`). Master first filter; other filters drill down. Reset does not change the toggle.

- [x] **1.** Current user on client: ensure EventsPageClient (or layout) has current user id for `team_member:<userId>`.
- [x] **2.** State + filter: add `myViewEnabled` (default false); in filteredEvents apply My View first (events where eventParticipantMap has `team_member:<currentUserId>` for real event id), then existing filters. Use consistent composite participant id format.
- [x] **3.** Load eventParticipantMap when myViewEnabled is true (even if no other participant/resource filters).
- [x] **4.** Header: add centered "My View" toggle (Switch + label) in calendar page header between title and Add Event.
- [x] **5.** Reset / hasFilters: do not clear or include myViewEnabled.
- [x] **6.** Empty state: when My View on and no events, show "No events where you're a participant" (or similar).
- [x] **7.** Edge cases: hide/disable toggle if no user; empty state when user has no events.
- [x] **8.** Test: toggle on/off, Reset, recurring, other filters.

---

## CRM Contacts List — implementation steps

**Goal:** Pagination, row selection, bulk action bar, and trash (soft delete + restore + purge). Selection persists until user cycles “Check all”; same selection remains after each bulk action.

### Pagination
- [ ] **1.** Add `pageSize` (25 | 50 | 100), default 25; `currentPage` (1-based). Slice `filteredContacts` for current page; clamp page when filters shrink list; reset to page 1 when filters or page size change.
- [ ] **2.** Footer layout: **Left** = page size dropdown (25, 50, 100); **Center** = page navigation (Prev/Next, “Showing X–Y of Z”); **Right** = contact count. Table body renders paginated slice only.

### Selection
- [ ] **3.** Checkbox column on far left; row click still opens contact (checkbox `stopPropagation`). State: `selectedIds` (e.g. `Set<string>`).
- [ ] **4.** Header “Check all”: first click = select all filtered; second click = unselect all (cycle). Optional: indeterminate when only some filtered selected. **Do not** clear selection after a bulk action; clear only when user cycles Check all.
- [ ] **5.** Later (if needed): “Check all” = all filtered across pages → may need API (IDs for current filter) when list is large.

### Bulk action bar
- [ ] **6.** Bulk action dropdown to the **right of the search field**. Ghosted/disabled when no selection; enabled when ≥1 selected. Single dropdown listing all bulk actions.

### Bulk actions (in dropdown)
- [ ] **7.** **Export** — Selected contacts (e.g. CSV).
- [ ] **8.** **Add to list** — Picker for marketing list; add selected to list.
- [ ] **9.** **Remove from list** — Remove selected from a chosen list (if supported).
- [ ] **10.** **Change status** — Set status (Active, Inactive, Lead, etc.) for selected.
- [ ] **11.** **Taxonomy** — Single term per operation: user picks **one** category **or** one tag; operation = **“Add to”** or **“Remove from”** selected contacts (no multi-select of categories/tags; guardrail).
- [ ] **12.** **Delete** — Soft delete: move selected to trashed state (recoverable).
- [ ] **13.** **Restore** — Un-trash selected (when “Show Trashed” is on and trashed are visible).
- [ ] **14.** **Empty trash** — Purge **all** trashed contacts (no selection). Always in dropdown; **disabled when there are no trashed contacts**. Confirmation dialog with **dire warning**: permanent, no recovery.

### Trash behavior
- [ ] **15.** Trashed contacts **hidden by default**. Add **“Show Trashed”** filter (toggle or chip) to show trashed. Soft delete = set trashed state (e.g. `deleted_at` or `status = 'trashed'`); Restore clears it. Empty trash = permanent purge with dire warning.

### Backend / data
- [ ] **16.** DB: add trashed state (e.g. `deleted_at` on contacts table or equivalent); RLS and queries exclude trashed unless “Show Trashed” filter is applied. APIs for bulk: export (IDs), add/remove list, change status, taxonomy add/remove, soft delete, restore, purge all trashed.

---

## Next up (ideas)

- [ ] **CRM: Import and export** — Import/export for CRM (e.g. use twidget.io for list building, or build and email to user). Field mapping for import/export.
- [ ] **Emailer: Node.js built-in** — Implement built-in email tool for sending email messages (export is ready to download).

---

## Paused / Later

- **Phase 12** AnyChat (12B), Marketing/Vbout (12A) — after calendar.

---

## Backlog

Video embed; local copy; FAQ block; Phase 00; color palette; automations; CRM pagination. See planlog.

---

See changelog **"Context for Next Session"** for handoff.
