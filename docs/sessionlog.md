# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus
- [ ] **Next up:** Optional dashboard tweaks (Media total storage; aggregate content characters). Integration work (Anychat push to CRM, VBout sync) and other items in Paused / Later.
- [x] **Activity Stream (per contact)** — Extended to include:
  - [x] Form submissions: “Submitted [Form name]” with submitted_at (add getFormSubmissionsByContactId)
  - [x] Contact added: one line from contact.created_at (“Contact added”)
  - [x] MAG assignments: “Added to [MAG name]” with assigned_at (from getContactMags)
  - [x] Marketing list joins: “Added to list [name]” if join table has a date
- [x] **CRM sidebar badge + bulk actions** — After bulk action (e.g. status change) or bulk import, sidebar “New” count did not update. Add refresh/event so badge refetches; after import success, refresh and navigate to contacts list.
- [x] **Admin dashboard restructure** — (1) Metric blocks at top. (2) Default tab: combined activity stream with filter options. (3) Tab for existing RAG details.
  - **Done:** Total Contacts · Form submissions (24h, 7d, 30d, all time) · Content items · Media count · Events (total + top by event_type). Tabs: Activity (default) | RAG.


---

## Paused / Later

- [ ] **Emailer: Node.js built-in** — Implement built-in email tool for sending email messages (export is ready to download).
- [ ] **Phase 12** AnyChat (12B), Marketing/Vbout (12A)
- [ ] **VBout Integration** Create API routes to VBout with CRM data.
- [ ] **CRM bulk action item to merge contacts**
- [ ] **Terms and Policys manager** External application but needs a link (always a custom update per tenant)
---


