# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For planned work and backlog items, see [planlog.md](./planlog.md). For session continuity (current focus, next up), see [sessionlog.md](./sessionlog.md).

## [Unreleased]

### 2026-02-03 CT (afternoon) - Membership area, CRM sync on member pages only, CRM fixes, speed docs

**Context for Next Session:**
- **Membership:** Members Area nav (dropdown: Dashboard, Profile, Account) in public header when logged in. Member profile page edits display name and avatar (user_metadata). Apply code block on member dashboard; redeem-code API works when member has `members` row. **Sync (CRM contact + members row) runs only in `src/app/(public)/members/layout.tsx`**, not on every public page—keeps rest of site fast. Membership limited to certain pages for now; shortcode feature will need adjustments (see PRD/planlog).
- **Automations:** New signup → CRM contact (status New) via `src/lib/automations/on-member-signup.ts`; triggered from auth callback (type=signup), login page (when session after signUp), and members layout. Duplicate fix: `getContactByEmail` uses `.limit(1)` and returns first row so duplicates no longer cause PGRST116 or re-create contacts.
- **CRM:** Contact delete on detail page (Delete button, DELETE `/api/crm/contacts/[id]`, `deleteContact` in crm.ts). List columns: Last name, First name, Full name, Phone, Status, Updated. Member display name syncs to contact `full_name` when existing contact found. Full name shown in list; formatSupabaseError in getContactByEmail for clearer errors.
- **Public header:** When logged in: Welcome {displayName}, Log Out; Members Area dropdown. AuthUser has optional `display_name` from user_metadata.
- **Docs:** PRD and planlog have Performance (Speed) guideline—notify of features that may slow the system. Member sync and performance and “membership limited to certain pages; shortcode adjustments” documented. Sessionlog has performance note and handoff. Pagination for CRM list is in sessionlog backlog.
- **Next:** First priority (Tenant admin team management, Settings → Users, Owner flag) or Phase 09 content protection / login redirect. Key files: `src/app/(public)/members/layout.tsx`, `src/lib/automations/on-member-signup.ts`, `src/app/admin/crm/contacts/`, `docs/prd.md`, `docs/planlog.md`, `docs/sessionlog.md`.

**Changes:**
- **Public header:** Welcome {displayName} and Log Out when logged in; Members Area dropdown (Dashboard, Profile, Account). `PublicHeaderAuth`, `PublicHeaderMembersNav`; `AuthUser.display_name` in supabase-auth.
- **Automations:** `src/lib/automations/on-member-signup.ts` (ensureMemberInCrm); auth callback and login page trigger; members layout runs sync only (removed from public layout). `getContactByEmail` uses `.limit(1)`; layout try/catch for missing CRM.
- **Member area:** Profile page (display name, avatar URL) via `MemberProfileForm`; Apply code block on dashboard; `createMemberForContact` in members layout so redeem-code works.
- **CRM:** deleteContact in crm.ts; DELETE in `/api/crm/contacts/[id]`; ContactDeleteButton on detail page. List: Full name column, order Last/First/Full name/Phone/Status/Updated. ensureMemberInCrm updates existing contact full_name from member display name.
- **Docs:** PRD—Performance (Speed) and Member sync and performance; membership limited to certain pages; shortcode adjustments when implemented. Planlog—Performance guideline at top; Phase 9C Performance bullet; membership limited + shortcode note. Sessionlog—performance note; member routes step 4 updated; pagination for CRM in backlog.

### 2026-02-03 CT - Auth: password policy, forgot/change password, TOTP on Profile, 2FA optional, invite redirectTo, tenant auth header

**Context for Next Session:**
- **Auth/password/TOTP work done.** Password policy (12 chars, denylist) in `src/lib/auth/password-policy.ts`; forgot password flow (link, `/admin/login/forgot`, `/admin/login/reset-password`) with policy; My Profile change-password card and Security card with TOTP (MFAManagement); 2FA required only for superadmin on login; CRM recommendation banner on Profile; invite redirectTo our reset-password so first password meets policy; tenant site name on auth pages; hardening confirmed. Deeper auth-page design deferred to client site design.
- **Next:** First priority in sessionlog — Tenant admin team management (Settings → Users, Owner flag). Key docs: `docs/sessionlog.md`, `docs/planlog.md`.

**Changes:**
- **Password policy:** `src/lib/auth/password-policy.ts` (min 12, max 128, denylist, normalizePassword, validatePassword, buildExtraDenylist).
- **Forgot password:** Login page "Forgot password?" link; `/admin/login/forgot` (request reset); `/admin/login/reset-password` (set new password with policy); success message on login when `?reset=success`.
- **My Profile:** Change password card (current + new + confirm, policy validation); Security card for non-superadmin uses MFAManagement with allowRemoveLastFactor true; CRM 2FA recommendation banner (dismissible) when hasCrmAccess and no factors.
- **MFA:** Enroll redirect when already has factors → `/admin/settings/profile`. Login: only superadmin without factors forced to enroll; tenant admins optional.
- **Invite:** POST tenant-sites users and POST settings team pass `redirectTo: origin + /admin/login/reset-password` so invite acceptance uses our policy.
- **Tenant auth pages:** Layout resolves site name when unauthenticated; AdminLayoutWrapper shows tenant site name header on login/forgot/reset-password.
- **Sessionlog:** Top-priority block replaced with completed summary; next up = First priority (Tenant admin team management).

### 2026-02-03 CT - Phase 09 sub-phases (9A, 9E, 9B, 9D) sessionlog; Phase 12 cancelled

**Context for Next Session:**
- **Sessionlog is unchanged** and ready for tomorrow: Phase 09 (membership working), 9C (members & ownership), 9A (code redemption UI), 9E (gallery enhancement), 9B (marketing research), 9D (AnyChat integration) each have ordered steps or plan references. Pick up from **Next up** in `docs/sessionlog.md`.
- **Phase 12 (Visual Component Library):** Cancelled in planlog. We use the simple Code Library (code blocks/snippets), not a visual component catalog or page section editor; all Phase 12 items marked N/A.
- **Key docs:** `docs/sessionlog.md` (next steps), `docs/planlog.md` (Phase 09 overview table, 9A/9C/9E “What we built vs what we need,” 9B/9D full scope, Phase 12 cancelled).

**Changes:**
- **Planlog:** Phase 9A “What we built vs what we need” and Phase 9E same (with built/still-needed bullets); Phase 9E overview table and checkboxes updated; Phase 12 status set to Cancelled, all items marked [x] N/A (retained for reference).
- **Sessionlog:** Phase 9A steps (member Apply code, login access code, no-ambiguous preset); Phase 9E steps (external video embed, thumbnail strip, taxonomy filter, shortcode UX, deferred); Phase 9B block (research 2 email platforms, plan reference); Phase 9D block (review AnyChat docs, add integration, plan reference). Sessionlog kept as-is for next session.

### 2026-02-03 CT - View as Role + Site, sub-level feature guards, Roles UI hierarchy

**Context for Next Session:**
- **View as Role + Site** is implemented and tested: Superadmin dashboard card (Site + Role selector), cookie override, red banner with Exit, layout uses `getEffectiveFeatureSlugs(tenantId, roleSlug)` when active; Superadmin link stays visible. No git push this session.
- **Feature hierarchy:** Top-level ON = all sub-items allowed (sidebar + route guard); top-level OFF = only explicitly enabled sub-items. Sub-routes mapped (contacts, marketing, forms, memberships, code_generator); `canAccessFeature` and FeatureGuard use parent slug so having CRM grants all CRM sub-routes.
- **Roles & Features UI:** Toggling a top-level (e.g. CRM) ON turns on all its sub-items; toggling OFF turns off all sub-items. Operator can then turn individual sub-items on manually. Applies to all top-level sections.
- **Next:** Smoke-test core flows; Settings → Team; or add new items to sessionlog. Sessionlog cleared to a clean slate.

**Changes:**
- View as Role + Site: `src/lib/admin/view-as.ts`, layout override in `admin/layout.tsx`, banner + Exit in `AdminLayoutWrapper`, `ViewAsCard` on Superadmin page; force-dynamic layout; guard when view-as active never pass "all".
- Sub-level guards: `pathToFeatureSlug` for contacts, marketing, forms, memberships, code_generator, lists→marketing; sidebar CRM/Media sub-nav by featureSlug; `FEATURE_PARENT_SLUG` and `canAccessFeature` parent rule; FeatureGuard uses `canAccessFeature`.
- RolesManager: top-level toggle adds/removes parent + all children; help text updated. Planlog View as Role + Site checked off.

