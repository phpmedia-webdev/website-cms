# Session Log

**Purpose:** Active, focused session continuity. Not a living document — kept lean.

**Workflow:**
- **Session start:** Open `sessionlog.md`; use **Next up** and **Context** to pick up where you left off.
- **Session end:** Check off completed items → sync to `planlog.md` → delete those items from sessionlog → add context to `changelog.md`.

**Performance (speed):** Speed is a major goal. Features that may slow the system must be documented and the product owner notified. See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

**Auth/password/TOTP work complete.** Password policy (12 chars, denylist), forgot password, change password on Profile, TOTP on My Profile (optional), 2FA optional for tenant admins, CRM recommendation banner, invite redirectTo reset-password, tenant site name on auth pages, hardening confirmed. **Next:** Tenant admin team management (Settings → Users, Owner flag) per First priority below.

---

## Next up

### Completed: In-app password policy + optional TOTP + auth branding + recommendation (steps 1–9)

- Password policy in `src/lib/auth/password-policy.ts`; used on change-password, set-new-password (reset), and invite acceptance (redirectTo our reset-password page).
- Forgot password: link on login, `/admin/login/forgot`, `/admin/login/reset-password` with policy validation.
- My Profile: Change password card; Security card with TOTP (MFAManagement, allowRemoveLastFactor for tenants); MFA enroll redirects to Profile when already enrolled.
- Login: 2FA required only for superadmin; tenant admins optional; CRM recommendation banner on Profile when no factors.
- Invite flows (tenant-sites users, settings team) pass `redirectTo` our reset-password page so first password meets policy.
- Auth pages show tenant site name in header (layout resolves site when unauthenticated). Deeper design (fonts/colors) deferred to client site design.
- Protected routes and APIs confirmed to validate session/role; form submit rate-limited, members redeem requires auth.

---

### First priority: Tenant admin team management (Settings → Users) — with Owner flag

**Goal:** Let tenant admins (scoped to the current site) manage their own team: list users, add users, assign roles (Admin, Editor, Creator, Viewer). Settings → Users link at the top of Settings (above Profile). Superadmin remains the master list (Tenant Sites → [site] → Related Tenant Users); Settings → Users is the same data, scoped UI for that site’s admins.

**Owner rules:**
- There can be **more than one Owner** per tenant site. Owner is a flag/badge on the assignment (e.g. `is_owner` on `tenant_user_assignments`).
- **Only superadmin** can set or clear the Owner flag (typically during setup when adding/inviting the initial owner/admin).
- **Owners** can delete all other admins **except other Owners**. Non-owner Admins cannot delete Owners; only superadmin can remove an Owner or change Owner status.
- Tenant admins (including Owners) can add members and assign any role (Admin, Editor, Creator, Viewer); they **cannot** set or clear the Owner flag — that is superadmin-only.

**Steps:**

1. **Migration: add Owner flag**
   - Add column `is_owner BOOLEAN NOT NULL DEFAULT false` to `public.tenant_user_assignments`. Migration file e.g. `090_tenant_user_assignments_is_owner.sql`. Comment: only superadmin may set true; Owners cannot be removed by tenant admins.

2. **Types and CRUD**
   - Update `TenantUserAssignment` (and insert/update types) to include `is_owner`. Update `tenant-users.ts` (or equivalent) so reads/writes include `is_owner`; only superadmin APIs may set `is_owner` to true or false when creating/updating assignments.

3. **AuthZ helper**
   - Server helper e.g. `canManageTeamForCurrentTenant(userId)`: resolve current user → get tenant_site for current schema → get user’s assignment for that site → allow only if `role_slug === 'admin'`. Optionally expose whether current user is Owner for this site (so UI can show "Remove" only for non-Owners when viewer is Owner). Use in Settings Users page and tenant-scoped team API.

4. **Settings → Users link and route**
   - In Sidebar `settingsSubNav`, add **Users** at the top (above Profile): `{ name: "Users", href: "/admin/settings/users", icon: Users }`.
   - Create route `src/app/admin/settings/users/page.tsx` — server component that checks canManageTeamForCurrentTenant; if not admin for this tenant, redirect or 403. Else render client component (team list + add/edit).

