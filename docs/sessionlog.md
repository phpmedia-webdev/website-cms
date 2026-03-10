# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Where we are

- **Done:** Notifications, SMTP/PWA, tenant setup checklist. Blog: pagination, categories/tags, archives, author, RSS, SEO metadata, Social Share, comments (member-only + staff fallback, approve_reject, content edit comments block). GPUM: dashboard, profile, account. Signup pipeline (processSignup, code→action table, workflows settings UI). Workflows and blog template items complete.
- **Next:** Shortcode implementation (universal picker + public library + Phase 1–3). See Next up below.

---

## Next up

### Shortcode implementation (MVP)

**Design:** One “Insert shortcode” toolbar button (replace dedicated Image + Gallery icons). Shortcode picker lists types from public `shortcode_types` table; selecting a type either inserts a fixed shortcode (e.g. separator) or opens a type-specific picker (gallery, media, form, etc.). Parse/render logic remains in app code; table drives picker list and order for all tenant sites. Alignment: Tiptap paragraph alignment applies to block containing shortcode; renderer preserves wrapper (e.g. div with text-align) when replacing shortcodes so front end shows alignment.

---

#### Phase 1 — Library table, universal picker, single/self-closing shortcodes

- [x] **1. Public shortcode_types table** — Migration in `public` schema: `shortcode_types` (slug, label, icon, has_picker, picker_type, display_order). Seed rows: gallery, media, separator, section_break, spacer, clear, button, form, snippet. Run in Supabase SQL Editor.
- [x] **2. API for shortcode types** — GET endpoint (e.g. `/api/shortcodes/types` or RPC) returns list for picker; used by editor. No tenant filter (shared library).
- [x] **3. Universal shortcode picker UI** — Single toolbar button “Insert shortcode” (icon); opens modal listing types from API. On select: if no picker, insert fixed shortcode and close; if picker, open type-specific picker then insert result.
- [x] **4. Repurpose Gallery** — Remove dedicated “Insert gallery” toolbar button. Gallery becomes one type in universal picker; selecting “Gallery” opens existing GalleryPickerModal; insert `[[gallery:id, style-id]]`. Renderer unchanged (ContentWithGalleries).
- [x] **5. Media/Image shortcode** — Type `media`; picker: media library (by id/name), optional size/align. Shortcode `[[media:id]]` or `[[media:id|size]]`. Parser + renderer: resolve media, output `<img>` (and optional wrapper for alignment). “Copy Shortcode” on media library item copies `[[media:id]]`.
- [x] **6. Simple block shortcodes (no picker)** — Implement parser + renderer for: `[[separator]]` → `<hr />` or themed divider; `[[section-break]]` or `[[section:full]]` → `<div class="section-break" />`; `[[spacer]]` or `[[spacer|size=md]]` → `<div class="spacer spacer-md" />`; `[[clear]]` → `<div class="clearfix" />` or clear both. Theme provides CSS. Picker inserts open/close for any that need wrappers (none in Phase 1).
- [x] **7. Button shortcode** — Type `button`; picker: label + URL + optional style key. Shortcode e.g. `[[button:Label|url|style]]`. Renderer → `<a href="..." class="btn btn-{style}">`. Style picker: predefined list (e.g. primary, secondary, outline) in code or tenant settings.
- [x] **8. Embed form shortcode** — Type `form`; picker: choose form by id/slug from existing `forms`. Shortcode `[[form:id]]` or `[[form:slug]]`. Renderer: embed existing form component.
- [x] **9. Snippet shortcode** — Type `snippet`; picker: choose snippet (existing Snippet content or snippet entity) by id/slug. Shortcode `[[snippet:id]]`. Renderer: fetch and render snippet body (Tiptap/HTML).
- [x] **10. Preserve alignment when rendering** — When replacing a shortcode in content, preserve the paragraph (or block) wrapper’s alignment (e.g. text-align) so front end displays left/center/right as set in editor.

