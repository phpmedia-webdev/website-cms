# Plan Log

This document tracks planned work and remaining tasks for the Website-CMS project. For session continuity (current focus, next up), see [sessionlog.md](./sessionlog.md).

**Performance:** Document any feature that may slow the system (extra DB/API calls, sync on high-traffic paths). See [prd.md](./prd.md) — Performance (Speed).

**Workflow:** Check off items when completed; add summary to changelog. Completed work may be condensed here; open items are kept for a clear picture of what remains.

---

## Completed / Reference

- **Taxonomy UI** (Settings → Taxonomy): Sections, categories, tags, media assignment. Post/Page integration and auto-assign Uncategorized not done.
- **Settings:** Twirldown + sub-pages (General, Fonts, Colors, Taxonomy, Content Types, Content Fields, Security, API). Content Types and Content Fields full UIs.
- **Content phase:** Unified model (content, content_types, content_type_fields), admin UI, Tiptap, taxonomy, public blog/pages, legacy redirects.
- **Tenant admin team:** Settings → Users, Owner flag, GET/POST/PATCH team API, RLS. View as Creator hides Users link.
- **Calendar one-step create:** Taxonomy, participants (type-to-search team + CRM), resources (multi-select) on new events; applied on submit. Steps 1–4 done.
- **CRM contacts list:** Pagination (25/50/100), selection, bulk actions (Export, Add/Remove list, Change status, Taxonomy, Delete, Restore, Empty trash), Show Trashed, backend `deleted_at` and bulk APIs.

---

## Remaining Work (by phase)

### Phase 00: Supabase Auth Integration

**Status:** In progress. Core auth, MFA (TOTP), password policy, integrations, and superadmin area done.

- [ ] Test Automated Client Setup Script (required before deploying a fork)
- [ ] Superadmin → Tenant Sites → [site] → Site URL field (for gallery standalone URL prefix)
- [ ] Template (root) domain deployment: Vercel, env vars, superadmin user, test auth
- [ ] Integrations: test script injection, enable/disable, superadmin-only access
- [ ] 2FA: API route AAL checks; RLS for AAL if needed; edge cases (session refresh, last factor); testing
- [ ] SMS/Phone 2FA: deferred

### Phase 01: Foundation & Infrastructure

- [ ] Color palette: central preset library in public schema; tenant custom palettes only in tenant

### Phase 02: Superadmin UI

- [ ] Admin dark theme (optional; previously decided to skip)

### Phase 03: Tenant Admin Management (Tenant Sites & Users)

**Status:** Complete. Tenant Sites, Tenant Users, site mode + lock, invite on add user.

- [ ] Optional: Custom email template for new admin welcome; tenant-specific login URL in template

### Phase 04: Tenant Admin UI

**Status:** Complete. Sidebar, Dashboard, Content, Media, Galleries, Forms, CRM, Settings.

### Phase 05: Media Library

**Status:** Core complete. Deferred: local copy workflow, `createClientBucket`/`renameBucket`, `getImageUrl`, `POST /api/media/[id]/optimize`, video embed on public.

- [ ] Deferred: Local copy workflow (schema, local-copy.ts, UI)
- [ ] Deferred: Video embed component for public pages

### Phase 06: Content Management

**Status:** Core complete.

- [ ] Document content-by-UID for code library; example snippets
- [ ] Optional: FAQ block content type (create/edit, body or fields, public render)

### Phase 07: CRM

**Status:** Core complete (schema, contacts list + detail, Activity Stream, taxonomy, custom fields, MAGs, marketing lists, forms, submissions, bulk actions, trash).

- [ ] Optional: `crm_consents`; auto-assign tags on form submit; central automations layer; push to external CRM; Activity Stream dashboard widget

### Phase 08: Forms Management

**Status:** Complete.

- [x] **skipped** Optional: "Edit all" mode in Custom Fields section (contact detail)

### Phase 09: Membership (MAG, Protection, Code Generator)

**Status:** Core complete (MAG schema, gallery + media protection, code generator, member routes, Apply code, membership feature switch). Remaining:

- [ ] Content protection (blog/pages): `checkContentAccess`, gate blog + dynamic [slug], redirect to login with return URL; never send restricted body to unauthorized users
- [ ] Protected video: `/api/stream/media/[id]` proxy (verify session + MAG, stream bytes)
- [ ] Protected download: `/api/download/media/[id]` (proxy or expiring signed URL)
- [ ] Vimeo domain restriction plan; consider Roku/OTT if needed
- [ ] Membership and media: Red "M" badge on gallery list/grid and media library; optional backfill from mag-tags
- [ ] Content editor: section-level restrictions; Tiptap protected text (shortcode); menu item restrictions
- [ ] Ecommerce: `api_keys` table, payment webhooks (Stripe/Shopify/WooCommerce), payment-to-MAG flow
- [ ] Member auth: optional register page; `/api/auth/member/*`; middleware for member routes
- [ ] Dashboard: membership stats; `/admin/members` list; link form submissions to member profiles (email match)

