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

- [ ] **1. Public shortcode_types table** — Migration in `public` schema: `shortcode_types` (slug, label, icon, has_picker, picker_type, display_order). Seed rows: gallery, media, separator, section_break, spacer, clear, button, form, snippet. Run in Supabase SQL Editor.
- [ ] **2. API for shortcode types** — GET endpoint (e.g. `/api/shortcodes/types` or RPC) returns list for picker; used by editor. No tenant filter (shared library).
- [ ] **3. Universal shortcode picker UI** — Single toolbar button “Insert shortcode” (icon); opens modal listing types from API. On select: if no picker, insert fixed shortcode and close; if picker, open type-specific picker then insert result.
- [ ] **4. Repurpose Gallery** — Remove dedicated “Insert gallery” toolbar button. Gallery becomes one type in universal picker; selecting “Gallery” opens existing GalleryPickerModal; insert `[[gallery:id, style-id]]`. Renderer unchanged (ContentWithGalleries).
- [ ] **5. Media/Image shortcode** — Type `media`; picker: media library (by id/name), optional size/align. Shortcode `[[media:id]]` or `[[media:id|size]]`. Parser + renderer: resolve media, output `<img>` (and optional wrapper for alignment). “Copy Shortcode” on media library item copies `[[media:id]]`.
- [ ] **6. Simple block shortcodes (no picker)** — Implement parser + renderer for: `[[separator]]` → `<hr />` or themed divider; `[[section-break]]` or `[[section:full]]` → `<div class="section-break" />`; `[[spacer]]` or `[[spacer|size=md]]` → `<div class="spacer spacer-md" />`; `[[clear]]` → `<div class="clearfix" />` or clear both. Theme provides CSS. Picker inserts open/close for any that need wrappers (none in Phase 1).
- [ ] **7. Button shortcode** — Type `button`; picker: label + URL + optional style key. Shortcode e.g. `[[button:Label|url|style]]`. Renderer → `<a href="..." class="btn btn-{style}">`. Style picker: predefined list (e.g. primary, secondary, outline) in code or tenant settings.
- [ ] **8. Embed form shortcode** — Type `form`; picker: choose form by id/slug from existing `forms`. Shortcode `[[form:id]]` or `[[form:slug]]`. Renderer: embed existing form component.
- [ ] **9. Snippet shortcode** — Type `snippet`; picker: choose snippet (existing Snippet content or snippet entity) by id/slug. Shortcode `[[snippet:id]]`. Renderer: fetch and render snippet body (Tiptap/HTML).
- [ ] **10. Preserve alignment when rendering** — When replacing a shortcode in content, preserve the paragraph (or block) wrapper’s alignment (e.g. text-align) so front end displays left/center/right as set in editor.

---

#### Phase 2 — Paired shortcodes (layout)

- [ ] **11. Paired shortcode parser** — In content renderer (e.g. ContentWithGalleries or generalized shortcode handler): find open/close pairs by type (e.g. `[[columns|2]]` … `[[/columns]]`). Match by stack (nested same type). Extract HTML between; recursively process inner content; replace with wrapper div + processed inner HTML.
- [ ] **12. Columns shortcode** — `[[columns|2]]` … `[[/columns]]` (optional 3, 4). Picker inserts open + newline + close, cursor between. Renderer → `<div class="columns-2">` (or columns-3, columns-4). Theme: grid or flex.
- [ ] **13. Container shortcode** — `[[container]]` … `[[/container]]`; optional `[[container|narrow]]`. Renderer → `<div class="container">` or `container-narrow`. Theme: max-width, padding.
- [ ] **14. Flexbox shortcode** — `[[flex|row]]` … `[[/flex]]` or `[[flex|column|wrap]]` … `[[/flex]]`. Attributes → classes (e.g. flex, flex-row, flex-wrap). Renderer → `<div class="flex flex-row flex-wrap">`. Theme: display flex, etc.
- [ ] **15. Seed paired types in shortcode_types** — Add rows for columns, container, flex (has_picker false or simple “number of columns” / variant); picker inserts open + close with cursor between.

---

#### Phase 3 — Entity-backed shortcodes (Quotes, FAQ, Accordion)

- [ ] **16. Quotes shortcode (optional)** — `quotes` entity (table: id, quote text, author, order, tenant). Admin UI to manage quotes. Shortcode `[[quotes:id1,id2]]` or `[[quotes:collection-id]]`; picker: multi-select or collection. Renderer: quote carousel/rotator component.
- [ ] **17. FAQ shortcode (optional)** — Option A: keep FAQ as inline block only. Option B: `faq_sets` table; shortcode `[[faq:set-id]]`; picker picks set. Renderer: accordion or list from set.
- [ ] **18. Accordion (optional)** — Option A: accordion as content block (like FAQ) with “display as accordion.” Option B: accordion sets table; shortcode `[[accordion:set-id]]`; picker. Renderer: collapsible sections. Defer or implement after Phase 1–2.

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
