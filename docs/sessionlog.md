# Session Log

**Purpose:** Active, focused session continuity. Not a living document — kept lean.

**Workflow:**
- **Session start:** Open `sessionlog.md`; use **Next up** and **Context** to pick up where you left off.
- **Session end:** Check off completed items → sync to `planlog.md` → delete those items from sessionlog → add context to `changelog.md`.

**Performance (speed):** Speed is a major goal. Features that may slow the system must be documented and the product owner notified. See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

**Up next: Membership and media items** — Make media protection consistent with content/galleries (direct MAG assignment), add red "M" badges in gallery and media library. See "Next up → Membership and media items" below.

---

## Next up

### Membership and media items (up next)

Make media protection consistent with the rest of the membership system; mag-tag remains optional (for filtering); true protection from direct membership assignment. Add visual "M" badges where items are membership-restricted.

1. **Media assignable to dynamic memberships (true protection)**
   - Add **media_mags** (or equivalent) table: `media_id`, `mag_id` — same pattern as `gallery_mags`. Migration + schema.
   - **Protection logic:** Use media_mags for access checks (e.g. `getMagIdsOnMedia`, `filterMediaByMagIdAccess` using `getMemberMagIds`). Switch gallery public API (and any other media protection path) from mag-tag–based to media_mags–based. Mag-tag is still created when a membership is created (`ensureMagTagExists`) but is **optional** on media (for filtering only).
   - **API:** Read/write media MAG assignments (e.g. GET/PUT `media/[id]/mags` or include in media PATCH). Resolve current user’s MAGs by ID for checks.
   - **Media item UI:** On media item page (e.g. ImagePreviewModal / media edit), add a **membership selector** (multi-select of MAGs) that reads/writes media_mags — same UX as gallery MAG picker. Mag-tag assignment remains available in taxonomy for optional filtering.
   - **Optional backfill:** One-time backfill from existing mag-tags on media into media_mags so current behavior is preserved, then mag-tag no longer drives protection.

2. **Gallery list/grid: red "M" badge on membership items**
   - In the **gallery** list/grid view (public-facing gallery embed or standalone gallery page), show a red **"M"** badge on each item (thumbnail/card) that is part of a membership (i.e. media has one or more MAGs in media_mags). Badge visible to users who have access (so they know it’s member content); optionally hide badge for anonymous if item is hidden anyway.

3. **Media library: red "M" badge on membership items**
   - In the **media library** (admin), in both **list** and **grid** view, show a red **"M"** badge on each media item that belongs to at least one membership (has rows in media_mags). Enables admins to see at a glance which assets are membership-protected.

---

## Next up (other phases)

### Phase 09 — Membership working (steps)

Ordered steps for the "Still needed" Phase 09 items so membership actually gates content and members have a place to land. **Execution order:** Implement and test content protection first (steps 1–3); add the **Membership feature switch (step 7)** at the end once basic memberships and content protection work. **We are NOT creating an individual limited membership page management system** — membership is global for the site; the switch (step 7) simply turns the feature on or off for the whole site (optimized speed when off).

1. **Content protection (blog + pages) — server-side gate** — Done (tested).
   - Add `checkContentAccess(content, session)` in `src/lib/mags/content-protection.ts` (or `src/lib/auth/content-access.ts`): given content row (access_level, required_mag_id, visibility_mode, restricted_message) and current session, return `{ hasAccess, visibilityMode?, restrictedMessage? }`. Logic: public → allow; members → require auth + user_metadata.type === "member" (or admin/superadmin bypass); mag → require auth + contact’s MAGs include required_mag_id (resolve contact from user, then getContactMags). Reuse pattern from gallery-access.ts.
   - **Blog post:** In `src/app/(public)/blog/[slug]/page.tsx`, fetch post then call checkContentAccess before rendering. If !hasAccess: do not pass post.body to client; render restricted message or redirect to `/login?redirect=/blog/...`. If hasAccess: render full content.
   - **Dynamic page:** Same in `src/app/(public)/[slug]/page.tsx` for type `page` (or all content by slug): checkContentAccess before rendering body; redirect to login with return URL when access requires member.
   - **Blog list:** In `src/app/(public)/blog/page.tsx`, filter or mask restricted posts (e.g. exclude from list, or show title/excerpt only when visibility_mode = message). Optional: filter in query by access for anonymous vs member.
   - Ensure content fetch for blog/page does not strip access_level/required_mag_id so the check has data (getPublishedContentByTypeAndSlug or equivalent already returns these if in select).

2. **Login redirect with return URL** — Done. Optional "Signup code" on login added (Phase 9A).

3. **Resolve member’s MAGs for content check** — Done.
   - checkContentAccess needs "current user’s MAGs". Member is identified by auth (user_metadata.type = "member"); member row links to contact_id (members table); contact has MAGs via crm_contact_mags. Add helper e.g. getMagIdsForCurrentUser(): get session → get member by user_id → get contact_id → getContactMags(contact_id) → return mag ids. Use in checkContentAccess for mag-level content. Admins/superadmins bypass (treat as hasAccess for content).

