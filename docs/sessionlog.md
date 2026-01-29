# Session Log

**Purpose:** Active, focused session continuity. Not a living document — kept lean.

**Workflow:**
- **Session start:** Developer announces "start of work session." Open `sessionlog.md`; use **Next up** and **Context** to pick up where you left off.
- **Session end:** Developer announces "end of work session."
  1. Check off any completed `sessionlog` items.
  2. Sync those completions to `planlog.md` (check off corresponding items).
  3. **Delete** those items from `sessionlog.md` to keep it lean.
  4. Add **session context** (what was done, even if incomplete) to `changelog.md` — "Context for Next Session" in the new entry.
- **Abrupt stop:** Same as session end. Update `sessionlog`, sync `planlog`, prune `sessionlog`, add `changelog` context so the next session can continue.

---

## Current Focus

**CRM, Forms, Memberships** — Development plan below. Reference: `docs/prd.md` (CRM Module), `docs/planlog.md` (Phase 07, 08, 09). Sidebar: **CRM** → Contacts, Forms, Memberships, Marketing. No separate Members route; membership links managed on contact detail. Contacts list filter by membership(s); Memberships page = list MAGs by title, select one, list contacts in that MAG. **Taxonomy:** CRM section is a staple section; contact **categories and tags** use the app taxonomy only (`taxonomy_relationships` with `content_type = 'crm_contact'`, `content_id = contact.id`) — no `tags TEXT[]` on contact. **Notes:** Relational notes log only — `crm_notes` table (contact_id, body, author, created_at, etc.); no `notes TEXT` column on `crm_contacts`. Membership via separate tables (MAGs, contact–MAG junction); no tag sync. New tables need RPCs for reads (prd-technical).

---

## Completed (this session / evaluation)

- **Sidebar badge** – Red counter on CRM section header for contacts with status "New" (slug `new`). API `GET /api/crm/contacts/new-count`; badge refreshes on pathname change and window focus.
- **Fixed "New" status** – Status slug `new` is non-deletable and slug read-only in Settings → CRM (required for badge). `setCrmContactStatuses` always re-adds "new" if missing; `CRM_STATUS_SLUG_NEW` in settings + crm.ts.
- **Contact detail: status on Taxonomy card** – Status selector at top of Taxonomy card; existing Save button persists status then taxonomy; `router.refresh()` after save so Contact card badge updates immediately.
- **Contact list** – Columns: Last name, First name, Email, Phone, Status, Updated; sorted by last name (then first name, email). Whole row clickable to view contact (keyboard Enter/Space, aria-label).
- **Form submission API & submissions view** – `POST /api/forms/[formId]/submit` (validate, match/create/update contact, fill-in-blanks, append message); `form_submissions` table (066); `/admin/crm/forms/submissions` list + filter by form. New contacts get status from picklist (first or "new").

---

## Next Up

### 0. Taxonomy staple sections (template defaults)

- [x] **Staple sections (migration)** – Migration `051_staple_taxonomy_sections.sql`: add `is_staple` to `section_taxonomy_config`, seed 9 sections (article, crm, image, page, portfolio, post, snippet, quote, video) with `is_staple = true`. Done.
- [x] **Staple sections (guard + UI)** – Migration `051b`: RPC returns `is_staple`; DB trigger prevents DELETE when `is_staple = true`. UI: delete button disabled + ghosted (opacity) for staple sections; alert if user tries. Done.
- [x] **UI: Sections table** – Ghost the trashcan/delete icon for staple sections (disabled, opacity, tooltip "Template sections cannot be removed"). Done.

### 1. CRM schema and backend (Phase 07 foundation)