---

#### Phase 1a — Shortcode styling (e.g. image size)

**Discussion (decide before implementing):**

- **Option A — Shortcode parameters on the media shortcode**  
  Extend `[[media:id]]` to e.g. `[[media:id|size=medium|align=center]]`. Parser already supports a single `size` segment; add named params: `size` (small / medium / large / full), `align` (left / center / right), optional `class`. Renderer outputs `<img>` with appropriate class or inline max-width. **Pros:** One shortcode, self-contained, clear. **Cons:** Picker UI needs size/align controls; media shortcode can grow many options.

- **Option B — Wrapper shortcode**  
  Use a layout shortcode (e.g. `[[container|narrow]]` … `[[/container]]` or a dedicated `[[figure]]` … `[[/figure]]`) and put the image shortcode inside. Constrain width via the wrapper. **Pros:** Reuses layout primitives; keeps media shortcode simple. **Cons:** User must insert two shortcodes; less obvious for "just make this image smaller."

- **Option C — Hybrid**  
  Media shortcode gets a few params (`size`, `align`) for the common case. Optional wrapper (container/figure) for when they need layout or caption. **Decided: Option A** (params at shortcode only; no styling on the media file).

- [x] **9a.1 Decide approach** — Option A (shortcode parameters). Styling only at insert point, not on the media file.
- [x] **9a.2 Media shortcode size** — Parser: support `size` param (positional or named: `[[media:id|medium]]`, `[[media:id|size=large]]`). Renderer: Tailwind size classes (small=max-w-xs, medium=max-w-md, large=max-w-2xl, full=max-w-full); default medium so images are not too large.
- [ ] **9a.3 Media shortcode align (optional)** — If not relying only on paragraph alignment, add `align` param and apply to wrapper or image.
- [x] **9a.4 Picker UI** — After selecting an image, "Image size" dialog with Size dropdown (Small, Medium, Large, Full); inserted shortcode includes size (e.g. `[[media:id|medium]]`).
- [x] **9a.5 Theme/CSS** — Size applied via Tailwind classes on the shortcode wrapper; no extra CSS file.
- [x] **9a.6 Post preview** — Preview only after post is saved. Edit page: Preview button (content type = post) opens `/blog/[slug]` in new tab. Draft posts: same URL; operators (admin/superadmin) can see draft at `/blog/[slug]`; public gets 404. Draft banner shown when viewing draft. `getContentByTypeAndSlug` for any-status fetch; `canPreviewDraft()` for operator check.

---

#### Phase 2 — Layout wizard + columns/col backend (single-row columns)

**Design:** Modal offers one **"Layout"** item that opens the **Layout wizard**. Wizard: column widths (%), row height (px), per-column content (Blank | Image | Button | Form | Snippet | FAQ | Quote). Backend: paired `columns` and `col` only.

**Backend:**

- [ ] **11. Paired shortcode parser** — In content renderer (e.g. ContentWithGalleries or generalized shortcode handler): find open/close pairs by type (e.g. `[[columns|2]]` … `[[/columns]]`). Match by stack (nested same type). Extract HTML between; recursively process inner content; replace with wrapper div + processed inner HTML.
- [ ] **12. Columns shortcode** — `[[columns|widths|height]]` … `[[/columns]]`. widths = comma-separated % (e.g. 30,40,30), sum 100; height = row height px (e.g. 150). Renderer: single-row grid/flex, min-height.
- [ ] **13. Col shortcode** — `[[col]]` … `[[/col]]` inside columns only. Each pair = one column (left to right). Renderer: column wrapper; inner content processed recursively. Images scale to row height when height set.
- [ ] **14. Add "Layout" to shortcode modal** — New entry "Layout" in picker. Selecting it opens Layout wizard; on completion calls onSelect(generatedShortcode) and closes.
- [ ] **15. Prompt/description per item** — Short prompt under each item (e.g. "Insert a single image."). Source: optional description on shortcode_types + API, or static map.
- [ ] **16. Wizard step 1: Layout definition** — Column widths (%) comma-separated, validate sum = 100; row height (px) default 150. N columns = number of width values.
- [ ] **17. Wizard step 2: Assign content per column** — For each column 1..N: Blank | Image | Button | Form | Snippet | FAQ | Quote. If not Blank, open that picker; store id/params. Reuse existing pickers.
- [ ] **18. Wizard step 3: Insert** — Build columns/col shortcode string with each col body empty or chosen shortcode. onSelect(shortcode); close.
- [ ] **19. Seed Layout + optional description** — Add layout to shortcode_types for "Layout" entry; optionally add description column for modal prompts.