4. **Member routes (dashboard / profile)** — Done. Members area has dashboard, profile (display name, avatar), account placeholder, Apply code block; middleware protects `/members/*`. **Membership sync (CRM + members row) runs only in `src/app/(public)/members/layout.tsx`**, not on every public page, so the rest of the site stays fast. See prd.md and planlog.md — Member sync and performance; Performance (Speed). **Membership is limited to certain pages for now;** shortcode feature will require adjustments when implemented (see PRD/planlog).

5. **ProtectedContent wrapper (optional, for reuse)**
   - Create `src/components/public/ProtectedContent.tsx` — server component that accepts content (or access_level, required_mag_id, etc.) and children; runs checkContentAccess; if no access renders restricted message or null; if access renders children. Use on blog/page and [slug] to avoid duplicating logic.

6. **Later (deferred but on list)**
   - Protected video: `/api/stream/media/[id]` and `/api/download/media/[id]` (verify session + MAG, stream bytes).
   - Dashboard: membership stats on admin dashboard; `/admin/members` list (contacts with MAGs); unified customer view.
   - Ecommerce: api_keys, payment webhooks, payment-integration.

7. **Membership feature switch (site-level)** — Done.
   - Implement **after** steps 1–3 are working and tested. Purpose: optimized site speed for sites that do not require any gated content.
   - **Location:** Master “Membership” toggle on the **Membership master page** (`/admin/crm/memberships`), where MAGs are listed and created.
   - **When OFF:** No membership sync on public pages; no content protection. Show **notice** that admin must turn memberships **on** before creating any MAGs; disable or hide “Create membership” until switch is on.
   - **When turning OFF (from ON):** If any MAGs exist, **warn** that gated content will be exposed; advise making all memberships **inactive** (e.g. MAG status = draft) before turning off the membership master sync switch.
   - **When ON:** Membership is global (sync and content protection as configured). Store per tenant (e.g. `tenant_sites.membership_enabled` or feature registry). See prd.md and planlog Phase 09 — Membership feature switch.

### Phase 9C — Members & Ownership (steps)

1. **Admin assign MAG → create member** — Done. POST `/api/crm/contacts/[id]/mags` calls `createMemberForContact(contactId)` after addContactToMag (idempotent).
2. **Document elevation flow** — Done. Planlog Phase 9C has elevation note (admin assign, signup code, purchase webhook; form auto_assign_mag_ids for qualifying forms only).
3. **First-time code redemption (optional)** — Done. Optional "Signup code" on public login; after auth success we call redeem-code if code provided. Apply code always on Member dashboard (Phase 9A).
4. **Optional: LMS Phase 17**
   - When planning LMS, note that user_licenses is used for course enrollment alongside course_mags (per 9C design).

### Phase 9A — Membership Code Generator & Redemption (steps)

1. **Member "Apply code" UI** — Done. ApplyCodeBlock on `/members` dashboard; POST `/api/members/redeem-code`; success/error message. Styling per tenant.
2. **Login "Have an access code?" (optional)** — Done. Optional "Signup code" field on `(public)/login`; after successful sign-in or sign-up we call redeem-code if code provided, then redirect. Public login only (not admin login).

3. **Optional: Admin generator — "No ambiguous" preset**
   - In Code Generator create-batch form: add checkbox "Exclude ambiguous characters (0,O,1,l,I)" that sets exclude_chars to the NO_AMBIGUOUS preset; backend already uses this by default, so this is UX only.

### Phase 9E — Gallery Enhancement (steps)

Ordered steps for the "Still needed" Phase 9E items so galleries are production-ready and lightbox supports external video.

1. **GalleryPreviewModal: external video embed**
   - In `GalleryPreviewModal`, when `item.media.media_type === "video"` and `item.media.provider` is set (e.g. `youtube`, `vimeo`, `adilo`), render an iframe (or reuse a shared video-embed component) using `item.media.video_url` instead of native `<video src={display_url}>`. Keep native `<video>` for uploads/variants without provider. Ensure `GET /api/galleries/[id]/public` and related types include `video_url` and `provider` on media.

2. **Optional: GalleryPreviewModal thumbnail strip**
   - Add an optional thumbnail strip at bottom of lightbox: show small thumbnails of all items; click jumps to that index. Toggle via prop or always on when items.length > 1.

3. **Optional: Gallery page filter by media taxonomy**
   - On standalone gallery page (`/gallery/[slug]`): add a filter bar (categories/tags from media taxonomy). Fetch taxonomy terms for the gallery’s media; filter displayed items client-side or via API param so visitors can narrow by category/tag.

4. **Optional: Shortcode UX**
   - Gallery list: add "Copy shortcode" action per row (default style or no style). Editor: collapsible shortcode cheat sheet (from GALLERY_SHORTCODE_SPEC) in footer or in GalleryPickerModal.

5. **Deferred (Phase 7 / 8)**
   - Content–gallery linking (junction + editor UI). Gallery style templates & presets (public library + per-tenant). Document when planning.