- [x] **Migration 052** – CRM tables in client schema: `crm_contacts` (staple fields only — id, email, phone, first_name, last_name, full_name, company, address, city, state, postal_code, country, status, dnd_status, source, form_id, external_crm_id, external_crm_synced_at, created_at, updated_at; **no** `notes` column, **no** `tags` array); `crm_notes` (notes log: contact_id, body, author_id, created_at, optional type); `crm_custom_fields`, `crm_contact_custom_fields`, `crm_contact_mags`, `crm_consents`, `forms` registry. Contact categories/tags via `taxonomy_relationships` only (`content_type = 'crm_contact'`, `content_id = contact.id`). Indexes for email, status, mag_id. Done.
- [x] **Migration 053** – CRM RPCs in `public` (e.g. `get_contacts_dynamic`, `get_contact_by_id_dynamic`) per prd-technical; grant execute. Done.
- [x] **`src/lib/supabase/crm.ts`** – getContacts, getContactById, createContact, updateContact; getForms, getMags, getContactNotes, getCrmCustomFields, getContactCustomFields, getContactMags. Use RPC for reads. Done.
- [x] **API routes** – `GET/POST /api/crm/contacts`, `GET/PUT /api/crm/contacts/[id]`. Done.

### 2. CRM UI – Contacts

- [x] **Sidebar: Superadmin** – Superadmin link last at bottom of nav; hidden for non-superadmin users.
- [x] **Sidebar** – CRM parent with sub-links: Contacts, Forms, Memberships, Marketing, Lists (no Members route). Routes: `/admin/crm/contacts`, `/admin/crm/contacts/[id]`, `/admin/crm/contacts/new`, `/admin/crm/contacts/[id]/edit`. CRM sidebar default opens Contacts list. Done.
- [x] **Contacts list** – `/admin/crm/contacts`: table (name, email, phone, status, updated); link row → contact detail; New contact → `/admin/crm/contacts/new`. Search bar (name, email, phone, membership, list) + filter dropdowns (membership, list, category, tag). Done.
- [x] **Contact detail** – `/admin/crm/contacts/[id]`: standard fields (Contact card), Taxonomy card (categories & tags, section "crm"), Notes block with add/edit/delete modal + search, accordion sections (Custom Fields, Marketing Lists, Membership Access Groups). UI tightened. Done.
- [x] **Notes** – Add/edit/delete via modal; note types configurable via Settings → CRM. Migrations 057 (updated_at column), 058 (RPC update). Done.
- [x] **CRM Settings** – `/admin/settings/crm`: manage note types. Done.

### 2b. Contact Status picklist (Settings > CRM)

*Not yet implemented. Discussed: status should be a managed picklist like Note Types, with sort order and color per status. Steps below in implementation order.*

**Discussion:**
- **Current:** Contact status is hardcoded (`new` | `contacted` | `archived`) in DB CHECK and in UI.
- **Target:** Status values come from a configurable picklist in Settings → CRM, similar to Note Types: add/edit/delete, **sort order** (up/down), plus **color per status** for badge display.
- **Storage:** Settings table, key `crm.contact_statuses` — array of `{ slug, label, color }`. Slug is stored on `crm_contacts.status`; label for display; color for badges (e.g. hex or Tailwind). Same pattern as Note Types (settings, not a new table).
- **DB:** `crm_contacts.status` today has CHECK (status IN ('new', 'contacted', 'archived')). We must **drop that constraint** so status can be any text; app validates against picklist. Default for new contacts = first status in list.
- **Settings > CRM layout:** Option A — Add a second Card on the same page ("Note Types" + "Contact Statuses"). Option B — Sidebar to switch "Note Types" | "Contact Statuses". Recommend starting with Option A (two cards); refactor to sidebar later if more CRM sections are added.
- **Orphaned values:** If a contact’s status is removed from the picklist, show raw value with a neutral/muted badge.

