# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Where we are

- **Done:** Notifications, SMTP/PWA, tenant setup checklist. Blog: pagination, categories/tags, archives, author, RSS, SEO metadata, Social Share, comments (member-only + staff fallback, approve_reject, content edit comments block). GPUM: dashboard, profile, account. Signup pipeline (processSignup, code→action table, workflows settings UI). Workflows and blog template items complete.
- **Next:** Shortcode Phase 2b complete. Phase 3 (Quote, FAQ, Accordion) eliminated — Content shortcode + content types cover embedding; use content types for quote/FAQ-style blocks. See Other/Backlog below.

---

## Next up

### Shortcode implementation (MVP)

**Done (see changelog):** Phase 1 (library table, universal picker, Gallery, Media, separator/section/spacer/clear, Button, Form placeholder, Snippet, alignment). Phase 1a (media size, picker size step, post preview). Phase 2 (Layout wizard: composite `[[layout|...]]`, presets, Blank | Image | Gallery | Content per column).

---

#### Phase 2b — Form display, embed code, shortcode integration, and form styles (CRM) — **Done**

**Goal:** CRM form manager builds full-use form objects (form ID, embed script). Forms can be embedded in posts via shortcode (inline display) and in Layout wizard column cells. Form styling is managed via a Form Styles tab (like Button Styles); shortcode can reference a style by name. Theme preset colors keep forms consistent with the site.

- [x] **2b.0 Form Styles (Settings → Style tab)** — Forms tab; form_styles in settings; `/api/settings/form-styles`; default styles (default, minimal, bordered).
- [x] **2b.1 Form display routine** — `FormEmbed` component; GET `/api/forms/[idOrSlug]/config`; `ContentWithGalleries` + public pages pass `formStyles`/`themeColors`; `[[form:id]]` / `[[form:id|style=slug]]` render inline.
- [x] **2b.2 Embed code in form manager** — CRM → Forms: Embed (Code2) button opens dialog with form URL and copyable iframe; `siteUrl` from getSiteUrl().
- [x] **2b.3 Form in main shortcode picker** — Form type in shortcode types; form picker modal (form + optional style) → insert shortcode.
- [x] **2b.4 Form in Layout wizard** — Form column option; Select form opens form picker (form + optional style); shortcode stored in column.

---

**Phase 3 (Quote, FAQ, Accordion) — eliminated.** Content shortcode pulls from default content types; Quote/FAQ/Accordion can be content types and embedded via `[[content:id]]` or Layout → Content. No dedicated quote/faq_sets tables or specialized shortcodes needed.

---

### Other / Backlog

- [x] **Media: "Copy Shortcode"** — On media library items, add action that copies shortcode (e.g. `[[media:id]]`) to clipboard for pasting into editor. (Can be done with Phase 1 Media shortcode.)
- [x] **Share-intent (“Share this post”)** — ShareIntentLinks: Twitter (title + optional description), Facebook, LinkedIn, Email, Pinterest (when imageUrl). Button-style links; used on every blog post and on generic pages ("Share this page"). Optional later: platform toggles in settings, shortcode.
- [x] **Terms and Policys manager** — Link to external app (custom per tenant).
- [x] **CRM Sorting** — Sort contact list by Last name, First name, Full name, Status, Updated; default sort = last activity at top (Updated). Click column headers to sort; default = Updated desc.
- [x] **Form Submission List** — Pagination; filter by date range (stack with form type).
- [x] **Form Data Export** - Ability to export form submission data as CSV by type and date range
- [x] **Code Generator Module** — See “Code Generator Workflow” and implementation steps below.
- [ ] **Proper rendering for core content types** - Like FAQ, Accordion, Quotes. Some CSS styling may be required. Is this a front end Dev feature and not needed for basic content entry?
- [ ] **App Version Number** — Add app version to the admin dashboard; derive from mvt.md document.
- [ ] **Banners**  - A programmable display block that can show html5 content on a sschedule. Usually at top of home page.

---

## Code Generator Workflow (scenarios & implementation)

### Workflow scenarios

- **Workflow trigger:** Codes are used to trigger a workflow when used during signup/login. We need a way to identify a single code or a group of codes by ID so that ID can be used by the workflow.
- **Usage logging:** Whenever a GPUM (member) uses a code — at signup, login, or anywhere a code field is used — that usage is logged in the code table: date, time, and contact. The living table is the source of truth for “who used which code when.”
- **Single vs multiple codes:** Single codes are typically multi-use for the same workflow. Multiple codes for a single project are typically used to limit sales or to track individual use for sales calculation.
- **Batch as identifier:** Batches are the grouping concept; we reference a batch by ID (batch_id) for workflows and reporting. On redemption, the API returns `batch_id` so signup/workflows can key off it (CG.1).
- **Uniqueness:** Prefix and postfix fields allow unique codes year over year. Unique, non-duplicate codes are essential. Design should prevent duplicates; we need explicit checks so the generator never creates duplicate codes.
- **Living table:** All generated codes are stored in a living table. The table must be listable, searchable, and filterable (e.g. by batch ID). CSV export is required (codes are used with clients to track event participation; data export is essential).
- **Review and status:** Support reviewing and manually marking a code as used; ability to search by used/open. Track date and time of use. A field (e.g. checkbox or status) must indicate open vs used.
- **Multi-use in table:** Multi-use codes are also represented in the table so they can be searched and reported (e.g. uses, date ranges).
- **No table-level duplicate prevention:** The table itself does not prevent entering a duplicate code/record; only the generator logic prevents creating duplicates when generating. (Manual/imported rows or multi-use redemption rows may repeat the same code for different uses.)
- **Link to contact:** Code use must link to a contact record (e.g. by contact UID or contact_id) so we can see who used the code.

### Code Generator Module — implementation steps

- [x] **CG.0 Modal & layout** — Create-batch modal: scrollable body so all controls visible; batches list on main page as table (Name, MAG, Type, Codes/Usage, Expires, Actions).
- [x] **CG.1 Batch ID as workflow reference** — Document or expose batch_id (and batch identifier in workflows/signup) so workflows can key off batch ID when a code is redeemed.
- [x] **CG.2 Generator duplicate prevention** — Per-run dedupe only (no DB pre-load). Prefix/postfix define batch; 5-digit center can repeat across batches. DB unique(batch_id, code_hash) rejects any duplicate insert.
- [x] **CG.3 Living table: list, search, filter** — Codes table UI: list all codes (single-use rows + multi-use redemption rows where applicable). Support search and filter by batch ID (and optionally status, date range). Table columns: code (or masked), batch ID/name, status (open/used), used date/time, contact (link by contact UID or ID).
- [x] **CG.4 Open/used and manual mark** — Status field (open/used) visible in table; allow manual marking of a code as used (admin). Search/filter by “used” vs “open”; show date/time of use.
- [x] **CG.5 Code use → contact link and usage log** — When a GPUM uses a code (signup, login, or any code field), log that usage in the code table: date, time, contact. Ensure each redemption links to contact (contact_id or resolve via member → contact). Display “who used it” in table/detail with link to contact record (by UID or ID).
- [x] **CG.6 Export CSV** — Export codes table (or filtered view) as CSV: code, batch_id, status, used_at, contact_id/UID, and other needed fields for event participation and reporting.
- [x] **CG.7 Multi-use in table** — Multi-use codes appear in the table (e.g. one row per redemption) so they can be searched and filtered for metrics (use count, date range).
- [x] **CG.8 Expiration** — Expiration date for batches remains optional; ensure it is applied at redemption time and visible in batch/code list.

---

## Paused / Later

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog).
