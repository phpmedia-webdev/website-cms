# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

**Event Calendar (Events module)** — Build the calendar and events API per PRD. Required before AnyChat appointments can be integrated; AnyChat has a booking feature that will rely on our calendar/API. Phase 09 (ProtectedContent) and Phase 9E (Gallery external video) remain deferred until dev launch.

---

## Calendar Module — Step-by-Step Development Plan

Based on session discussion: events as containers, participants (CRM + Team), resources (rooms, equipment, video), recurrence (RRULE, expand on fly), access control, taxonomy, custom fields, conflict checks on participant/resource assignment.

**Architecture notes:**
- **One calendar** — Events are primary; participants and resources are assigned TO events (via junctions). No separate per-person or per-resource calendars.
- **View switching** — Filter the same event data: Event view (default), Person view (filter by participant), Resource view (filter by resource). Optionally: react-big-calendar resource lanes (rows per room/person).

### Phase A: Schema & Core

- [x] 1. **Events table migration**
   - Core fields: title, start_date, end_date (UTC), timezone, location, description
   - recurrence_rule (RRULE, null = one-off), is_all_day
   - access_level (public | members | mag | private), required_mag_id, visibility
   - event_type (optional: public | meeting | booking), status (draft | published | cancelled)
- [x] 2. **event_exceptions table** — Override or delete single recurring occurrence (recurrence_id, occurrence_date, type, override_data)
- [x] 3. **participants table** — Bookable people; source_type (crm_contact | team_member), source_id; links to CRM contacts and Team
- [x] 4. **event_participants junction** — event_id, participant_id
- [x] 5. **resources table** — name, type (room | equipment | video), metadata JSONB, is_exclusive (default true)
- [x] 6. **event_resources junction** — event_id, resource_id
- [x] 7. **Extend taxonomy_relationships** — Support content_type = 'event' for categories/tags
- [ ] 8. **event_custom_fields + event_custom_field_values** (optional, can defer) — Tenant-defined custom fields per event type

### Phase B: Events API

- [ ] 9. **GET /api/events** — List events in date range; expand recurring on fly (rrule.js); filter by access (getMagUidsForCurrentUser)
- [x] 10. **GET /api/events/[id]** — Single event (or occurrence); access check
- [x] 11. **POST /api/events** — Create event; validate; no conflict check for event itself
- [x] 12. **PUT /api/events/[id]** — Update event; handle recurrence edits (this only vs this and future)
- [x] 13. **DELETE /api/events/[id]** — Delete; handle recurrence deletes
- [ ] 14. **Conflict check utility** — checkParticipantConflict, checkResourceConflict; call when assigning participant/resource; warn or block
- [ ] 15. **POST /api/events/[id]/participants** — Assign participant; run conflict check
- [ ] 16. **POST /api/events/[id]/resources** — Assign resource; run conflict check
- [ ] 17. **External participant flow** — Add by email → create/match CRM contact "External Participant"; assign as participant

### Phase C: Admin Calendar UI

- [x] 18. **Install react-big-calendar** (or shadcn-ui-big-calendar); date-fns localizer; style with design system CSS variables
- [x] 19. **Admin route /admin/events** — Calendar page with month/week/day/agenda view toggle
- [x] 20. **Event create/edit form** — Title, dates (UTC + timezone), is_all_day, location, description, recurrence (RRULE builder or simple preset), access_level, required_mag_id, visibility, status. **Public vs Internal selector**: single choice (radio or toggle); Public = shows on public calendar; Internal = admin only; maps to event_type (public | meeting/booking)
- [ ] 21. **Participant picker** — Search-based (combobox or modal), not plain dropdown; scales to hundreds of contacts/team members; assign; show conflict warning if overlap
- [ ] 22. **Resource picker** — Same search/combobox pattern (or dropdown if list small); assign; show conflict warning if overlap
- [ ] 23. **Event detail drawer/modal** — View event, edit, delete; list participants and resources

### Phase D: Participants & Resources Admin

- [ ] 24. **Resources CRUD** — Resource table editor; add/edit/delete rooms, equipment, video links. Sub-link under Calendar in sidebar (e.g. /admin/events/resources)
- [ ] 25. **Participants** — Pull from CRM contacts + Team; no separate registry needed if we resolve from both at assignment time (or add participants table as unified roster)

### Phase E: Public Calendar & ICS

- [ ] 26. **Public route /events** — Calendar component; fetch from GET /api/events; **only event_type='public'**; filter by access; no participants/resources shown
- [ ] 27. **Style public calendar** — Design system colors, fonts; multi-day events as banner in all-day row
- [ ] 28. **GET /api/events/ics** — ICS subscription feed; public events only for MVP
- [ ] 29. **Event detail view (public)** — Modal or sub-page for single event when clicked

### Phase F: Taxonomy & Polish

- [x] 30. **Taxonomy assignment** — Event form: categories/tags picker; wire taxonomy_relationships for content_type='event'
- [x] 31. **Calendar filter** — Filter by category/tag/memberships on admin calendar. **Public/Internal filter**: checkboxes (Public, Internal); both checked by default; filters by event_type
- [ ] 32. **Feature guard** — Add Events to sidebar; gate by tenant feature
- [ ] 33. **Event status** — Cancelled events release participant/resource holds; exclude from public feed

---

## Version Marking & Modular Organization (Post-Calendar)

**Goal:** Option A (comment headers) for module versioning; organize code by feature so forks can compare and selectively sync. Do after Calendar module.

1. **Create `src/module-versions.json` manifest** — Single source: `{ "crm": "1.2", "membership": "2.0", "calendar": "1.0", ... }`; bump when releasing changes
2. **Add comment headers to main module files** — Format: `// @module <name> @version <semver>` in key files (crm.ts, galleries-server.ts, content-protection.ts, events.ts, etc.)
3. **Align code to feature boundaries** — Ensure routes/components/lib match prd-technical Feature → paths map; document deviations
4. **Version extraction script** — Script to extract @module/@version (grep or parser); optional: compare fork vs template
5. **Document versioning workflow** — When to bump; how to compare fork vs template; add to prd-technical or session docs

**Modules:** Content, CRM, Media, Galleries, Forms, Settings, Auth/MFA, Superadmin, Membership, Calendar

---

## Next up

**Calendar (in order):** Feature guard (32) → Public vs Internal form control (20) + calendar filter (31) → Public calendar/ICS (26–29) → Resources CRUD (24) → Participant/Resource pickers (21–22) → Recurring events (9) → Conflict checks (14–17). See changelog "Context for Next Session" for handoff from this session.

---

## Paused / Later

- **Phase 12** AnyChat (12B) and Marketing/Vbout (12A) — paused; resume after calendar is in place.

---

## Backlog

Video embed component; local copy workflow; FAQ block; Phase 00 (template domain, site URL, setup script, AAL, MFA); color palette refactor; automations; CRM contacts pagination. See planlog.

---

See changelog **"Context for Next Session"** for handoff.