### Phase 9C: Members Table & Ownership

**Status:** Schema and utilities complete. Admin assign MAG → create member done.

- [ ] Optional: First-time code redemption (register with code on login)
- [ ] Update LMS Phase 17 plan to use `user_licenses` for course enrollment

### Phase 9A: Code Generator & Redemption

**Status:** Core complete. Apply code on member dashboard done.

- [ ] Optional: "No ambiguous" character preset in admin generator UI; custom exclude list

### Phase 9E: Gallery Enhancement

**Status:** Core complete (shortcode, GalleryEmbed, GalleryPreviewModal with image + native video, MAG protection).

- [ ] GalleryPreviewModal: external video embed (YouTube/Vimeo/Adilo); thumbnail strip; zoom/pan for images
- [ ] Gallery page: filter items by media taxonomy (categories/tags) in header
- [ ] Future: Content–gallery linking (junction, editor UI); gallery style templates & presets

### Phase 10: API Development

**Status:** Deferred (after Phase 11).

- [ ] Enhance public API (error handling, SEO metadata, pagination, search/filter); ensure protected endpoints check MAG
- [ ] Form submission email notifications (Nodemailer/SMTP, env vars, mailer utility)
- [ ] API documentation (docs/api.md, endpoints, auth, MAG, rate limiting)

### Phase 11: CLI & Deployment Tools

- [ ] Setup script (`setup-new-client` or extend setup-client): interactive CLI, schema, migrations, bucket, env validation, assign superadmin
- [ ] Client script generator: form for new client vars → output SQL for copy/paste into Supabase SQL Editor
- [ ] Reset script (`scripts/reset-content.ts`); archive script (`scripts/archive-project.ts`)

### Phase 11b: Digicards

**Status:** Planned (future). Digital business cards, team member profile as data source. See prd-planned.md.

### Phase 12: External Integrations

**Status:** 12A (Marketing/Vbout), 12B (AnyChat) planned. Visual component library cancelled (Code Library used instead).

### Phase 13: Archive & Restore

- [ ] Archive registry table; `archive.ts` (archiveProject, restoreProject, listArchived); admin UI; API (POST archive, GET list, POST restore)

### Phase 14: Reset for Clean Template

- [ ] Reset utilities (resetContent, resetDesignSystem, resetMedia, fullReset); admin UI; POST /api/admin/reset

### Phase 15: Polish & Testing

- [ ] Error handling (boundaries, user-facing 404/500, membership denied); loading states; type safety; unit/integration tests

### Phase 16a: RAG Knowledge Document Export

**Status:** Complete. Content flag `use_for_agent_training`; live endpoint GET /api/rag/knowledge?part=N; dashboard metric and multi-URL copy; auto-split by token limit (8k default).

### Phase 16: RAG Chatbot

**Status:** Future (vector DB, content indexing, RAG retrieval, LLM, chat widget, membership-aware).

### Phase 17: LMS (Courseware)

**Status:** Future (courses, lessons, progress, course_mags, user_licenses).

### Phase 18: Feature Gating & Custom Links

- [ ] Schema: sidebar feature gating + custom links per tenant
- [ ] Superadmin UI: toggle features per tenant; add/edit/delete custom sidebar links
- [x] Sidebar: load config, render disabled as ghosted or upsell URL; block disabled routes
- [ ] API: GET/PUT tenant sidebar config; GET current tenant sidebar config

### Phase 18b: Team Members, Roles & Profile

- [x] Roles: Creator (content-only), editor, viewer, client_admin; per-role feature set
- [ ] Optional: custom roles
- [ ] Team member profile (name, email, role, avatar, bio, photo, social links, digicard_slug); admin UI; source for Digicards

### Code Review, Security & Modular Alignment

- [ ] Security review (auth, RLS, input validation, per-feature pass)
- [ ] Optimization (bundle, queries, caching); modular alignment to feature boundaries
- [ ] Optional: per-module version marking

---

## Architecture Notes (reference)

- **Auth:** Supabase Auth; admin vs member; `tenant_id` in metadata; middleware validates schema.
- **2FA:** TOTP primary; AAL1/AAL2; superadmin always aal2; client admin sensitive routes aal2.
- **Multi-tenant:** Single schema per deployment; isolation via env and metadata.
- **MAG:** access_level (public/members/mag), visibility_mode, optional section/shortcode/menu restrictions.
- **Design system:** CSS variables at root; settings in DB.
- **Archive/Restore:** Schema rename + registry; bucket rename.

---

## Future Enhancements

- SEO tools, sitemap, analytics, form submission email, content scheduling, multi-language
- Membership: payment integration, subscriptions, activity tracking, expiration reminders, member directory
- RAG chatbot, design system presets, component library docs, backup scheduling

---

## Technical Debt

- [ ] Review/optimize DB queries; error boundaries; TypeScript coverage; unit/integration tests; logging; image upload optimization

---

## Notes

- Check off items when completed; add summary to changelog. Refer to `docs/prd.md` and `docs/prd-technical.md` for specs and feature boundaries.
