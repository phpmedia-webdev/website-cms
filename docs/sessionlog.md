# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

**Event Calendar** — Calendar module is at a good stopping point (admin + public + ICS done). Next session can continue on this machine or another; see **Context for Next Session** below and in changelog.

---

## Context for Next Session (handoff for another machine)

- **Repo:** website-cms. Use **pnpm** (not npm). Dev server: `pnpm run dev` (port 3000).
- **Calendar module state:** Admin calendar at `/admin/events` (month/week/day/agenda), event CRUD, recurrence, delete with past preserved, taxonomy, one-step create (taxonomy + participants + resources on new events), filters (search, categories, tags, memberships, public/internal, participants, resources). Resource filter works for recurring events (real event ID used for assignments lookup). Resources CRUD at `/admin/events/resources`. Public calendar at **/events** (public layout); nav link "Events" in header. Public events = `access_level=public`, `visibility=public`, `status=published` (no membership, not hidden). ICS feed: **GET /api/events/ics** (same filter). Event detail: click event → modal; "Subscribe to calendar" links to ICS URL.
- **Key paths:** `src/app/admin/events/`, `src/app/(public)/events/`, `src/app/api/events/` (public, public/[id], ics), `src/components/events/`, `src/lib/supabase/events.ts` (`getPublicEvents`, `isPublicEvent`), `src/lib/recurrence.ts` (`eventIdForEdit`).
- **Docs:** [planlog.md](./planlog.md) — Calendar event detail (one-step create) steps 1–4 done; Step 5 (testing/docs) optional. [changelog.md](./changelog.md) — latest entry has full context.
- **Next up (optional):** Resources CRUD polish, conflict check (14–17), Step 5 testing/docs. Feature guard (32) deferred to sidebar work. No RLS or DB left in a vulnerable state.

---

## Calendar — Next up (when resuming)

1. **Resources CRUD (24)** — Page exists; polish/discoverability if needed.
2. **Conflict check (14–17)** — Optional double-booking warning.
3. **Event status / cancelled (33)** — Optional.
4. **Event detail drawer/modal (23)** — Optional.
5. **Deferred:** Feature guard (32) — with other sidebar updates.

**Reference:** Full checklist → [planlog.md](./planlog.md).

---

## Next up (ideas)

- [ ] **Calendar: "My View"** — Quick filter that auto-filters events to show only events for the logged-in user (e.g. events where I'm a participant).
- [ ] **CRM: Bulk operations** — Bulk select contacts; add to list, membership, or taxonomy. Bulk select and delete; bulk export.
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