**Implementation steps (in order):**
- [x] 1. Settings API & types – `getCrmContactStatuses()`, `setCrmContactStatuses()`, key `crm.contact_statuses`; default seed. Done.
- [x] 2. Migration 065 – Drop CHECK on `crm_contacts.status`. Done.
- [x] 3. API GET/PUT `/api/settings/crm/contact-statuses`. Done.
- [x] 4. Settings > CRM UI – Contact Statuses card **first**, then Note Types; slug, label, color picker, sort, add/remove, save. Done.
- [x] 5. Contact list – Status filter + badge color from picklist. Done.
- [x] 6. Contact detail – Status badge uses picklist color. Done.
- [x] 7. Contact edit / new – Status dropdown from picklist; new contact default = first in list. Done.
- [x] 8. Form submission – Form submit API sets new contact status from picklist; submissions view at `/admin/crm/forms/submissions`. Done.

### 3. Forms (Phase 08)

- [x] **Assign form fields to form** – Done. `form_fields` table (061), RPC (062); core + custom fields in form modal; add/remove/reorder, required; PATCH with `field_assignments`; GET `/api/crm/forms/[id]/fields`. Message = core field.
- [ ] **Filter by form on contact Custom Fields tab (later)** – On contact detail, Custom Fields accordion: add form filter (All | Contact’s form | specific form). Show only fields assigned to selected form. Persist filter in sessionStorage (or localStorage) for work sessions. Depends on “Assign form fields to form” being done.
- [x] **`POST /api/forms/[formId]/submit`** – Done. Validate payload; submissions table (066); match by email; new contact = map fields + status from picklist; existing = fill-in-blanks + append message. Insert submission; create/update contact. (“fill in blanks”).
- [x] **Form submissions view** – Done. `/admin/crm/forms/submissions` lists all submissions; filter by form; link to contact. Sidebar: CRM → Form submissions.

### 4. Memberships (Phase 09 – under CRM, no separate Members route)

- [ ] **MAG tables** – Already in 052: `mags`, `crm_contact_mags`. Expand if needed (e.g. `members`, `user_mags` for logged-in member accounts later). Content protection columns on `content` and galleries. Client schema.
- [ ] **MAG RPCs** – get_mags_dynamic exists (053); add get_mag_by_id_dynamic, get_contacts_by_mag_dynamic (contacts in a MAG) if needed.
- [ ] **`src/lib/supabase/mags.ts`** – getMAGs, getMagById, getContactsByMag (contacts in a MAG); assign/remove MAG on contact (contact detail).
- [ ] **Admin: Memberships** – `/admin/crm/memberships`: view memberships by title; select a Membership (MAG) and recursively list the contacts (members) in that membership. List/create/edit MAGs (name, UID, description). No separate Members route.
- [x] **Contacts list** – Filter by membership(s): show contacts that have selected MAG(s). Done (via dropdown filter).
- [x] **Contact detail** – MAG assign/remove on contact (search/add/remove in accordion). Done.

### 5. Review

- [ ] **Review** – Walk through: form submit → contact created/updated → review badge; contact list (with membership filter) and detail; taxonomy on contact; notes log; MAG assign on contact; Memberships page (MAG by title, select one → list contacts in that MAG). No Members route. Confirm sidebar and routes match. Fix gaps.

### 6. Next session: Boei integration (review)

- [ ] **Review Boei platform docs** – [Boei](https://boei.help/) is a page widget (forms, links, chatbot, unified inbox, lead tracker). Review their documentation for API/integration options. **Goal:** Use Boei API to add forms (or form submissions) into this CMS CRM—e.g. receive Boei form submissions via webhook or API and create/update contacts and submissions in our CRM.

---

## Context

*Use for changelog "Context for Next Session" at session end; then delete.*

- **CRM and forms** are in good shape. Completed this session: sidebar "New" badge (count + fixed status in settings); status selector on contact detail Taxonomy card with refresh; contact list columns (last name, first name, email, phone, status, updated), sort by last name, whole-row clickable; form submit API and submissions list. **Next up:** Optional Custom Fields form filter on contact detail; Phase 09 Memberships (MAG list, select MAG → contacts) if not done; then full review walk-through. **Next session:** Review [Boei](https://boei.help/) docs—widget with forms, links, chatbot; use Boei API to add forms/submissions into CRM.