5. **Tenant-scoped team API**
   - **GET** e.g. `GET /api/settings/team` or `GET /api/settings/users`: returns list of users for the **current** tenant site (tenant_user_assignments + tenant_users for that site). Include `is_owner` in each assignment; only superadmin can change it, but tenant admins need to see it so Owners are not removable by them. Require caller to be Admin for this tenant.
   - **POST** (add user): body `{ email, display_name?, role_slug, invite?: boolean }`. Create/find tenant_user; create tenant_user_assignment for this site with role_slug. Do **not** accept `is_owner` from tenant admin — only superadmin (existing Tenant Sites → users API) can set is_owner. If invite and no auth user, call existing invite flow then create assignment.
   - **PATCH** (change role or remove): body `{ assignment_id, role_slug? }` or `{ user_id, role_slug? }`; if role_slug omitted, remove assignment. **Rule:** If target assignment has `is_owner === true`, return 403 unless caller is superadmin. Tenant Admin (including Owner) can remove only non-Owner admins. Only superadmin can remove an Owner or set is_owner.

6. **Superadmin API: set Owner**
   - In `POST/ PATCH /api/admin/tenant-sites/[id]/users` (or equivalent), allow superadmin to pass `is_owner: true | false` when adding or updating an assignment. Typically set `is_owner: true` when adding the first admin during setup.

7. **Settings → Users page UI**
   - List: table or cards of current site users (email, display name, role, **Owner badge** when is_owner). Actions: Change role (dropdown; cannot change Owner flag — show badge only), **Remove from site** (with confirm). For rows with is_owner, hide or disable Remove unless current user is superadmin (or allow only superadmin to remove Owners from superadmin dashboard).
   - Add user: form (email, display name optional, role dropdown, "Send invite email" checkbox). Submit → POST to tenant-scoped API. No Owner checkbox (superadmin only).

8. **Reuse / alignment**
   - Reuse types and helpers from tenant-users lib and superadmin Related Tenant Users (invite flow, role list). Both superadmin and Settings → Users read/write same tables; Owner flag and who can set/remove it enforced in API and migration comment.

---

### Phase 09 — Membership working (steps)

Ordered steps for the "Still needed" Phase 09 items so membership actually gates content and members have a place to land.

1. **Content protection (blog + pages) — server-side gate**
   - Add `checkContentAccess(content, session)` in `src/lib/mags/content-protection.ts` (or `src/lib/auth/content-access.ts`): given content row (access_level, required_mag_id, visibility_mode, restricted_message) and current session, return `{ hasAccess, visibilityMode?, restrictedMessage? }`. Logic: public → allow; members → require auth + user_metadata.type === "member" (or admin/superadmin bypass); mag → require auth + contact’s MAGs include required_mag_id (resolve contact from user, then getContactMags). Reuse pattern from gallery-access.ts.
   - **Blog post:** In `src/app/(public)/blog/[slug]/page.tsx`, fetch post then call checkContentAccess before rendering. If !hasAccess: do not pass post.body to client; render restricted message or redirect to `/login?redirect=/blog/...`. If hasAccess: render full content.
   - **Dynamic page:** Same in `src/app/(public)/[slug]/page.tsx` for type `page` (or all content by slug): checkContentAccess before rendering body; redirect to login with return URL when access requires member.
   - **Blog list:** In `src/app/(public)/blog/page.tsx`, filter or mask restricted posts (e.g. exclude from list, or show title/excerpt only when visibility_mode = message). Optional: filter in query by access for anonymous vs member.
   - Ensure content fetch for blog/page does not strip access_level/required_mag_id so the check has data (getPublishedContentByTypeAndSlug or equivalent already returns these if in select).

2. **Login redirect with return URL**
   - Confirm `(public)/login` already supports `?redirect=` and that after member login we redirect to `redirect` (not always `/`). If not, add it so restricted content can send user to `/login?redirect=/blog/post-slug` and after login land on that URL.
   - Optional: add "Register" or "Have an access code?" on login page for member signup/code flow (can be a later step).