### Phase 9B — Marketing (Email) — research & integration decision

**MVP, significant scope.** First deliverable is **research and analysis of 2 email marketing platforms** to decide which to integrate (and how).

- **Research & analysis:** Compare **Resend** and **Vbout** (or two chosen platforms) on: transactional vs campaign use, API (lists/segments/campaigns), sync model (push contacts, webhooks), unsubscribe/DND handling, pricing and limits, fit with CRM (contacts → lists, search by list). Produce a short decision doc: recommended platform + integration approach.
- **Full plan reference:** See **planlog Phase 9B** for full scope after decision: define marketing scope and integrations; Marketing UI (CRM → Marketing page: lists/segments, campaigns, link contacts, search by list); API and backend (integration config, sync contacts, unsubscribe → DND). Planlog: `docs/planlog.md` → "Phase 9B: Marketing (Email / Resend / Vbout)".

### Phase 9D — AnyChat.one Integration (Conversations)

We have the **AnyChat platform and docs**; need to **review** them and **add the integration**.

- **Review:** AnyChat.one platform and docs (https://docs.anychat.one/ — quick setup, widgets, channels, live chat, inbox, chatflows, embed). Confirm embed option for admin (live chat management in our CRM), widget setup for public site, and any env/credentials needed.
- **Integration:** Add CRM "Conversations" (nav + route `/admin/crm/conversations`); Conversations page with embedded AnyChat management (iframe or SDK); config (superadmin integrations or Settings → CRM: embed URL / API key); project docs for setup and widget on public site.
- **Full plan reference:** See **planlog Phase 9D** for checklist: `docs/planlog.md` → "Phase 9D: AnyChat.one Integration (Conversations)" — Conversations nav, Conversations page (embed, header, dashboard link), integration config, documentation.

---

- **Video embed component for public pages** — Essential; was overlooked. Admin can add videos (YouTube, Vimeo, Adilo, direct URL) and they show in Media Library, but **public pages have no component to render them as playable embeds**. Build a reusable component that accepts a media item (or `video_url` + provider) and outputs the correct embed: YouTube/Vimeo/Adilo iframe or native `<video>` for direct/storage URLs. Use in blog, pages, galleries, any public place that references video media. Planlog Phase 05 "Deferred: Video embed component"; Phase 09 galleries also references this.
- **Image storage: local copy workflow** — Part of speed optimization. Media Library → image → Variants tab has a "Save to Local" button; it is a **stub only** (no copy, no API, no DB). Implement: schema for local copy tracking (`copy_to_local`, `local_path`, `copied_at` on media/variants), `src/lib/media/local-copy.ts`, API routes (copy/remove), `getImageUrl` helper to prefer local when present, and wire the button. Planlog Phase 05 "Deferred — Image Storage Strategy (Local Copy Workflow)".
- **Content type: FAQ block** — Add FAQ block as a selectable content type in the content library. Structure: one topic (title) + multiple Q&A pairs (question, answer); store in `content.body` JSONB or content-type-specific fields. Content library: type filter + list; editor for topic and Q&A list (add/remove/reorder). Migration/seed: add `faq_block` (or equivalent slug) to `content_types`. Public render: component/route to render a single FAQ block by slug or UUID for embedding in tenant code. Planlog Phase 06.
- **Template (root) domain deployment** — Next: set up template on root domain (not subdomain). See planlog Phase 00.
- **Site URL** — Move to Superadmin → Tenant Sites → [site detail/settings]: single input for true site domain (gallery standalone URL prefix). See planlog Phase 00.
- **Automated client setup script** — Test before deploying a fork site. Planlog Phase 00.
- **API routes AAL** — Not done; require `aal2` for sensitive admin API routes (archive, reset, user management). Senior dev may know; see planlog Phase 00.
- **MFA testing** — When we deploy to a domain (soon). Planlog Phase 00.
- **Color palette refactor** — Move predefined palettes to `public.color_palette_presets`; tenant Settings → Colors pulls presets from public (dynamic picker), tenant keeps custom/copied palettes locally. Planlog Phase 01.
- **Central automations folder/location** — Establish a single place (e.g. `src/lib/automations/`) for all automation logic. (1) **Form-submit → lead identification:** Code steps to run on form submit: add tags (taxonomy), add/set custom fields on the contact, set CRM status to **New** so leads are clearly identified. This entire routine may be **tenant-customizable** (e.g. per-tenant config or code-library-style snippets) so different tenants can have different tag rules, field mappings, or status flows. (2) **Other automations:** e.g. push new contact (received via form) to an external CRM; these can also live in the central location and be tenant-configurable where appropriate. Planlog Phase 07 "Deferred — Central automations layer".
- **Pagination for CRM contacts list view** — Contacts list currently loads all contacts in one table. Add pagination (e.g. page size 25/50, prev/next or page numbers) so large contact lists perform and scale; optional: continuous scroll as alternative.
- Add other items as needed (e.g. smoke-test core flows, Settings → Team).

---

See changelog **"Context for Next Session"** in the latest entry for handoff context.