### 2026-02-03 CT - Sessionlog cleanup; View as Role + Site planned

**Context for Next Session:**
- **Sessionlog is now lean.** Removed completed build-plan items, long MVP checklist, terminology table, route/table renames, and Superadmin layout detail. Sessionlog keeps only: current focus, next up, and View as Role + Site (planned). For full history and backlog use `planlog.md` and `changelog.md`.
- **Done (lives in planlog/changelog only):** Effective features (sidebar filter + FeatureGuard modal), profile (migration 087, Settings → Profile), dynamic header (site + role), content editor full page, migrations 081–087, tenant sites/users/roles UI, route renames. No need to re-read these in sessionlog.
- **Next:** Smoke-test core flows; then Settings → Team or View as Role + Site implementation. View as Role + Site spec is in sessionlog (short) and planlog (Phase 18b).

**Changes:**
- **Sessionlog:** Pruned to ~50 lines. Kept: workflow, current focus, next up, View as Role + Site (planned), handoff pointer. Removed: MVP "What's left" list, build plan with done/remaining checkboxes, terminology table, route and table renames, Superadmin layout bullets.
- **Changelog:** This entry added.

### 2026-02-03 CT - Session wrap: Coming Soon snippet, Tiptap alignment, Site Mode UX

**Context for Next Session:**
- **Migrations 088 & 089:** If not yet run, copy `supabase/migrations/088_tenant_sites_coming_soon_message.sql` and `089_tenant_sites_coming_soon_snippet_id.sql` into Supabase SQL Editor and run in order. Adds `coming_soon_message` and `coming_soon_snippet_id` to `tenant_sites`.
- **Priority next step** (sessionlog): Change content creation editor from **modal to full page** with a **back button top left**; modal is too small. Tracked in planlog under Admin content UI.
- **Coming Soon:** Site Mode (General Settings + Superadmin → Tenant Sites → detail) uses a **snippet dropdown** (Content library, type Snippet). Coming Soon page renders the selected snippet with formatting, links, images, galleries when set; otherwise falls back to headline/message from settings. Snippets API: `GET /api/settings/snippets`, `GET /api/admin/tenant-sites/[id]/snippets`.
- **Tiptap:** Rich text editor has **left/center/right/justify** alignment in toolbar; `@tiptap/extension-text-align@2.1.13`; same extension in `ContentWithGalleries` for public render.
- **Key files:** `GeneralSettingsContent.tsx`, `TenantSiteModeCard.tsx`, `src/app/(public)/coming-soon/page.tsx`, `RichTextEditor.tsx`, `ContentWithGalleries.tsx`, `src/lib/supabase/tenant-sites.ts`, `src/lib/supabase/content.ts` (getSnippetOptions, getContentByIdServer), site-mode API routes, `ComingSoonSnippetView.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Coming Soon (snippet-based):** Migrations 088 (coming_soon_message), 089 (coming_soon_snippet_id). Types and CRUD for both; site-mode GET/PATCH return/accept coming_soon_snippet_id. Snippet dropdown (Select) in General Settings and TenantSiteModeCard; options from GET snippets APIs. Coming Soon page fetches snippet by id when set and renders via ComingSoonSnippetView; else uses getComingSoonCopy(). Radix Select "None" uses value `__none__` (empty string not allowed). updateTenantSite returns `{ ok, error }` so API can return real DB errors to client.
- **Tiptap text alignment:** Added @tiptap/extension-text-align; toolbar buttons (AlignLeft, AlignCenter, AlignRight, AlignJustify) in RichTextEditor; TextAlign in ContentWithGalleries EXTENSIONS for generateHTML.
- **Sessionlog:** "Priority next step" — Content editor modal → full page with back button. **Planlog:** Unchecked item under Admin content UI for same.

### 2026-02-03 CT - Session wrap: quick wins (migration 085, remove Integrations from Superadmin)

**Context for Next Session:**
- **Migration 085** (`supabase/migrations/085_client_admins.sql`) is added but not run. When ready: copy contents into Supabase SQL Editor and run. Tables: `client_admins` (id, user_id, email, display_name, status), `client_admin_tenants` (admin_id, tenant_id, role_slug). Next step is types + lib + auth/session resolution for these tables (step 1 in sessionlog).
- **Integrations** removed from Superadmin: sidebar no longer shows Integrations link; Superadmin dashboard card for Integrations removed. Header scripts (GA, VisitorTracking, SimpleCommenter) remain in Code Snippets / integrations table; route `/admin/super/integrations` and API still exist if needed.
- **Build plan** in sessionlog unchanged: after running 085, do client_admins lib + auth resolution, then tabbed Dashboard, Users page, etc.

**Changes:**
- Added `supabase/migrations/085_client_admins.sql`: `client_admins`, `client_admin_tenants` tables; grants to authenticated and service_role.
- Sidebar: removed Integrations from `superadminSubNav`; updated comment.
- Superadmin dashboard (`/admin/super`): removed Integrations card.
- Sessionlog: noted quick wins in Done; step 1 migration checkbox; step 2 Integrations done.

### 2026-02-03 CT - Modular design, feature boundaries, per-module version marking (docs)

**Changes:**
- **PRD:** New subsection “Modular Design & Feature Boundaries” (after Deployment Model). Code organized by product feature so each feature can be identified and updated or selectively synced to forks; principle “one feature ≈ one coherent boundary.” Light **version marking (per module)** documented — forks may diverge, so version control can be per module (comment header or manifest) to compare and selectively update.
- **prd-technical:** New section 8 “Feature Boundaries & Modular Code Map” with feature → paths table (Content, CRM, Media, Galleries, Forms, Settings, Auth/MFA, Superadmin, Public). New subsection “Version Marking (Per Module)” with options A (comment header), B (manifest), C (Git); recommend Option A to start.
- **planlog:** New phase “Code Review, Security, Optimization & Modular Alignment” — documentation (design) items checked; security review, optimization pass, modular alignment (refactor), and optional version marking as unchecked tasks.

**Key files:** `docs/prd.md`, `docs/prd-technical.md`, `docs/planlog.md`.

### 2026-02-03 CT - Session wrap: build fixes, tenant roles/features/team/profile plan

**Context for Next Session:**
- **Build passes:** Lint and type errors fixed across multiple files (Link usage, escaped entities, script/API/auth types, login Suspense for useSearchParams). `pnpm run build` completes successfully.
- **MVP plan in sessionlog:** Tenant roles, feature scope, team, and profile. Seven-step plan: (1) feature registry + role_features, (2) tenant features + getEffectiveFeatures, (3) Phase 03 client_tenants/client_admins/client_admin_tenants + role, (4) superadmin UI (roles, tenant features, assign users), (5) sidebar/route enforcement, (6) Settings → Team (tenant admin adds Editor/Creator/Viewer only), (7) profile pages (super under Superadmin; admin/team under Settings). Execute in that order.
- **Key files:** `docs/sessionlog.md` (plan and focus), `docs/planlog.md` (Phase 03, 18, 18b reference). No DB or RLS left in a vulnerable state.

**Changes:**
- Code: ESLint/TypeScript fixes (super page Link; MFAChallenge, FormEditor, ColorsSettings, FontsSettings escaped entities; add-gallery script, galleries page, CRM mags, form submit, galleries mags route, redeem-code route, supabase-auth, content-protection, code-snippets, galleries-server, galleries.ts, licenses; login and admin/login Suspense for useSearchParams). Build succeeds.
- Docs: sessionlog updated with full roles/features/team/profile plan and profile step; completed items (donor folder, build passes) pruned from sessionlog. MVP focus = execute plan steps 1–7.

### 2026-01-30 CT - PRD and planlog: specs and planning (no code changes)

**Context for Next Session:**
- **Documentation-only session.** Significant updates to PRD and planlog to capture product and technical specs for future development. No code or migrations changed.
- **Planning added/updated:** Page composition (sections in public schema; content UUID/title); RAG Knowledge Document (Phase 16a), Digicards (Phase 11b); central automations layer (trigger/response); FAQ block content type; color palette refactor (preset library in public schema); reusable sections/component library in public schema; **Tenant Team Members, roles & profile** (Phase 18b — Creator role, per-role feature set, team member profile as source for Digicards; Team ≠ CRM).
- **Next priorities** unchanged: Phase 11 Deployment Tools, reusable components; implement specs when ready.

**Key Files Changed:**
- `docs/prd.md` — Tenant Team Members & Roles (Creator, per-role feature set, custom roles, team member profile; Team ≠ CRM); Color Palette (central preset table in public); Page composition (sections library in public schema); Admin Users = Team Members; MAG vs Roles updated
- `docs/planlog.md` — Phase 00 (creator role); Phase 01 (color palette refactor: central preset in public); Phase 06 (page composition sections in public, FAQ block, content UUID); Phase 07 (central automations layer); Phase 11b (Digicards ↔ team profile); Phase 12 (component library in public schema); Phase 16a (RAG Knowledge Document); Phase 18 (per-role note); Phase 18b (Tenant Team Members, Roles & Profile)

**Changes:**
- PRD: Team members & roles (Creator, editor, viewer, client_admin; custom roles; per-role feature set); team member profile (access + Digicards source); Team ≠ CRM. Color palette and sections library: central tables in public schema.
- Planlog: New/expanded phases and tasks for automations, FAQ block, color palette refactor, sections in public, RAG, Digicards, and Phase 18b (team, roles, profile).

### 2026-01-30 CT - Session wrap: Code Generator Explore page, RAG + Digicards planning

**Context for Next Session:**
- **Code Generator complete** (admin-side): Create batches, generate codes, redeem via API. "Explore" button opens dedicated batch detail page (`/admin/crm/memberships/code-generator/batches/[id]`) with redemption table and contact links. Testing pending: create a batch and redeem to verify.
- **Next priorities:** (1) Phase 11 Deployment Tools (setup, reset, archive scripts), (2) Reusable components + component library for public pages.
- **Planning added:** Phase 16a (RAG Knowledge Document for external AI agents), Phase 11b (Digicards).
- **Deferred:** End-to-end membership testing until public pages exist.

**Key Files Changed:**
- `src/app/admin/crm/memberships/code-generator/batches/[id]/page.tsx` — new batch detail page
- `src/app/admin/crm/memberships/code-generator/batches/[id]/BatchExploreClient.tsx` — client component for redemption table
- `src/app/admin/crm/memberships/code-generator/CodeGeneratorClient.tsx` — "Explore" button, removed codes modal
- `src/app/api/admin/membership-codes/batches/[id]/codes/route.ts` — added contact_id to response
- `docs/planlog.md` — Phase 9A codes API checked off; Phase 16a, 11b added

**Changes:**
- Code Generator: "View table" → "Explore" button; dedicated page with Code, Status, Contact/Email (link to contact), Redeemed timestamp.
- Planlog: Phase 16a (RAG Knowledge Document Export), Phase 11b (Digicards).

### 2026-01-30 CT - Session wrap: Membership, Code Generator, Phase 11 priority

**Context for Next Session:**
- **Synced to planlog:** Multi-MAG schema (gallery_mags junction), GalleryEditor Membership Protection, gallery MAG access (checkGalleryAccess, standalone + API), Member login page.
- **Phase reorder:** Phase 11 (Deployment Tools) before Phase 10 (API). API dev deferred until component structure exists.
- **Next priorities:** (1) Membership wrap-up (items not requiring public pages), (2) Phase 9A Code Generator, (3) Phase 11 Deployment Tools, (4) Reusable components + component library for public pages.
- **Deferred:** End-to-end membership testing until public pages exist for reliable testing.
- **Sessionlog** pruned and updated with new focus.

**Key Files Changed:**
- `docs/sessionlog.md` — rewritten with new priorities
- `docs/planlog.md` — checked off completed items, Phase 10/11 status updated

### 2026-01-30 CT - Gallery Phase 2: ImagePreviewModal assign media to galleries

**Context for Next Session:**
- **Gallery Phase 2** complete. ImagePreviewModal has "Assign to galleries" section: checkbox badges for published galleries, add/remove media via gallery_items. Migrations 071–073 ran successfully.
- **Next:** Gallery Phase 3 (GalleryEditor media picker with taxonomy filter), or Phase 4 (shortcode spec, parser, GalleryRenderer).

**Key Files Changed:**
- `src/lib/supabase/galleries.ts` — getPublishedGalleries, getGalleriesForMedia, addMediaToGallery, removeMediaFromGallery
- `src/components/media/ImagePreviewModal.tsx` — Assign to galleries section with checkbox badges

**Changes:**
- Galleries lib: getPublishedGalleries, getGalleriesForMedia (with gallery name/slug), addMediaToGallery, removeMediaFromGallery.
- ImagePreviewModal: Assign to galleries section; load published galleries and current assignments; toggle to add/remove media from galleries.

### 2026-01-30 CT - Members Table & Ownership (User Licenses)

**Context for Next Session:**
- **Phase 9C (Members & Ownership)** implemented: `members` and `user_licenses` tables, utilities, types. Migrations 072, 073 ready to run in Supabase SQL Editor. See `docs/reference/members-and-ownership-summary.md` for design.
- **Elevation flow:** Simple signup = contact only. Member = purchase OR admin grant OR signup code. Form `auto_assign_mag_ids` only for qualifying forms.
- **Next:** Run migrations 072 and 073 in Supabase; continue Gallery Enhancement Phase 2 (ImagePreviewModal assign media to galleries) or Phase 9A Code Generator (requires members table).

**Key Files Changed:**
- `supabase/migrations/072_members_table.sql` — members(contact_id, user_id nullable), RLS
- `supabase/migrations/073_user_licenses_table.sql` — user_licenses(member_id, content_type, content_id), RLS
- `src/lib/supabase/members.ts` — getMemberByContactId, getMemberByUserId, createMemberForContact, resolveMemberFromAuth
- `src/lib/supabase/licenses.ts` — hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership
- `src/types/database.ts` — members, user_licenses types
- `docs/reference/members-and-ownership-summary.md` — design summary
- `docs/planlog.md` — Phase 9C added and items checked off
- `docs/sessionlog.md` — Phase 9C items completed

**Changes:**
- Members table: qualified contacts (MAG + auth). Existence of row = member; user_id nullable until register.
- User licenses table: per-item ownership for media and courses (iTunes-style "My Library"). Access: MAG OR ownership.
- Members utilities: getMemberByContactId, getMemberByUserId, createMemberForContact (idempotent), resolveMemberFromAuth.
- Licenses utilities: hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership.

### 2026-01-30 CT - MAG mag-tag creation, content-protection helper, Gallery Enhancement plan

**Context for Next Session:**
- **Gallery Enhancement** is the priority. Start with Phase 1: migration for galleries (status, access_level, required_mag_id), GalleryEditor status field. Then Phase 2: ImagePreviewModal assign media to galleries; Phase 3: taxonomy filter in gallery media picker; Phase 4–6: shortcode, builder UIs, public page. Full plan in planlog "Gallery Enhancement" section.
- **Membership protection testing** depends on galleries being functional. After galleries: member auth, checkContentAccess, filter gallery items by mag-tag, end-to-end testing.
- **MAG mag-tags:** On MAG create/update, taxonomy tag `mag-{uid}` auto-created in image, video, membership sections. Existing MAGs: save on detail view creates tag.
- **content-protection.ts:** Helper to resolve mag-tags on media, check user MAGs for visibility. Ready for gallery API integration once member auth exists.

**Key Files Changed:**
- `src/lib/supabase/taxonomy.ts` — ensureMagTagExists, addMagTagSlugToSections, membership section
- `src/lib/mags/content-protection.ts` — getMagTagSlugsOnMedia, canAccessMediaByMagTags, filterMediaByMagTagAccess, getMagUidsForContact
- `src/app/api/crm/mags/route.ts` — call ensureMagTagExists after create
- `src/app/api/crm/mags/[id]/route.ts` — call ensureMagTagExists after update
- `src/app/admin/crm/memberships/[id]/MAGDetailClient.tsx` — Dialog warning when UID/MAG-TAG changed (unsync relations, manual update)
- `supabase/migrations/070_add_membership_taxonomy_section.sql` — membership section for mag-tag grouping
- `docs/planlog.md` — Gallery Enhancement phase (7 phases)
- `docs/sessionlog.md` — focus galleries first, then membership

**Changes:**
- MAG create/update: auto-create taxonomy tag `mag-{uid}` in image, video, membership sections. Idempotent.
- Membership taxonomy section: new staple section for filtering mag-tags in Taxonomy Settings.
- MAGDetailClient: UID/MAG-TAG change warning dialog (relations unsync, manual update needed).
- content-protection: resolve mag-tags on media, filter by user MAGs for visibility.
- Gallery Enhancement plan: schema, assignment (media↔galleries), shortcode (spec, parser, renderer), builder UIs, public page.

### 2026-01-29 22:45 CT - Contact Detail UI Restructure & Memberships Complete

**Context for Next Session:**
- **Memberships (CRM MAG management):** Complete and tested. List/detail/create/edit MAGs, assign from MAG detail and from contact detail, draft visibility, search with auto-suggest, confirmation dialogs.
- **Contact Detail UI:** Restructured following design reference. Main card: name+company top left, clickable status badge + Edit top right, two columns (Contact Info with Person icon row | Address), Form Submission Message with Copy to Notes. Tabbed section below: Notes | Taxonomy | Custom Fields | Marketing Lists | Memberships. Tab content cards sized appropriately.
- **Developer Cheatsheet:** Created `.cursor/rules/cheatsheet.mdc` with common commands (kill Node processes, port management, Next.js cache clearing) and useful links (docs, Supabase, tools). Localhost section at top for quick access.
- **Ready for:** Mag-tag restriction for media/galleries (auto-create `mag-{uid}` tags, filter gallery by user's MAGs).

**Key Files Changed:**
- `src/app/admin/crm/contacts/[id]/page.tsx` - Restructured layout, added Person icon row with last name + full name
- `src/app/admin/crm/contacts/[id]/ContactDetailTabs.tsx` - New tabbed interface component
- `src/app/admin/crm/contacts/[id]/ContactDetailClient.tsx` - Added `activeSection` prop, modal confirmation for MAG removal, clear button for search, useEffect to sync notes on refresh
- `src/app/admin/crm/contacts/[id]/ContactCardStatusBadge.tsx` - Clickable status badge with modal
- `src/app/admin/crm/contacts/[id]/CopyMessageToNotesButton.tsx` - Already had router.refresh()
- `.cursor/rules/cheatsheet.mdc` - New developer reference file
- `docs/sessionlog.md` - Pruned completed items, updated for next session
- `docs/planlog.md` - Phase 09 status updated to Complete

**Changes:**
- **Contact Detail Layout:** Name + company at top left; clickable status badge (opens modal) + Edit button at top right; two columns: Contact Information (Person icon with last name, full name | Email | Phone | Company) and Address (Street | City, State, ZIP); Form Submission Message section below with Copy to Notes button.
- **Tabbed Interface:** Notes, Taxonomy, Custom Fields, Marketing Lists, Memberships tabs. Each tab renders in a card (min-height 450px). State preserved when switching tabs (one ContactDetailClient instance with activeSection prop).
- **Memberships Tab:** Search bar with clear button (X when text entered), auto-suggest dropdown, modal confirmation dialog when removing membership (not suppressed by Cursor browser).
- **Copy to Notes:** Added useEffect to sync notes state when initialNotes changes, so Notes tab updates immediately after copy.
- **Cheatsheet:** Commands for killing Node processes, checking ports, clearing Next.js cache, full clean restart. Links to Next.js, React, TypeScript, Tailwind, shadcn/ui, Supabase, Lucide icons, dev tools.

### 2026-01-29 - CRM wrap-up; sessionlog pruned; next: memberships
- **Context for Next Session:** CRM Custom Fields section is complete (form filter, persist accordion open state, PATCH custom-fields API, inline edit per row). Sessionlog synced to planlog and pruned; items that will be implemented with memberships remain in sessionlog. **Next:** Membership code — Memberships page (`/admin/crm/memberships`), MAG list/select/contacts, list/create/edit MAGs; then Review walk-through; Boei integration in a future session.
- **Updated:** `docs/sessionlog.md` — Wrapped up CRM (Custom Fields form filter, persist open, inline edit, API). Checked off and removed completed items; kept §4 Memberships (MAG tables/RPCs, mags.ts, Admin Memberships page), §5 Review, §6 Boei for next work. Current focus set to memberships.
- **Synced:** Completed sessionlog steps matched and checked in `docs/planlog.md` (Phase 08 Custom Fields already marked done).
- **Note:** Doc(s) moved to `docs/archived` to keep root clean (per user).

### 2026-01-28 (session wrap-up) - CRM/forms evaluation; Boei next session
- **Context for Next Session:** CRM and forms in good shape. This session: evaluation and sessionlog update (sidebar "New" badge, fixed "New" status, status on Taxonomy card, contact list columns/sort/clickable row, form submit API and submissions list). **Next up:** Optional Custom Fields form filter; Phase 09 Memberships; full review walk-through. **Next session:** Review [Boei](https://boei.help/) docs—page widget (forms, links, chatbot); use Boei API to add forms/submissions into CRM. Sessionlog §6 has the Boei review task.
- **Updated:** `docs/sessionlog.md` — Added §6 Next session: Boei integration (review); Context updated for handoff.

### 2026-01-28 (evaluation) - CRM and forms completed; sessionlog updated
- **Context for Next Session:** CRM and forms are in good shape. **Completed (this session / evaluation):** Sidebar "New" badge (red counter on CRM header, slug `new`; fixed "New" status in Settings → CRM—non-deletable, slug read-only); status selector on contact detail Taxonomy card (Save persists status + taxonomy, `router.refresh()` updates Contact card); contact list columns (Last name, First name, Email, Phone, Status, Updated), sort by last name, whole row clickable to view; form submit API and submissions list (`/admin/crm/forms/submissions`). **Next up:** Optional Custom Fields form filter on contact detail; Phase 09 Memberships (MAG list, select MAG → contacts) if not done; then full review walk-through.
- **Updated:** `docs/sessionlog.md` — Added "Completed (this session / evaluation)" summary; checked off form submission API, form submissions view, and Contact Status §8; reordered Forms §3 (submit + submissions done, filter-by-form deferred); updated Context for changelog handoff.

### 2026-01-28 17:30 CT - Session wrap-up: Forms page fixes, custom field types, form-field assignment plan
- **Context for Next Session:** Forms page (`/admin/crm/forms`) fixed and extended. **Error fetching forms** resolved: `forms` table lacked `auto_assign_tags` / `auto_assign_mag_ids`; migration 059 added those columns. `forms.fields` NOT NULL caused "null value in column fields" on create; migration 060 made `fields` nullable + default `[]`. Removed `.from()` fallback in `getForms` (prd-technical: reads via RPC only). Added `formatSupabaseError` in crm.ts for clearer RPC errors. Custom field types: **select** and **multiselect**; options in `validation_rules.options` (one per line in UI). Forms tab: add/edit/delete form definitions (name, slug). **Next up:** **Assign form fields to form** — Form = logical grouping of custom fields. Steps in `sessionlog.md` §3 (migration for form–field link, RPC/crm.ts, Forms UI multi-select, API). **Filter by form on contact Custom Fields tab** deferred until form-field assignment is done.
- **Updated:** `sessionlog.md` — Form registry (list, new, edit) marked done and pruned; added "Assign form fields to form" (migration, RPC, UI, API) and "Filter by form on contact Custom Fields tab (later)". Context for next session.
- **Updated:** `planlog.md` — Phase 08 form registry UI marked done (Custom Fields + Forms tabs, select/multiselect, migrations 059/060); added "Assign form fields to form" and optional contact-filter steps.
- **Updated:** `src/lib/supabase/crm.ts` — `formatSupabaseError`, `getForms` RPC-only (no `.from()` fallback).
- **Updated:** `src/app/admin/crm/forms/CrmFormsClient.tsx` — Custom field types select/multiselect; options textarea in modal; `validation_rules.options` on save.
- **Added:** `supabase/migrations/059_add_missing_forms_columns.sql` — add `auto_assign_tags`, `auto_assign_mag_ids` to `forms`.
- **Added:** `supabase/migrations/060_fix_forms_fields_column.sql` — make `forms.fields` nullable, default `[]`.

### 2026-01-26 19:00 CT - Session wrap-up: Phase 05 check-off, build/runtime fixes, docs
- **Context for Next Session:** Content phase (1–13) complete. Dev server runs clean; `/admin/content` loads without Fast Refresh full-reload errors. **Phase 05** (Media Library) checked off in planlog; **Phase 06** (Content, legacy redirects) done. **Fixes this session:** `@radix-ui/number` added as explicit dependency (resolve "Module not found" build error); Content page split into `ContentPageClient` + server `page` with `<Suspense>` around `useSearchParams` (fix "Fast Refresh had to perform a full reload due to a runtime error"). Sessionlog cleared; planlog and changelog updated.
- **Updated:** `planlog.md` — Phase 05 marked complete (core), deferred items noted; "Phase 05 created: media, media_variants" in schemas section.
- **Updated:** `package.json` — `@radix-ui/number` ^1.1.1.
- **Updated:** `admin/content` — `ContentPageClient.tsx` (client, `useSearchParams`), `page.tsx` (server, `Suspense` wrapper).
- **Updated:** `sessionlog.md` — pruned completed steps; Current Focus / Next Up reset for next session.

### 2026-01-26 17:15 CT - Legacy routes redirect (Step 12)
- **Context for Next Session:** Step 12 complete. `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]` redirect to `/admin/content?type=post`; `/admin/pages` redirects to `/admin/content?type=page`. Content page reads `?type=` and sets type filter. Phase 06 content work done. `PostEditor` unused (can remove later).
- **Updated:** `admin/content/page.tsx` — `useSearchParams`, `useEffect` to set `typeFilter` from `?type=`.
- **Replaced:** `admin/posts/page`, `admin/posts/new/page`, `admin/posts/[id]/page` — redirect to `/admin/content?type=post`.
- **Added:** `admin/pages/page.tsx` — redirect to `/admin/content?type=page`.

### 2026-01-26 16:45 CT - Public blog/page routes (Step 11)
- **Context for Next Session:** Step 11 complete. Public routes: homepage `/` (page slug `/` or fallback), blog list `/blog`, single post `/blog/[slug]`, dynamic pages `/[slug]`. `RichTextDisplay` renders Tiptap JSON → HTML with prose. `generateMetadata` for post/page titles. Duplicate `app/page.tsx` removed; `(public)/page` is sole homepage. Added `@tiptap/core` for `generateHTML`. Next: legacy redirects (12).
- **Added:** `RichTextDisplay` (StarterKit, Image, Link; `generateHTML` + prose), `(public)/blog/page`, `(public)/blog/[slug]/page`, `(public)/[slug]/page`.
- **Updated:** `(public)/page` — fetch page `/`, render or fallback; `package.json` — `@tiptap/core`.
- **Removed:** `app/page.tsx` (use `(public)/page` only).

### 2026-01-26 15:30 CT - Settings twirldown, sub-page routing, Content Types/Fields placeholders
- **Context for Next Session:** Settings is now a sidebar twirldown with sub-pages (General, Fonts, Colors, Taxonomy, Content Types, Content Fields, Security, API). Default settings page is General. Content Types and Content Fields are placeholders for the content phase. Sidebar + settings routing ready before building the content system.
- **Sidebar**
  - Settings is a twirldown: link to `/admin/settings` (redirects to General) + chevron to expand/collapse. Sub-links: General, Fonts, Colors, Taxonomy, Content Types, Content Fields, Security, API (order as specified).
  - Persist open state in `localStorage` (`sidebar-settings-open`). When on any `/admin/settings` route, keep twirldown open and set stored state to open.
- **Settings routing**
  - `/admin/settings` redirects to `/admin/settings/general`. New sub-pages: `general`, `fonts`, `colors`, `taxonomy`, `content-types`, `content-fields`, `api`. `security` unchanged.
  - Fonts/Colors: server page fetches `getDesignSystemConfig`, client wrapper holds state and saves via `POST /api/admin/settings/design-system`. Taxonomy remains `TaxonomySettings` on its own page.
  - General and API: migrated from former tabs. Content Types and Content Fields: placeholder cards (manage types; manage custom fields per type).
- **Removed** `SettingsTabs`; MFA enroll redirect when user has factors now goes to `/admin/settings/security`.
- **Files:** `Sidebar.tsx`, `settings/page.tsx` (redirect), `settings/general|fonts|colors|taxonomy|content-types|content-fields|api/page.tsx`, `FontsSettingsPageClient`, `ColorsSettingsPageClient`, `api/api-base-url.tsx`, `mfa/enroll/page.tsx`.

### 2026-01-26 14:00 CT - SimpleCommenter documented as dev feedback tool (not blog comments)
- **Context for Next Session:** SimpleCommenter is explicitly documented as a development/client feedback tool for pinpoint annotations on the site during dev/staging. It must be disabled in production. It is not a blog comment system; blog comments are a separate, future consideration.
- **Added:** `prd.md` — "Third-Party Integrations" section describing Google Analytics, VisitorTracking.com, and SimpleCommenter (purpose, when to enable/disable, "not blog comments").
- **Added:** `prd-technical.md` — "SimpleCommenter (simple_commenter)" subsection under Integrations (purpose, config, script injection, blog comments clarification).
- **Updated:** `IntegrationsManager.tsx` — SimpleCommenter description: "Client feedback tool for dev/staging: pinpoint annotations on the site. Disable in production. Not for blog comments."
- **Updated:** `integrations.ts` — JSDoc; `(public)/layout.tsx` — comment above SimpleCommenter script.
- **Updated:** `planlog.md` — Script injection bullet now states SimpleCommenter is dev feedback, disable in production, not blog comments.

### 2026-01-24 23:30 CT - Media Library: Images/Videos, Taxonomy Filters, Upload Modal, Video Placeholder
- **Context for Next Session:** Media library now supports images and videos end-to-end. View mode (Images/Videos/All), taxonomy filter row (Categories/Tags, Reset Filters), and Upload Media modal with file upload (images + video, auto-detect) and Add Video URL. Migration 040 adds `media_type` and `video_url`; RPCs updated (DROP then CREATE for return-type change). Grid shows Video icon placeholder when `media_type === 'video'` and no thumbnail. Optional follow-ups: ImagePreviewModal video-specific view, section configs for images/videos, UI to assign taxonomy to media.
- Migration 040 fix and media type support
  - Fixed "cannot change return type" error: DROP custom-schema wrappers and public RPCs before CREATE; recreate wrappers with `media_type`/`video_url` in return, re-grant execute
  - `040_add_media_type_and_video_url.sql`: adds `media_type`, `video_url` to media; updates `get_media_with_variants`, `get_media_by_id`, `search_media` (public + wrappers)
  - Types and `createMedia` already support `media_type`/`video_url`; RPC mapping in `media.ts` returns them
- Step 2: View mode and Upload Media button
  - Header: type dropdown (Images/Videos/All) same line as title, "Upload Media" button, stats use "images"/"videos"/"items" by mode
  - Wrapper: `viewMode` state, filter by `media_type`, persist `mediaLibraryViewMode`, bulk delete "items" wording
- Step 3: Taxonomy filter row
  - Filter row above search: Categories multi-select, Tags multi-select, Reset Filters (clears categories, tags, search; not view mode)
  - `getMediaTaxonomyRelationships(mediaIds)`, `getTermsForMediaViewMode(terms, configs, viewMode)` in taxonomy lib
  - `TaxonomyMultiSelect` dropdown (checkboxes), filter media by selected terms via `taxonomy_relationships`
- Step 4: Upload Media modal – two modes
  - **Upload file:** `MediaFileUpload` – drop/browse, accept images + video (mp4, webm, mov). Auto-detect image vs video; images get variants, videos upload raw, `video_url` = storage URL
  - **Add Video URL:** `AddVideoUrlForm` – URL + optional name, validate YouTube/Vimeo/Adilo, `normalizeVideoUrl`, create media with `video_url`
  - Storage: `validateVideoFile`, `validateVideoUrl`, `uploadVideoFileToStorage`, `getVideoFormatFromFile`, `normalizeVideoUrl`
  - Modal tabs: "Upload file" | "Add Video URL"; title switches by mode
- Step 5: Grid video placeholder
  - `ImageList`: when `media_type === 'video'` and no thumbnail, show Video icon + "Video" label in aspect-square cell; empty state "Upload media to get started"
- **Files changed**
  - `supabase/migrations/040_add_media_type_and_video_url.sql` (DROP+CREATE RPCs, wrappers, grants)
  - `src/types/media.ts` (`MediaCreatePayload.original_format` extended for video/url)
  - `src/lib/supabase/media.ts`, `src/lib/media/storage.ts` (video helpers, validation, upload)
  - `src/lib/supabase/taxonomy.ts` (getMediaTaxonomyRelationships, getTermsForMediaViewMode)
  - `src/components/media/`: MediaLibraryHeader, MediaLibraryWrapper, TaxonomyMultiSelect, AddVideoUrlForm, MediaFileUpload, ImageList

### 2026-01-24 22:45 CT - Taxonomy System: Search, Scroll & Section-Scoped Filtering Architecture
- **Context for Next Session:** Taxonomy management UI is fully functional with search + scroll on all 3 tables (Sections, Categories, Tags). PRD updated with section-scoped filtering architecture explaining how sections act as filters over the shared taxonomy. All form submission issues fixed (no multiple submissions, forms don't disappear after save). Ready to integrate taxonomy into content editors (Posts, Pages, Media) - this is next phase.
- Taxonomy System Documentation & Architecture Update
  - Updated `docs/prd.md` with comprehensive section 4 (Taxonomy System)
  - Added **section-scoped filtering** architecture (new discovery during dev - not in original PRD)
  - Documented two scoping models: suggested sections vs. explicit filtering
  - Real-world use case: Blog section has categories like "Technology", "Travel"; Portfolio section has "Web Design", "Branding" - same shared terms, different per-section availability
  - Added database schema documentation for `suggested_sections` field and `section_taxonomy_config` table
- Search & Scroll Features on Taxonomy Settings UI
  - **Sections Table**: Search by display name/slug + max-h-500px scrollable container + sticky header
  - **Categories Table**: Search by name/slug + hierarchical smart filtering (shows parents if child matches) + scrollable + sticky header
  - **Tags Table**: Search by name/slug + scrollable + sticky header
  - All 3 tables have real-time search filtering as user types
  - Empty state messaging: "No items match your search" or "No items found"
  - Search icons from lucide-react for clear affordance
- Form State Management Improvements
  - Added `saving` state to track form submissions and prevent multiple clicks
  - Button disabled state during submission with loading spinner
  - Fixed full-page loading after save - now reloads data silently without hiding form
  - Form state cleanup when switching between different edit operations (e.g., edit section → edit category no longer conflicts)
  - Tab switching when editing term - switches to appropriate tab so form is visible
  - Delete cleanup - resets form if deleting currently edited item
- Documentation Cleanup (planlog.md)
  - Consolidated session work into main Implementation Phases tracking (Phase 04)
  - Deleted top-level "Quick Session Summary" detail items (kept just summary header)
  - All items already marked [x] in main phase tracking
  - Clean session handoff structure with "Important Context for Next Session"
- **Files Changed:**
  - Updated: `src/components/settings/TaxonomySettings.tsx` (search/scroll on all 3 tables, form state management, improved UX)
  - Updated: `src/types/taxonomy.ts` (no changes, already had correct types)
  - Updated: `src/lib/supabase/taxonomy.ts` (no changes, already had correct functions)
  - Updated: `docs/prd.md` (section 4: Taxonomy System with section-scoped filtering architecture)
  - Updated: `docs/planlog.md` (session cleanup, Phase 04 documentation, context for next session)
- **Testing:** All 3 tables show search functionality + scrolling. Real-time filtering works correctly. Sticky headers stay visible while scrolling. Form state management prevents conflicts when editing different items.
- **Next Steps:** Integrate taxonomy into content editors (Post editor, Page editor, Media upload). Create category selector component (hierarchical) and tag input component (autocomplete). Add taxonomy filtering to admin content lists.

### 2026-01-24 19:00 CT - Color Palette System Enhancement: Extended Presets, Global Palette Table & Live Preview
- **Context for Next Session:** Color palette system significantly enhanced with 20+ predefined palettes, global per-tenant palette storage (persistent across sections), and live preview sections on both Colors and Fonts settings pages. UX improved with better palette browsing, selection, and real-time visual feedback. Design system fully functional and ready for content editor integration.
- Color Palette System Expansion
  - Extended predefined palette library from 8 to 20+ professional palettes
  - Added palettes covering multiple design systems and use cases (Material Design, Tailwind, Nord, Dracula, Solarized, GitHub, Gruvbox, One Dark, Catppuccin, etc.)
  - Each palette includes descriptive metadata for browsing and categorization
- Global Palette Data Table (Per-Tenant)
  - Created new `global_palettes` table to store saved color palettes per tenant (persistent storage)
  - Implemented per-tenant isolation - each tenant's palettes stored separately in client schema
  - Palettes accessible across all sections and content editors
  - Added RPC function to retrieve global palettes by tenant (bypassing PostgREST schema search issues)
  - Enables users to save custom palettes and reuse across project
- Live Preview Sections
  - **Colors Settings Page:** Added live preview section showing:
    - Current selected colors in a visual grid/swatch display
    - Real-time updates as colors are changed
    - Sample text/UI elements showing how colors apply in context
  - **Fonts Settings Page:** Added live preview section showing:
    - Font family previews with sample text in different weights
    - Real-time rendering as font selections change
    - Size and weight variations displayed
  - Both previews use actual CSS variables for consistency with deployed design
- Enhanced UX
  - Improved palette selection UI with search/filter capability
  - Better visual feedback when switching palettes
  - Preview updates smoothly as user makes changes
  - Saved palettes listed separately from presets for easy access
- **Files Changed:**
  - New: `supabase/migrations/026_create_global_palettes_table.sql` (per-tenant palette storage)
  - New: `supabase/migrations/027_create_global_palettes_rpc.sql` (RPC for palette retrieval)
  - New: `supabase/migrations/028_enable_rls_global_palettes.sql` (security policies)
  - Updated: `src/components/settings/ColorsSettings.tsx` (live preview section added)
  - Updated: `src/components/settings/FontsSettings.tsx` (live preview section added)
  - Updated: `src/lib/supabase/design-system.ts` (global palette functions)
  - Updated: `docs/prd.md` (Design System section updated with global palettes feature)
  - Updated: `docs/planlog.md` (phase update with new palette features)
- **Testing:** Live previews render correctly and update in real-time. Global palettes persist across page reloads. Per-tenant isolation verified. All 20+ preset palettes load and apply successfully.
- **Next Steps:** Integrate design system settings into content editors. Implement palette selection in post/page/media editing. Add color/font overrides per content type if needed.

### 2026-01-22 18:30 CT - Color Palette Layout, Planlog Update, .cursor Duplicate Cleanup
- **Context for Next Session:** Color palette UI uses 3×5 grid (Alternate 1 in row 2, Alternates 2–6 in row 3). Labels match schema (Alternate 1–6). Planlog includes "Color palette schema evolution (consider)" for `color01`–`color15` + user-defined labels. Docs live only in `docs/`; `.cursor/` holds only `rules/`. Ready to test palette features, continue Phase 02/05, or explore color01–color15 when desired.
- Color palette layout (ColorsSettings)
  - Reorganized to **3 rows × 5 columns** to fix unbalanced 5-column grid (core 9 = 5+4, alternates 6 = 5+1)
  - Row 1: Primary, Secondary, Accent, Background, Background Alt
  - Row 2: Foreground, Foreground Muted, Border, Link, Alternate 1
  - Row 3: Alternate 2–6
  - Single "Brand & theme colors (15)" section; merged former Core/Alternate blocks
- Reverted label renames (no Hover / Alternate 1–5)
  - Kept schema keys as `alternate1`–`alternate6`; display labels stay "Alternate 1"–"Alternate 6"
  - Avoids label/schema mismatch (e.g. "Alternate 1" ↔ `alternate2`)
- Planlog: added "Color palette schema evolution (consider)" to Session Continuation
  - Future option: `color01`–`color15` fixed keys + user-defined labels; store labels separately; migration from current keys
  - Enables flexible naming (e.g. Hover, Success) without schema changes
- Removed duplicate docs from `.cursor/` root (accidental copy/paste)
  - Compared 14 `.md` files in `.cursor/` vs `docs/`; 13 identical, `planlog.md` differed (docs newer, has color-palette step)
  - Deleted all 14 duplicates from `.cursor/`; `docs/` is sole source of truth for project docs
  - Retained `.cursor/rules/` (coding.mdc, MCP.md, structure.mdc)
- **Files Changed:**
  - Updated: `src/components/settings/ColorsSettings.tsx` (3×5 grid, single palette section, label revert)
  - Updated: `docs/planlog.md` (color01–color15 step in Session Continuation)
  - Deleted: 14 duplicates from `.cursor/` root (`ADDING_NEW_TABLES_CHECKLIST.md`, `ADDING_NEW_TABLES.md`, `ARCHITECTURE_DECISION_SCHEMAS.md`, `changelog.md`, `CLIENT_SETUP_CHECKLIST.md`, `MFA_SETUP.md`, `planlog.md`, `prd.md`, `SECURITY_RPC_FUNCTIONS.md`, `SESSION_SUMMARY.md`, `STATUS.md`, `SUPABASE_SCHEMA_SETUP.md`, `TESTING_2FA.md`, `TESTING_SETUP_SCRIPT.md`)
- **Next Steps:** Test palette features; Phase 02 (admin dark theme) or Phase 05 (Media Library); consider color01–color15 when ready

### 2026-01-22 16:38 CT - Color Palette Library & Multi-Schema Table Documentation
- **Context for Next Session:** Color palette system is fully functional. All palettes load correctly. Design System Settings UI complete. Ready to test palette features or continue with Phase 02/Phase 05.
- Implemented 15-color palette system (9 core colors + 6 alternates)
  - Updated `ColorPalette` type to include `alternate1` through `alternate6` colors
  - Updated `DEFAULT_DESIGN_SYSTEM` with default alternate color values
  - Updated CSS variable generation to include alternate colors
  - Updated `DesignSystemSettings` UI with 3-column layout for all 15 colors
- Created color palette library system with database storage
  - Created `color_palettes` table migration (`012_create_color_palettes_table.sql`)
  - Inserted 8 predefined palettes (Material Design, Tailwind, etc.) via migration (`013_insert_predefined_color_palettes.sql`)
  - Created RPC functions in `public` schema to bypass PostgREST schema search issues (`018_create_color_palettes_rpc.sql`)
  - Created `PaletteLibrary` component for browsing, saving, and applying palettes
  - Integrated palette library into Design System Settings UI (2nd position, after fonts)
- Fixed PostgREST custom schema table access issue
  - **Problem:** PostgREST couldn't find `color_palettes` table in custom schema (looked in `public` instead)
  - **Solution:** Created RPC functions in `public` schema that query custom schema (same pattern as `settings` table)
  - **Key Learning:** New tables added after initial schema setup require RPC functions for PostgREST to find them
  - Created comprehensive documentation for this pattern
- Created comprehensive documentation for adding new tables to custom schemas
  - `docs/ADDING_NEW_TABLES.md` - Complete guide with security analysis
  - `docs/ADDING_NEW_TABLES_CHECKLIST.md` - Quick reference checklist
  - `docs/SECURITY_RPC_FUNCTIONS.md` - Security analysis of RPC function workaround
  - Updated `docs/CLIENT_SETUP_CHECKLIST.md` with reference to new table guide
- Architecture decision: Kept multi-schema approach (not switching to multi-tenant tables)
  - RPC function workaround is secure and manageable (~5 min per new table)
  - Better data isolation and compliance benefits
  - Documentation makes pattern repeatable
- Code cleanup
  - Removed debug test route (`/api/admin/color-palettes/test`)
  - Cleaned up console.log statements from palette components
  - Added documentation comments to verification scripts
- **Files Changed:**
  - New: `supabase/migrations/012_create_color_palettes_table.sql`
  - New: `supabase/migrations/013_insert_predefined_color_palettes.sql`
  - New: `supabase/migrations/014_enable_rls_color_palettes.sql`
  - New: `supabase/migrations/015_refresh_postgrest_after_color_palettes.sql`
  - New: `supabase/migrations/016_verify_color_palettes_permissions.sql`
  - New: `supabase/migrations/017_force_postgrest_refresh.sql`
  - New: `supabase/migrations/018_create_color_palettes_rpc.sql`
  - New: `src/types/color-palette.ts`
  - New: `src/lib/supabase/color-palettes.ts`
  - New: `src/components/settings/PaletteLibrary.tsx`
  - New: `src/app/api/admin/color-palettes/route.ts`
  - New: `src/app/api/admin/color-palettes/[id]/route.ts`
  - New: `docs/ADDING_NEW_TABLES.md`
  - New: `docs/ADDING_NEW_TABLES_CHECKLIST.md`
  - New: `docs/SECURITY_RPC_FUNCTIONS.md`
  - Updated: `src/types/design-system.ts` (15-color system)
  - Updated: `src/lib/design-system.ts` (alternate colors)
  - Updated: `src/app/globals.css` (alternate color fallbacks)
  - Updated: `src/components/settings/DesignSystemSettings.tsx` (palette library integration, section reordering)
  - Updated: `docs/CLIENT_SETUP_CHECKLIST.md` (new table guide reference)
  - Updated: `docs/planlog.md` (session continuation section)
- **Next Steps:** Test palette features (create custom palette, apply predefined), continue Phase 02 (admin dark theme), or move to Phase 05 (Media Library)

### 2026-01-21 21:10 CT - Component Library Reference System, CRM Architecture & Workflow Improvements
- Added Component Library Reference System specification to PRD
  - Library-first development workflow (search first, create spec, then build)
  - Component metadata format with JSDoc-style header comments
  - Database schema for component library with development status tracking
  - Image support (screenshots, wireframes, examples) for visual reference
  - Auto-discovery system for component scanning
  - Superadmin UI for component library management (`/admin/super/components`)
  - Component spec creation before development
  - Status tracking (planned → in progress → complete)
  - Tight coupling between library entries and component files via `@library_id`
- Added Phase 13 to planlog for Component Library Reference System implementation
  - Marked as low priority (nice-to-have, not critical for MVP)
  - Comprehensive implementation tasks for library-first workflow
- **Completely redesigned Forms & CRM architecture in PRD (CRM-first approach)**
  - Replaced visual form builder with developer-authored components mapping to CRM fields
  - CRM as source of truth: All contact data lives in CRM tables, not separate form submission storage
  - Company-centric architecture: Companies as first-class entities with robust B2B data
  - Relational data model: Multiple emails/phones per contact, many-to-many contact-company relationships
  - Comprehensive consent management (ICANN/GDPR/TCPA compliance)
    - Consent audit trail with IP address, user agent, timestamp, consent text
    - Email and phone marketing consent tracking
    - Consent withdrawal with automatic DND status updates
  - DND (Do Not Disturb) status management
    - Automatic DND (on unsubscribe, bounce, complaint)
    - Manual DND (admin override)
    - DND enforcement for email/phone marketing
    - DND history audit trail
  - Duplicate detection logic (perfect match → update, partial match → flag for review)
  - Form registry as developer helper (not form builder)
  - Cookie consent management system
    - Cookie categories (essential, analytics, marketing, functional)
    - Browser storage (localStorage) + optional database storage
    - Links to CRM contacts when user identified
    - GDPR/ePrivacy Directive compliant
  - Complete database schema for CRM system (contacts, companies, emails, phones, consents, DND history, cookie consents)
  - Updated API endpoints for CRM operations
- Added CRM implementation phases to planlog
  - Phase 5A: CRM MVP (minimal CRM for Phase 5 membership integration)
  - Phase 10B: CRM-First Forms & Compliance System (full implementation)
  - Detailed implementation tasks for CRM schema, utilities, admin UI, consent management, DND, cookie consent
- Updated workflow documentation (structure.mdc)
  - Changed to single-push approach at session end
  - Update all documentation first, then commit and push everything together
  - More efficient workflow with atomic commits

### 2026-01-21 16:40 CT - Session Wrap-up: Setup Script Testing Ready
- Updated planlog to mark "Test Automated Client Setup Script" as the very next step
- Created comprehensive testing guide (`docs/TESTING_SETUP_SCRIPT.md`)
- Updated Phase 0 status to reflect design system foundation completion
- All changes committed and pushed to GitHub

### 2026-01-21 16:29 CT - Supabase Schema Setup & Design System Foundation
- Fixed PostgREST custom schema access issue using RPC functions
  - Created RPC functions in `public` schema to query custom schemas
  - Updated `src/lib/supabase/settings.ts` to use RPC functions instead of direct table queries
  - Resolved "schema must be one of the following" errors
- Implemented design system loading from database
  - Created `src/lib/design-system.ts` for design system utilities
  - Created `src/components/design-system/DesignSystemProvider.tsx` for CSS variable injection
  - Updated `src/app/layout.tsx` to load and apply design system from database
  - Added default design system settings migration (`003_design_system_settings.sql`)
  - Design system now loads CSS variables and Google Fonts from database
- Created automated client setup script
  - Added `scripts/setup-client-schema.ts` for one-command client schema creation
  - Script automates: schema creation, migrations, RPC functions, RLS policies, storage buckets
  - Added `pnpm setup-client` command to `package.json`
  - Created comprehensive `docs/CLIENT_SETUP_CHECKLIST.md` with automated and manual steps
- Implemented Supabase security best practices
  - Created RLS policies for all tables (`010_enable_rls_and_policies.sql`)
  - Fixed function search_path security warnings (`011_fix_function_search_path.sql`)
  - Created permissions migration for exposed schemas (`004_expose_schema_permissions.sql`)
- Created comprehensive documentation
  - `docs/CLIENT_SETUP_CHECKLIST.md` - Step-by-step client setup guide
  - `docs/SUPABASE_SCHEMA_SETUP.md` - Schema exposure instructions
  - `docs/ARCHITECTURE_DECISION_SCHEMAS.md` - Architecture rationale and alternatives
  - Updated `docs/planlog.md` with test steps for automated setup script
- Created migration scripts for schema setup
  - `004_expose_schema_permissions.sql` - Grant permissions to API roles
  - `005_refresh_postgrest_cache.sql` - PostgREST cache refresh
  - `008_create_settings_rpc.sql` - RPC functions for settings access
  - `009_insert_default_settings.sql` - Default design system values
  - `010_enable_rls_and_policies.sql` - RLS setup
  - `011_fix_function_search_path.sql` - Security fix

### 2026-01-21 14:30 CT - Phase 0: Supabase Auth Integration Implementation
- Implemented Supabase Auth integration replacing custom Auth API
- Created `src/lib/auth/supabase-auth.ts` with authentication utilities:
  - `getCurrentUser()` and `getCurrentUserFromRequest()` for session management
  - `validateTenantAccess()` for multi-tenant schema validation
  - `hasRole()` for role-based access control
  - Helper functions: `isSuperadmin()`, `isClientAdmin()`, `isMember()`
- Updated login flow to use Supabase Auth (`signInWithPassword()`)
- Updated middleware to validate Supabase Auth sessions and enforce tenant access
- Created user management utilities (`src/lib/supabase/users.ts`):
  - Functions for creating Superadmin, Client Admin, and Member users
  - User metadata management and password updates
- Created Superadmin system area (`/admin/super`) with platform-wide utilities
- Updated Sidebar to conditionally show Superadmin link based on user role
- Removed old Auth API code (`api-client.ts`) and dependencies
- Updated session management to use Supabase Auth

### 2026-01-21 09:15 CT - Template Workflow and Feature Planning
- Updated PRD to standardize template → client fork workflow and promotion process back to the template via PRs
- Documented promotable component library vs site-specific glue folder structure and promotion checklist
- Added developer workflow guidance for ingesting UI ideas (Vercel v0/inspiration) and migrating simple Pages Router sites into the template
- Added standby/coming-soon site mode specification for early deployment + domain setup (with SEO safety guidance)
- Added form submission email notifications plan using Nodemailer (SMTP) with documented `SMTP_*` environment variables
- Added Event Calendar as a core feature (public views + event modal, admin management, API endpoints, ICS subscription feed) and tracked implementation tasks in planlog

### 2026-01-21 11:00 CT - Security, Roles, CRM/Memberships, Integrations, and AI RAG Planning
- Formalized role model in PRD/planlog: Superadmin (cross-tenant) + Client Admin + GPU (public visitor) + GPUM (member)
- Expanded Supabase Auth metadata strategy and middleware enforcement for superadmin bypass + tenant scoping
- Added 2FA/MFA requirements and implementation plan (TOTP first; SMS planned for later with external SMS provider)
- Documented image strategy (local vs CDN) and media optimization plan (store original + generate variants; helper utility guidance)
- Extended CRM scope to include membership management; emphasized easy client admin workflows for member status and group assignment
- Simplified ecommerce-to-membership integration to tag-based assignment (no payment transaction duplication; webhook/API key path)
- Added third-party `<head>` integration management as core system capability:
  - Always-on scripts: Google Analytics, VisitorTracking.com, SimpleCommenter.com
  - Vendor IDs stored in superadmin settings; scripts injected into public layouts only
- Added AI chatbot roadmap: CMS content as RAG knowledge base (Supabase PGVector) as a later phase in PRD/planlog

### 2026-01-20 15:00 CT - Membership Platform Architecture
- Added comprehensive membership platform section to PRD
- Documented dual authentication system (admin users vs member users)
- Added membership groups and access control architecture
- Documented content protection system (public, members, group access levels)
- Added database schema for membership system (membership_groups, members, user_memberships tables)
- Updated route structure with member routes (`/login`, `/register`, `/members/*`)
- Added admin routes for membership management (`/admin/memberships`, `/admin/members`)
- Added Phase 5: Membership Platform to planlog with detailed implementation tasks
- Renumbered subsequent phases (Archive/Restore, Reset, CLI, Storage, API, Polish)
- Updated architecture notes with membership platform details
- Added membership-specific future enhancements to planlog

### 2026-01-20 10:00 CT - Documentation and Architecture Planning
- Merged detailed implementation plan into `docs/planlog.md`
- Organized implementation phases (0-10) with priority order
- Documented Supabase Auth integration strategy
- Updated PRD with complete Supabase Auth architecture
- Enhanced multi-schema strategy documentation
- Updated `.cursor/rules/structure.mdc` with planlog workflow (items never deleted, only checked off)
- Initialized Git repository
- Set up project for multi-machine development (docs synced via Git)

### 2024-12-XX - Authentication System Change
- Changed from custom Auth API to Supabase Auth
- Removed dependency on external auth web app
- Implemented multi-tenant auth using Supabase user metadata
- Users associated with tenant schemas via `user_metadata.tenant_id`
- Simplified authentication flow with native Supabase Auth integration
- Updated environment variables (removed AUTH_API_URL and AUTH_API_KEY)
- Enhanced multi-schema strategy documentation

### 2024-12-XX - Architecture Documentation
- Added Developer-Centric Component Architecture section to PRD
- Documented Archive & Restore System architecture
- Added CI/CD & Maintenance Strategy documentation
- Added Project Lifecycle Management section
- Updated project structure to reflect component library approach

### 2024-12-XX - Documentation Restructure
- Separated planning from change history
- Created `planlog.md` for planned work and backlog
- Updated `changelog.md` to focus on completed changes only
- Added cross-references between documentation files
- Created `structure.mdc` with documentation structure specifications

### 2024-12-XX - Single App Architecture Refactor
- Refactored from multi-deployment subdomain model to single-app path-based routing
- Moved admin routes to `/admin/*` structure
- Updated middleware for new route protection model
- Consolidated public and admin into single Next.js app
- Updated all component navigation links to new paths
- Updated middleware to redirect `/admin` to `/admin/dashboard` or `/admin/login`

### 2024-12-XX - Documentation Consolidation
- Moved `prd/prd.md` to `docs/prd.md`
- Converted `prd/plan.md` to `docs/changelog.md`
- Merged README.md content into PRD
- Updated `.cursorrules` to reflect new documentation structure
- Removed outdated README.md

### 2024-12-XX - Initial Implementation
- Project structure initialized
- Next.js 15 with TypeScript configured
- Tailwind CSS and shadcn/ui setup
- Supabase client with schema switching
- Authentication middleware and API integration
- Database migration system created
- Core type definitions

**Phase 1: Foundation**
- Initialized Next.js 15 project with TypeScript
- Set up Tailwind CSS and shadcn/ui
- Configured Supabase client with schema switching
- Created authentication middleware
- Set up project structure

**Phase 2: Database & Schema Management**
- Created Supabase migration system
- Implemented schema creation utility

**Phase 3: Core Admin UI**
- Dashboard layout with navigation
- Media library (upload, list, manage)
- Blog posts CRUD with rich text editor
- Basic settings page

**Phase 4: Advanced Content Types**
- Gallery management
- Form builder
- Form submissions CRM view

**Phase 5: REST API**
- Implemented all API endpoints
- Added rate limiting
- Added response caching

**Phase 6: Polish & Deployment**
- Error handling and validation
- Loading states and UX improvements
- Deployment configuration
- Documentation