3. **Resolve member’s MAGs for content check**
   - checkContentAccess needs "current user’s MAGs". Member is identified by auth (user_metadata.type = "member"); member row links to contact_id (members table); contact has MAGs via crm_contact_mags. Add helper e.g. getMagIdsForCurrentUser(): get session → get member by user_id → get contact_id → getContactMags(contact_id) → return mag ids. Use in checkContentAccess for mag-level content. Admins/superadmins bypass (treat as hasAccess for content).

4. **Member routes (dashboard / profile)** — Done. Members area has dashboard, profile (display name, avatar), account placeholder, Apply code block; middleware protects `/members/*`. **Membership sync (CRM + members row) runs only in `src/app/(public)/members/layout.tsx`**, not on every public page, so the rest of the site stays fast. See prd.md and planlog.md — Member sync and performance; Performance (Speed). **Membership is limited to certain pages for now;** shortcode feature will require adjustments when implemented (see PRD/planlog).

5. **ProtectedContent wrapper (optional, for reuse)**
   - Create `src/components/public/ProtectedContent.tsx` — server component that accepts content (or access_level, required_mag_id, etc.) and children; runs checkContentAccess; if no access renders restricted message or null; if access renders children. Use on blog/page and [slug] to avoid duplicating logic.

6. **Later (deferred but on list)**
   - Protected video: `/api/stream/media/[id]` and `/api/download/media/[id]` (verify session + MAG, stream bytes).
   - Dashboard: membership stats on admin dashboard; `/admin/members` list (contacts with MAGs); unified customer view.
   - Ecommerce: api_keys, payment webhooks, payment-integration.

### Phase 9C — Members & Ownership (steps)

Ordered steps for the "Still needed" Phase 9C items so the members row is created when contacts are elevated (admin grant MAG, first-time code, future webhook).

1. **Admin assign MAG → create member**
   - In `POST /api/crm/contacts/[id]/mags` (or the handler that calls addContactToMag), after successfully adding the contact to the MAG, call `createMemberForContact(contactId)`. Idempotent: if the contact is already a member, no duplicate row. This makes "admin assigns MAG" the first elevation trigger.

2. **Document elevation flow**
   - Add a short note (planlog or docs/reference): simple signup = contact only; member = purchase OR admin grant OR signup code. When to create members row: (1) admin assign MAG, (2) signup code redemption (first-time or "Apply code"), (3) purchase webhook (future). Form auto_assign_mag_ids is for qualifying forms only, not every form.

3. **First-time code redemption (optional)**
   - If you want "register with code" or "have a code?" on login: after auth (or during register), if user has no members row but has a code, create contact by email if needed, then createMemberForContact(contactId, userId), then call redeem flow so MAG is assigned. Alternatively, keep current behaviour: redeem-code requires existing member (created by admin or by a separate "invite with code" flow that creates member with user_id null until they register).

4. **Optional: LMS Phase 17**
   - When planning LMS, note that user_licenses is used for course enrollment alongside course_mags (per 9C design).

### Phase 9A — Membership Code Generator & Redemption (steps)

Ordered steps for the "Still needed" Phase 9A items so members (and visitors) can enter and redeem codes.

1. **Member "Apply code" UI**
   - On member dashboard (`/members`) or member profile (`/members/profile`): add an "Apply code" section — input field + submit button. On submit: POST `/api/members/redeem-code` with `{ code: string }`. Show success message (e.g. "Code applied. You now have access to …") or error (invalid/expired/already used). Depends on Phase 09 step 4 (member routes exist).

2. **Login "Have an access code?" (optional)**
   - On `(public)/login`: add optional "Access code" field. Flow: if user submits with code and is **already a member** (has members row), after successful login call redeem-code then redirect to `redirect` URL. If user is **not yet a member**, either: (a) show message "Register first, then apply your code in Member dashboard", or (b) implement "register with code" (create contact by email → createMemberForContact → redeem code) — aligns with Phase 9C step 3.

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

## Context for handoff

- **Afternoon session wrapped.** Membership area, CRM sync on member pages only, CRM contact delete/list/display-name sync, automations (signup→CRM), public header Welcome/Log Out/Members Area, and speed/membership-limited docs are in changelog entry **2026-02-03 CT (afternoon)**.
- See changelog **"Context for Next Session"** for latest.