---

#### Phase 2b — Form display, embed code, and shortcode integration (CRM)

**Goal:** CRM form manager builds full-use form objects (form ID, embed script). Forms can be embedded in posts via shortcode (inline display) and in Layout wizard column cells. Styling options in form manager deferred to a later upgrade.

- [ ] **2b.1 Form display routine** — Shared routine that, given form id/slug, loads form config (field assignments, core/custom fields) and renders the form (reuse or share with PublicFormClient). Used by: (1) existing `/forms/[slug]` page; (2) ContentWithGalleries shortcode render so `[[form:id]]` outputs the form inline instead of a "View form" link.
- [ ] **2b.2 Embed code in form manager** — In CRM → Forms (list or edit): "Copy embed code" that shows copyable iframe (and optionally script) using the form URL. Form identified by id/slug; no backend change for the form page itself.
- [ ] **2b.3 Form in main shortcode picker** — Add "Form" as a top-level item in the shortcode picker (not under Content). On select: open form picker modal (list from `/api/crm/forms`), choose form → insert `[[form:id]]` or `[[form:slug]]`.
- [ ] **2b.4 Form in Layout wizard** — Add "Form" as a column content option in the Layout wizard (with Blank, Image, Gallery, Content). Choosing Form opens the same form picker; selected form shortcode is stored in that column’s content.
- [ ] **Later:** Form manager styling (colors, button style, etc.) as a separate upgrade.

---

#### Phase 3 — Quote, FAQ (and optional Accordion) for standalone + Layout cells

**Design:** Quote and FAQ usable as standalone shortcodes and as Layout wizard cell types. Exclude current post from pickers in wizard.

- [ ] **20. Quote shortcode (standalone + Layout cell)** — `quotes` entity (table: id, quote text, author, order, tenant). Admin UI to manage quotes. Shortcode `[[quotes:id1,id2]]` or `[[quotes:collection-id]]`; picker: multi-select or collection. Renderer: quote carousel/rotator component.
- [ ] **21. FAQ shortcode (standalone + Layout cell)** — Option A: keep FAQ as inline block only. Option B: `faq_sets` table; shortcode `[[faq:set-id]]`; picker picks set. Renderer: accordion or list from set.
- [ ] **22. Accordion (optional, defer)** — Option A: accordion as content block (like FAQ) with “display as accordion.” Option B: accordion sets table; shortcode `[[accordion:set-id]]`; picker. Renderer: collapsible sections. Defer or implement after Phase 1–2.

---

### Other / Backlog

- [ ] **Media: "Copy Shortcode"** — On media library items, add action that copies shortcode (e.g. `[[media:id]]`) to clipboard for pasting into editor. (Can be done with Phase 1 Media shortcode.)
- [ ] **Terms and Policys manager** — Link to external app (custom per tenant).
- [ ] **CRM Sorting** — Sort contact list by Last name, First name, Full name, Status, Updated; default sort = last activity at top (Updated).
- [ ] **Form Submission List** — Pagination; filter by date range (stack with form type).
- [ ] **App Version Number** — Add app version to the admin dashboard; derive from mvt.md document.

---

## Paused / Later

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog).
