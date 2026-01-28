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

### 3. Forms (Phase 08)

- [ ] **Assign form fields to form** – Form = logical grouping of custom fields. Implement next:
  - [ ] **Migration** – Add `form_custom_fields` junction (form_id, custom_field_id, display_order, required?) or store `custom_field_ids` JSONB on `forms` (e.g. in `settings` or dedicated column). Prefer junction if we need order/required per form-field.
  - [ ] **RPC / crm.ts** – `getFormFields(formId)` or extend form payload with `field_ids`; `updateForm(id, { ..., field_ids })` for writes.
  - [ ] **Forms UI** – In Forms tab add/edit modal: multi-select of custom fields (by id) for this form, optional display order. Save via PATCH `/api/crm/forms/[id]`.
  - [ ] **API** – PATCH forms route accepts `field_ids` or form-field payload; persist to `form_custom_fields` or `forms` JSONB.
- [ ] **Filter by form on contact Custom Fields tab (later)** – On contact detail, Custom Fields accordion: add form filter (All | Contact’s form | specific form). Show only fields assigned to selected form. Persist filter in sessionStorage (or localStorage) for work sessions. Depends on “Assign form fields to form” being done.
- [ ] **`POST /api/forms/[formId]/submit`** – Validate payload against form/CRM field rules; create/update contact (match by email or phone); set status = new for review; auto-assign tags/MAGs if configured; consents. Reject invalid before writing to CRM.
- [ ] **Form submissions view** – `/admin/crm/forms/[id]/submissions`: list submissions, link to CRM contact.

### 4. Memberships (Phase 09 – under CRM, no separate Members route)

- [ ] **MAG tables** – Already in 052: `mags`, `crm_contact_mags`. Expand if needed (e.g. `members`, `user_mags` for logged-in member accounts later). Content protection columns on `content` and galleries. Client schema.
- [ ] **MAG RPCs** – get_mags_dynamic exists (053); add get_mag_by_id_dynamic, get_contacts_by_mag_dynamic (contacts in a MAG) if needed.
- [ ] **`src/lib/supabase/mags.ts`** – getMAGs, getMagById, getContactsByMag (contacts in a MAG); assign/remove MAG on contact (contact detail).
- [ ] **Admin: Memberships** – `/admin/crm/memberships`: view memberships by title; select a Membership (MAG) and recursively list the contacts (members) in that membership. List/create/edit MAGs (name, UID, description). No separate Members route.
- [x] **Contacts list** – Filter by membership(s): show contacts that have selected MAG(s). Done (via dropdown filter).
- [x] **Contact detail** – MAG assign/remove on contact (search/add/remove in accordion). Done.

### 5. Review

- [ ] **Review** – Walk through: form submit → contact created/updated → review badge; contact list (with membership filter) and detail; taxonomy on contact; notes log; MAG assign on contact; Memberships page (MAG by title, select one → list contacts in that MAG). No Members route. Confirm sidebar and routes match. Fix gaps.

---

## Context

*Use for changelog "Context for Next Session" at session end; then delete.*

- See changelog entry **2026-01-28 17:30 CT** for session summary and next-session context.
