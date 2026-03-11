# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For planned work and backlog items, see [planlog.md](./planlog.md). For session continuity (current focus, next up), see [sessionlog.md](./sessionlog.md).

## [Unreleased]

### 2026-03-11 17:00 CT — Phase 09 Ecommerce steps 1–6, product editor refinements

**Summary:** Phase 09 Ecommerce foundation steps 1–6 are complete: CRM billing/shipping addresses, Product content type and taxonomy, related `product` table, code/batch schema for coupons, and Ecommerce nav with Products list and dedicated product create/edit pages. Product editor refinements this session: (1) **Product visibility MAGs** — "Who can see this product" is now independent of "Membership to grant on purchase." Migration 130 adds `visibility_mag_ids` (uuid[]) to `product`; shop can show a product to one or more memberships (e.g. parent org) while granting a different membership on purchase. (2) **Membership picker for scale** — Replaced checkbox list with `AutoSuggestMulti`: search bar with autocomplete and selected memberships as removable badges (X), so 25–50–100+ memberships remain usable. (3) **Content/product edit UX** — Featured image for all content types (picker, 125px preview, clear); "Use for AI Agent Training" moved to bottom of Status card; product Status card shows created/updated dates; Membership tab copy clarified ("Who can view this product" / "Which membership(s) can see this product"). Other: core content types rendering and App Version Number (dashboard from mvt.md) marked complete per sessionlog.

**Context for Next Session:** Step 6 (Ecommerce nav + Products list) is complete. Next in Phase 09: **Step 7** (Product lib + RPC/API for shop/catalog and product detail). Run migration `130_product_visibility_mag_ids.sql` in Supabase SQL Editor if not yet applied. Sessionlog has remaining Phase 09 steps 7–29 and backlog (Banners, Carousel shortcode).

- [x] **1. CRM addresses (billing + shipping):** Treat existing `crm_contacts` address fields as **billing**. Add shipping columns: `shipping_address`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`. Use shipping for delivery when any shipping field is set; otherwise use billing for both. Migration; update `CrmContact` type and RPCs; contact detail/edit UI: Billing address (existing) + Shipping address (optional, "if different").
- [x] **2. Product content type:** Add "Product" to `content_types` (slug e.g. `product`) as a **core default** (can't delete). Show it in **Settings → Customizer → Content types** and in **Settings → Taxonomy** so taxonomy can be applied to products. Hide it only from the main **Content list** view (products managed under Ecommerce → Products). Products are content rows with this type; use taxonomy for product categories/tags.
- [x] **3. Core taxonomy sections not deletable:** In Settings → Taxonomy, core sections (for core content types) must not be deletable. Identify core/system sections (e.g. by content_type or flag) and disable or hide Delete for them in the taxonomy UI.
- [x] **4. Related `product` table:** Migration (tenant schema). Columns: `content_id` (UUID FK → content.id, UNIQUE, NOT NULL), `price` (numeric/decimal; used at checkout, not pushed to Stripe), `currency` (text, default USD), `stripe_product_id` (text nullable; Stripe Product ID only; no Stripe Price), `sku` (text nullable), `stock_quantity` (integer nullable; null = no stock tracking; off by default), `gallery_id` (UUID nullable FK → galleries), `taxable` (boolean, default true), `shippable` (boolean, default false), `available_for_purchase` (boolean, default true). RLS; one row per product content. Product image gallery = featured_image_id (content) + gallery_id (product) → gallery_items for extra images.
- [x] **5. Code/batch schema for ecommerce:** Migration: add `use_type` to `membership_code_batches`; add discount columns or `coupon_discounts` table. Update batch create/edit UI and code generator for use_type and discount fields when use_type = discount. (Needed before checkout can apply coupons.)
- [x] **6. Ecommerce nav + Products list:** Add **Ecommerce** top-level sidebar nav; under it, **Products** (and later Orders). Products list shows only content where type = Product (join to `product` table). Single place for product management. Reuse existing components (content table, shortcodes, galleries, media).

- [x] **Proper rendering for core content types** - Like FAQ, Accordion, Quotes. Some CSS styling may be required. Is this a front end Dev feature and not needed for basic content entry?
- [x]**App Version Number** — Add app version to the admin dashboard; derive from mvt.md document.


---

### 2026-03-11 CT — Sessionlog cleanup: completed items removed, backlog lean

**Context for Next Session:** (See previous entry for full session context.) Sessionlog cleaned per workflow: completed Phase 2b block, all completed Other/Backlog items (Media Copy Shortcode, Share-intent, Terms and Policys, CRM Sorting, Form Submission List, Form Data Export, Code Generator Module), and the Code Generator Workflow section (scenarios + CG.0–CG.8 steps) removed. Backlog now lists only: Proper rendering for core content types, App Version Number, Banners. "Where we are" and "Next up" updated to reflect current state.

**Changes:**
- **Sessionlog:** Removed completed Phase 2b checklist; removed seven completed backlog lines and entire Code Generator Workflow section; kept only three unchecked backlog items. Shortcode "Done" summary updated to include Phase 2b.

---

### 2026-03-11 CT — Session wrap-up: Code Generator module complete, form submissions export, codes search

**Context for Next Session:** Code Generator module is complete (CG.0–CG.8). Batches list is a table; create-batch modal has scrollable body. Unified codes table (single-use + multi-use redemption rows) with batch and status filters, simple search bar (max 20 chars, client-side filter on code), Export CSV (filtered view), and record count. Manual "Mark used" for single-use codes on batch detail page (POST `/api/admin/membership-codes/codes/[id]/mark-used`). Redeem API and `redeemCode()` return `batch_id` for workflows (CG.1). Generator uses per-run duplicate prevention only (no DB pre-load). Form submissions list has date-range presets (including "All dates"), pagination, and CSV export with field picker. Codes block button row aligned (items-end, h-9). **Deferred:** MAG/membership column in codes table (user opted to hold off). **Next up:** See sessionlog — core content types rendering, App Version Number, Banners, or other backlog. Planlog Phase 9A updated with Code Generator module summary.

**Changes:**
- **Code Generator:** Batches table (Name, MAG, Type, Codes/Usage, Expires, Actions). Create modal scrollable. Unified codes API `GET /api/admin/membership-codes/codes?batchId=&status=&limit=`, Codes card with batch/status filters, search (max 20 chars), Export CSV, `codesFiltered` useMemo. Mark-used API and "Mark used" button on batch Explore page. `RedeemResult.batchId` and redeem API response `batch_id`. Duplicate prevention in generator: per-run only, comment in code.
- **Form submissions:** Date presets (All dates, 24h, 7d, 30d, custom), pagination (25/50/100), URL sync. Export CSV: GET export-fields, POST export with form + date range + selected fields; Export button and modal with form and field picker. "X records in range" moved to footer center.
- **Docs:** Sessionlog Code Generator Module marked complete; planlog Phase 9A updated.

**Key files:** `src/app/admin/crm/memberships/code-generator/CodeGeneratorClient.tsx`, `src/app/api/admin/membership-codes/codes/route.ts`, `src/app/api/admin/membership-codes/codes/[id]/mark-used/route.ts`, `src/lib/mags/code-generator.ts`, `src/app/api/members/redeem-code/route.ts`, `src/app/admin/crm/forms/submissions/SubmissionsListClient.tsx`, `docs/sessionlog.md`, `docs/planlog.md`, `docs/changelog.md`.

---

### 2026-03-10 18:30 CT — Session cleanup: Phase 2 Layout complete, step 15 dropped, sessionlog thinned; rules updated

**Context for Next Session:** Shortcode Phase 1, 1a, and Phase 2 (Layout wizard) are complete. Phase 2 uses the composite shortcode `[[layout|widths|height|col1{{COL}}col2...]]`; paired columns/col approach was superseded and removed from sessionlog. Step 15 (prompt/description per picker item) was dropped as not needed. Sessionlog was cleaned: completed Phase 1, 1a, and Phase 2 items were moved to this changelog entry and removed from sessionlog so the log stays thin. Cursor rules: `sessions.mdc` and `coding.mdc` updated so session end workflow is explicit (review chat, mark off sessionlog, add dated changelog entry with Context for Next Session, remove completed items from sessionlog, sync planlog). **Next up:** Phase 2b (form display routine, embed code, Form in picker and Layout wizard), then Phase 3 (Quote, FAQ, Accordion). See sessionlog.

**Changes:**
- **Sessionlog:** Phase 2 step 15 (prompt/description per item) removed — not needed. Phase 2 marked complete (14, 16, 17, 18, 19). Completed Phase 1, Phase 1a, and Phase 2 blocks removed from sessionlog; only Phase 2b, Phase 3, Other/Backlog, Paused remain. Design note updated to composite layout shortcode (no paired columns/col).
- **Cursor rules:** `sessions.mdc` — Ending a work session steps clarified (review chat, mark off sessionlog, add changelog entry with current date/time, move completed work into entry, Context for Next Session, remove completed from sessionlog). `coding.mdc` — Checklist explicitly requires reading `sessions.mdc` for session start/end workflow.

**Key files:** `docs/sessionlog.md`, `docs/changelog.md`, `.cursor/rules/sessions.mdc`, `.cursor/rules/coding.mdc`.

---

### 2026-03-04 16:30 CT — Session wrap-up: Author display from profile, Phase 2b form steps in sessionlog

**Context for Next Session:** Author display now uses the profile "Display name" (Settings → My Profile) when available: (1) Authors API appends current superadmin with `getProfileByUserId` so their profile display name appears in the author dropdown; (2) `getContentAuthorDisplayName` and `getCommentAuthorDisplayName` resolve auth users via new `getAuthUserDisplayName()` helper that checks profile first, then user_metadata (full_name, name, display_name), then email. So updating Display name in My Profile is reflected in the author picker and in post/comment author display. **Sessionlog:** Phase 2b steps added (no coding): 2b.1 Form display routine (inline render for `[[form:id]]`), 2b.2 Embed code in form manager, 2b.3 Form in main shortcode picker, 2b.4 Form in Layout wizard column options; form manager styling deferred. **Next up:** Continue shortcode Phase 2 (Layout wizard) or start Phase 2b (form display + embed + form in picker and Layout). See sessionlog.

**Changes:**
- **Author from profile:** `src/lib/blog-comments/author-name.ts` — `getAuthUserDisplayName()` uses `getProfileByUserId()` first, then Auth user_metadata; `getCommentAuthorDisplayName` and `getContentAuthorDisplayName` use it for auth-user resolution. `src/app/api/admin/authors/route.ts` — when appending superadmin to authors list, use `getProfileByUserId(user.id)` for display_name (profile → user.display_name → null).
- **Sessionlog:** Phase 2b — Form display, embed code, and shortcode integration (CRM): steps 2b.1–2b.4 and "Later" styling item added.

**Key files:** `src/lib/blog-comments/author-name.ts`, `src/app/api/admin/authors/route.ts`, `src/lib/supabase/profiles.ts`, `docs/sessionlog.md`, `docs/changelog.md`.

---

### 2026-03-09 CT — Session wrap-up: Shortcode Phase 1 complete, alignment, media picker, image size params

**Context for Next Session:** Phase 1 shortcodes are complete. Alignment is preserved when rendering: parser reads `text-align` from the containing block before each shortcode; ContentWithGalleries wraps shortcode output in a div with that alignment. Media/image shortcode picker: search (name, Slug/UID, taxonomy/tags via API), scrollable list with max-height, list/grid view toggle; API `/api/shortcodes/media-list` supports `?search=` and returns `uid` (slug); taxonomy search via `getMediaIdsWithTermMatching`. Media library image detail: Slug/UID shown in the blue metadata block (top right) and in Edit Metadata / read-only summary. Phase 1a (styling): Option A decided—params at shortcode only. Media shortcode supports `size` (positional or named: `[[media:id|medium]]`, `[[media:id|size=large]]`); renderer uses Tailwind size classes (small/medium/large/full), default medium; after picking an image, "Image size" dialog lets user choose size before inserting. **Next up:** Sessionlog Phase 2 (paired shortcodes: columns, container, flexbox); optional 9a.3 (align param on media shortcode). Other: Media Copy Shortcode, CRM sorting, Form submission list.

**Changes:**
- **Alignment:** `parse.ts` — `getAlignmentBeforeIndex()`, optional `alignment` on all shortcode parts; `ContentWithGalleries` — `wrapAlignment()` so shortcode output respects paragraph text-align.
- **Media list API:** `GET /api/shortcodes/media-list?search=` — uses `searchMedia()` and `getMediaIdsWithTermMatching()`; returns `id`, `name`, `uid` (slug), `thumbnailUrl`. Taxonomy helper `getMediaIdsWithTermMatching()` in `taxonomy.ts`.
- **Media picker:** `MediaPickerModal` — search input (debounced), list/grid toggle, scrollable area; displays uid in list view.
- **Media library:** `ImagePreviewModal` — Slug/UID in blue block (top right) and in metadata labels (Edit + summary).
- **Media shortcode size:** `parse.ts` — media shortcode parses positional or named `size`; `MediaShortcodeRender` — `MEDIA_SIZE_OPTIONS`, Tailwind size classes, default medium; `ShortcodePickerModal` — after image select, "Image size" dialog with Size dropdown, inserts `[[media:id|size]]`.

**Key files:** `src/lib/shortcodes/parse.ts`, `src/components/editor/ContentWithGalleries.tsx`, `src/app/api/shortcodes/media-list/route.ts`, `src/lib/supabase/taxonomy.ts`, `src/components/editor/MediaPickerModal.tsx`, `src/components/media/ImagePreviewModal.tsx`, `src/components/editor/MediaShortcodeRender.tsx`, `src/components/editor/ShortcodePickerModal.tsx`, `docs/sessionlog.md`, `docs/changelog.md`, `docs/planlog.md`.

---

### 2026-03-09 CT — Session wrap-up: Shortcode MVP planning, sessionlog cleanup, Next up = Shortcode implementation

**Context for Next Session:** This session was planning and discussion only (no shortcode code changes). Shortcode MVP scope agreed: universal shortcode picker (one icon, replace dedicated Image/Gallery toolbar buttons); public shared library table (`shortcode_types`) so new types are available to all tenant sites; parse/render logic stays in app code. Gallery will be repurposed as one shortcode type (picker by id/name). Carousel/rotator = existing gallery + slider display style (no new table). Quote carousel: block-with-rotator option and/or quote shortcode (quotes entity) for reuse. Alignment: Tiptap paragraph alignment applies to shortcode-in-paragraph; renderer should preserve wrapper for front end. Columns/Container/Flexbox = paired shortcodes (open/close); accordion = block or shortcode later. **Next up:** See sessionlog — Shortcode implementation Phase 1 (library table, universal picker, Gallery + Media + simple blocks + Button + Form + Snippet), Phase 2 (paired layout: Columns, Container, Flexbox), Phase 3 (Quotes, FAQ, Accordion entities/pickers). Other backlog: Media Copy Shortcode, CRM sorting, Form submission list, App version number.

**Changes:**
- **Changelog:** This entry.
- **Sessionlog:** Cleaned; completed Signup pipeline, Blog (RSS, SEO, Social Share, comments), GPUM Account settings removed from active list. New **Next up** section: **Shortcode implementation** with detailed steps for Phase 1 (public `shortcode_types` table, universal picker UI, repurpose Gallery, Media/Image, Separator, Section break, Spacer, Clear, Button, Form, Snippet), Phase 2 (paired shortcode parser and Columns, Container, Flexbox), Phase 3 (Quotes, FAQ, Accordion). Other/Backlog: Media Copy Shortcode, Terms and Policys, CRM Sorting, Form Submission List, App Version Number.
- **Planlog:** Shortcode Library MVP added under Phase 06 / Content; reference sessionlog for phased steps.

**Key files:** `docs/sessionlog.md`, `docs/changelog.md`, `docs/planlog.md`.

---

### 2026-03-07 CT — Session wrap-up: Drop-in ComposeEmail, SMTP branding MVP, contact UX, GPUM steps in sessionlog

**Context for Next Session:** Contact outbound email uses drop-in `ComposeEmail` (subject, body, attachments); send-email API and activity log support attachments. SMTP branding MVP: from-name fallback to site name when unset; minimal HTML wrapper for text-only sends. Contact: delete button on edit page only; top row order Status, Merge, Edit, Compose email. #DNC rule rephrased in coding.mdc. GPUM (member area) steps added to sessionlog: dashboard and My Profile in place; Account settings (/members/account) remains placeholder. **Next up:** See sessionlog — GPUM Account settings, blog RSS feed, blog comments, Media Copy Shortcode, CRM/forms/buttons.

**Changes:**
- **ComposeEmail:** New drop-in component `src/components/email/ComposeEmail.tsx` (to, toLabel, defaultSubject/Body, onSubmit, onSent, children as trigger, allowAttachments, maxAttachmentSize, maxAttachments). Dialog-based modal; optional attachments (base64). Contact page uses it via refactored ContactComposeEmailButton.
- **Send email + API:** `sendEmail()` and POST `/api/crm/contacts/[id]/send-email` accept attachments (filename + base64); activity note includes attachment count. `EmailAttachment` type in send.ts.
- **SMTP branding (step 6 MVP):** In send.ts, when from has no display name, fallback to `getSiteMetadata().name`. When only text provided, auto-wrap in minimal HTML (`<p style="white-space: pre-wrap;">`); escapeHtml helper.
- **Contact UX:** Delete button removed from contact detail page; added to contact edit page header. Contact detail top row order: Status, Merge, Edit, Compose email.
- **#DNC rule:** coding.mdc — when user includes #DNC, discussion only; no code/file/terminal unless user later explicitly asks to implement.
- **Sessionlog:** Outbound SMTP steps 4–7 and GPUM dashboard + My Profile marked complete; GPUM section added with remaining GPUM Account settings. Planlog: Completed/Reference updated; Phase 09 GPUM member area (public) checked.
- **Step 7:** Sessionlog step 7 (contact outbound email) checked complete.

**Key files:** `src/components/email/ComposeEmail.tsx`, `src/app/admin/crm/contacts/[id]/ContactComposeEmailButton.tsx`, `src/lib/email/send.ts`, `src/app/api/crm/contacts/[id]/send-email/route.ts`, `src/app/admin/crm/contacts/[id]/page.tsx`, `src/app/admin/crm/contacts/[id]/edit/page.tsx`, `.cursor/rules/coding.mdc`, `docs/sessionlog.md`, `docs/planlog.md`.

---

### 2026-03-05 (afternoon) CT Ã¢â‚¬â€ Session wrap-up: Notifications, SMTP, PWA Status app, blog template, tenant checklist, author

**Context for Next Session:** Notifications hub (Admin Ã¢â€ â€™ Settings Ã¢â€ â€™ Notifications), outbound SMTP (config, encryption, send), and PWA Status app (/status, manifest, push, VAPID) are in place. Form submit triggers notifyOnFormSubmitted; stub entry points exist for contact_joins_membership and member_signed_up. Blog: pagination, categories/tags on post, category/tag archives, author dropdown and display. Tenant setup checklist consolidated; env templates archived. **Next up:** See sessionlog Ã¢â‚¬â€ blog RSS feed, blog comments, SMTP contact-activity logging, Media Copy Shortcode, CRM/forms/buttons.


**Changes:**
- **Notifications settings:** New Admin â†’ Settings â†’ Notifications page (route, nav, feature gate `notifications`). NotificationsSettingsContent: action keys/labels, preferences API (GET/PATCH `/api/settings/notifications/preferences`), SMTP config block, link to Status app. Reference doc `docs/reference/notification-events-and-recipients.md` (form_submitted, contact_joins_membership, member_signed_up; recipients, wiring, adding events).
- **Outbound SMTP:** Tenant settings key `smtp` stores host, port, username, encrypted password (AES-256-CBC), from address, notification_recipients. `src/lib/email/`: smtp-config (get/set, encryption via env), send (nodemailer, sendEmail). Admin General Settings and Superadmin site settings: SMTP form (SmtpConfigForm), test endpoint `/api/settings/notifications/smtp/test`. Form submit API calls `notifyOnFormSubmitted` (email + PWA per preferences); stubs: `notifyOnContactJoinsMembership`, `notifyOnMemberSignedUp`.
- **PWA Status app:** Admin-only `/status` page: site stats (contacts, form submissions, upcoming events, recent activity), push-subscribe UI. Layout: dynamic, manifest link, viewport. Dynamic manifest `/manifest.webmanifest` (name, short_name, icons from PWA settings). PWA settings: `src/lib/pwa/settings.ts`, getPwaSettings/setPwaSettings/getPwaIconUrl; GET/PATCH `/api/settings/pwa`; General Settings card for PWA/install. Push: migration 116 `push_subscriptions` (tenant schema); save subscription POST `/api/settings/pwa/push-subscription`; VAPID public GET `/api/settings/pwa/vapid-public`; `src/lib/pwa/send-push.ts` (web-push), sendPushToSubscription; `public/sw.js` (push, notificationclick); StatusPushSubscribe component. Middleware: `/status` protected. Root layout: manifest link.
- **Tenant setup checklist:** `docs/tenant-site-setup-checklist.md` â€” single living doc for new tenant/fork setup. Merged content from archived zzz-CLIENT_SETUP_CHECKLIST, env-encryption-key-template, env-vapid-keys-template (env vars, VAPID generation, Supabase migrations list, Vercel env section, superadmin user, verification, troubleshooting). Templates archived under `docs/archived/`.
- **Blog template:** Pagination: migration 117 (get_published_posts_dynamic offset, get_published_posts_count_dynamic); getPublishedPosts(limit, offset), getPublishedPostsCount(); `/blog` list with `?page=` and Prev/Next. Categories/tags on single post: getTaxonomyTermsForContentDisplay(post.id, "post"); links to `/blog/category/[slug]` and `/blog/tag/[slug]`. Archive pages: getTermBySlugAndType, getPublishedPostsByTermId, getPublishedPostsCountByTermId; same list + pagination + access filtering as main blog. Author: GET `/api/admin/authors` (site-assigned users); Content Status block Author dropdown; author_id (tenant_user id) in insertContent/updateContent; public `/blog/[slug]` shows "By {display_name or email}" via getTenantUserById.
- **Build fix:** Status page display name: use `user?.display_name` (AuthUser) instead of `user?.user_metadata?.display_name` to fix deployment type error.
**Key files:** `src/app/admin/settings/notifications/`, `src/app/api/settings/notifications/`, `src/app/api/settings/pwa/`, `src/app/status/`, `src/app/manifest.webmanifest/route.ts`, `src/lib/email/`, `src/lib/notifications/`, `src/lib/pwa/`, `src/components/settings/NotificationsSettingsContent.tsx`, `src/components/settings/SmtpConfigForm.tsx`, `src/components/pwa/StatusPushSubscribe.tsx`, `src/app/(public)/blog/` (page, [slug], category/[slug], tag/[slug]), `src/app/api/admin/authors/route.ts`, `src/components/content/ContentEditorForm.tsx`, `src/lib/supabase/content.ts`, `src/lib/supabase/taxonomy.ts`, `supabase/migrations/116_push_subscriptions.sql`, `supabase/migrations/117_get_published_posts_pagination.sql`, `docs/tenant-site-setup-checklist.md`, `docs/reference/notification-events-and-recipients.md`.

---

### 2026-03-05 CT Ã¢â‚¬â€ Session summary: PHP-Auth docs, PRD, Roles step 5, sessionlog cleanup

**Context for Next Session:** PHP-Auth is fully documented as SSOT for roles, features, permissions, and audit. Roles transition step 5 (deprecation doc) complete. Sessionlog is trimmed to start with Next up only. **Next up:** See sessionlog (SMTP + contact activity, PWA notifications, Media Copy Shortcode, Terms/Policys link, CRM sorting, Form submission pagination/filter).

**Changes:**
- **PRD (docs/prd.md):** Technology Stack auth line updated; new subsection *PHP-Auth integration (SSOT for roles, features, permissions, and audit)* under Authentication Ã¢â‚¬â€ identity vs authorization, what PHP-Auth is SSOT for, tenant/gating in website-cms, when PHP-Auth is not configured, summary and reference links. Multi-Client Strategy note added for PHP-Auth-configured path.
- **Roles step 5 Ã¢â‚¬â€ Deprecation doc:** [php-auth-website-cms-tables-cross-reference.md](./reference/php-auth-website-cms-tables-cross-reference.md) Ã‚Â§2 expanded: admin_roles (not SSOT for role definitions; PHP-Auth auth_roles/roles API), role_features (not SSOT for roleÃ¢â€ â€™features), tenant_user_assignments read path (role from validate-user; fallback + team/is_owner), tenant_sites (unchanged; website-cms SSOT). Role resolution and effective-features bullets updated for configured vs fallback.
- **Archive:** authplanlog.md moved to [docs/reference/Repurpose/authplanlog.md](./reference/Repurpose/authplanlog.md); references updated in sessionlog, changelog, MFA-fix-005.
- **Sessionlog:** Where we are, Current Focus, and Remaining work sections removed; log now starts with Next up. Completed Roles step 5 and checklist removed.

---

### 2026-03-04 18:30 CT - Session wrap-up: F6 View As fix, Phase E (E10, E10a, E11)

**Context for Next Session:**
- **F6 and Phase E complete.** View As now uses PHP-Auth for role features when configured; effective = tenant Ã¢Ë†Â© role. Gating (normal user and view-as) uses PHP-Auth when configured via `getRoleFeatureSlugsForGating(roleSlug)` in feature-registry; fallback to local `listRoleFeatureSlugs` when PHP-Auth unavailable or on error. Deprecation documented: admin_roles/role_features are not SSOT for gating (see reference docs).
- **Remaining (optional):** Roles step 5 Ã¢â‚¬â€ document deprecation of read path for admin_roles, role_features, tenant_user_assignments (E10 already covers gating SSOT). **Next up:** See sessionlog (SMTP + contact activity, PWA notifications, Media Copy Shortcode, Terms/Policys link, CRM sorting, Form submission pagination/filter).

**Changes:**
- **F6 Ã¢â‚¬â€ View As Role fix:** `getRoleFeatureSlugsFromPhpAuth(roleSlug)` in `src/lib/php-auth/fetch-roles.ts`. Admin layout when view-as active and PHP-Auth configured: role features from PHP-Auth; effective = tenant Ã¢Ë†Â© role; superadmin view-as Ã¢â€ â€™ "all". Fallback to local when not configured.
- **E10 Ã¢â‚¬â€ Deprecation doc:** [php-auth-ssot-roles-features-plan.md](./reference/php-auth-ssot-roles-features-plan.md) (Phase 3) and [php-auth-website-cms-tables-cross-reference.md](./reference/php-auth-website-cms-tables-cross-reference.md) (Ã‚Â§2): PHP-Auth is SSOT for roleÃ¢â€ â€™feature assignments for gating; admin_roles, role_features fallback only.
- **E10a Ã¢â‚¬â€ Gating from PHP-Auth:** `getRoleFeatureSlugsForGating(roleSlug)` in `src/lib/supabase/feature-registry.ts`; used in `getEffectiveFeatureSlugs`, `getRoleFeatureSlugsForCurrentUser` (resolve-role), and admin layout view-as fallback. Roles 4a done.
- **E11:** Sessionlog trimmed (completed F6, Phase E, 4a removed); changelog and reference plan checklist updated.

---

### 2026-03-04 17:00 CT - Session wrap-up: Phase F F1Ã¢â‚¬â€œF5 complete; one-to-one gate mapping; Superadmin gate display

**Context for Next Session:**
- **Phase F:** F1Ã¢â‚¬â€œF5 done (role slugs in layout, upgrade page, sidebar hide/ghost, FeatureGuard Ã¢â€ â€™ upgrade, copy finalized). One-to-one gate mapping complete for CRM, Marketing, Calendar, Media, Settings, Support; Superadmin sidebar shows gate state (display-only) via `sidebarDisplayFeatureSlugs`. **Remaining:** F6 Ã¢â‚¬â€ View As Role fix (resolve role features from PHP-Auth when view-as active so effective = tenant Ã¢Ë†Â© role is correct).
- **Key files:** `src/app/admin/layout.tsx` (role + effective slugs, `sidebarDisplayFeatureSlugs` for superadmin), `src/components/admin/AdminLayoutWrapper.tsx`, `src/components/dashboard/Sidebar.tsx` (displayEffectiveSlugs, one-to-one sections), `src/lib/admin/route-features.ts` (FEATURE_PARENT_SLUG empty), `src/app/admin/upgrade/page.tsx`, `src/components/admin/FeatureGuard.tsx`, `docs/sessionlog.md` (Phase F remaining: F6).

**Changes:**
- **Changelog:** This entry; sessionlog completed items summarized here.
- **Sessionlog:** Trimmed to lean: all completed items removed (PHP-Auth M0Ã¢â‚¬â€œM5 table, M3 steps, M5 Phases AÃ¢â‚¬â€œD, Roles 1Ã¢â‚¬â€œ4 table, Phase F F1Ã¢â‚¬â€œF5 rows). Only remaining work kept: F6, Phase E (E10, E10a, E11), Roles 4a/5, Next up, Paused/Later. Full completion history in this changelog and planlog.

**Completed (Phase F, from sessionlog):**
- **F1** Role feature slugs in layout: `getRoleFeatureSlugsForCurrentUser()`, both role and effective slugs passed from layout to sidebar/guard.
- **F2** Single upgrade page: `/admin/upgrade` with copy Ã¢â‚¬Å“Not included in your plan. Request supportÃ¢â‚¬Â and CTAs (Back to Dashboard, Quick Support).
- **F3** Sidebar hide by role, ghost by plan: sections hidden when not in role; items in role but not in effective shown ghosted with onClick Ã¢â€ â€™ upgrade page.
- **F4** FeatureGuard redirects to upgrade page (modal then OK Ã¢â€ â€™ `/admin/upgrade`).
- **F5** Copy finalized; upgrade page and FeatureGuard use same message.
- **One-to-one gate mapping:** CRM, Marketing, Calendar, Media, Settings, Support (and children) each gated by own slug; `FEATURE_PARENT_SLUG` cleared; sidebar link/ghost per slug.
- **Superadmin gate display (Option A):** When superadmin, sidebar uses `sidebarDisplayFeatureSlugs` (tenant-enabled slugs) for display only so nav shows ghosted state for gated-off features; guards unchanged (superadmin still has access).

---

### 2026-02-26 CT - Session wrap-up: PHP-Auth conversion milestone; Phase F (gating UX) step plan added

**Context for Next Session:**
- **PHP-Auth migration:** M0Ã¢â‚¬â€œM5 complete. Central store (validate-user, sync-user-role), central-only read (M4), superadmin UI redesign (M5 Phase D: Dashboard, gating table, Users, nav). Roles transition steps 1Ã¢â‚¬â€œ4 done; Step 4a (getEffectiveFeatureSlugs from PHP-Auth) and Step 5 (deprecation doc) pending. Phase E (E10, E10a, E11) and Phase F (gating/role navigation UX) are next.
- **Phase F (new):** Step plan added in sessionlog: role-based hide (sidebar, sub-level), plan-based ghost + single upgrade page, FeatureGuard Ã¢â€ â€™ upgrade page. Steps F1Ã¢â‚¬â€œF5; start next session with F1 (role feature slugs in layout) or 4a (roleÃ¢â€ â€™features for gating).
- **Key files:** `docs/sessionlog.md` (Phase F, Current Focus), `src/lib/auth/resolve-role.ts`, `src/lib/supabase/feature-registry.ts`, `src/components/admin/FeatureGuard.tsx`, `src/components/dashboard/Sidebar.tsx`, `docs/reference/php-auth-ssot-roles-features-plan.md`.

**Changes:**
- **Changelog:** This entry summarizes the PHP-Auth conversion milestone and adds Context for Next Session. Completed work below moved from sessionlog as summaries.
- **Sessionlog:** Cleaned; Current Focus set to Phase F. Phase F Ã¢â‚¬â€ Gating and Role Limit Navigation step plan added (F1Ã¢â‚¬â€œF5). Completed M3/M5/Phase D/Roles items remain as reference in sessionlog; Ã¢â‚¬Å“Recently completedÃ¢â‚¬Â trimmed; two completed Next up items (Roles API hierarchical, PHP-Auth roles 403) removed from Next up.

**Completed (summaries from sessionlog):**
- **M0Ã¢â‚¬â€œM5:** Connect PHP-Auth, populate central, dual-read, writes to central (sync-user-role), central-only read (M4 steps 1Ã¢â‚¬â€œ11), superadmin UI redesign (M5). M3 sync: new endpoint, fullName/newUser, assign/update/remove wired; recovery doc. M5 Phase A (PHP-Auth contract/docs), B (role picker, read-only Roles), C (feature registry from PHP-Auth), D (D6 no site picker, D7 Dashboard + metrics/gating on site detail, D8 Users + Related Tenant Users, D9 nav). Phase E (E10, E10a, E11) and Roles Step 5 pending.
- **Roles transition:** Steps 1Ã¢â‚¬â€œ4 done: role definitions from PHP-Auth, roleÃ¢â‚¬â€œfeatures display, sync + M3 recovery doc, M4 central-only read. Step 4a (getEffectiveFeatureSlugs from PHP-Auth) and Step 5 (deprecation doc) pending.
- **Next up (removed from list as done):** Roles API hierarchical features/permissions (parentSlug, tree, role detail Permissions/Features tabs). PHP-Auth roles 403/display (AUTH_ROLES_SCOPE, scope=website-cms).

---

### 2026-02-17 CT - Session wrap-up: M4 (central-only read) steps 1Ã¢â‚¬â€œ6, validate-user assignment, login UX

**Context for Next Session:**
- **M4:** Steps 1Ã¢â‚¬â€œ6 done: resolve-role no fallback when PHP-Auth configured; middleware uses validate-user for role (Edge); role helpers (isSuperadminFromRole, isAdminRole, isTenantAdminRole). Login still redirects back with Ã¢â‚¬Å“couldnÃ¢â‚¬â„¢t be verifiedÃ¢â‚¬Â on first request despite diagnose showing HTTP 200 and role Ã¢â‚¬â€ likely first request sends old/no session cookie; 500ms delay and router.push added; if still failing, consider middleware calling an internal API (Node) for validate-user instead of Edge fetch.
- **Validate-user:** New API returns `assignment.role` (and permissions/features). We use `getRoleSlugFromValidateUserData(data)` (prefer assignment.role.slug, fallback org). Types and `validateUserWithStatus` added for diagnostics.
- **Login:** Sign out link; reason=no_central_role message + Ã¢â‚¬Å“Check why (diagnose)Ã¢â‚¬Â calling GET /api/auth/validate-user-diagnose; link to validate-user-troubleshooting.md; 500ms delay before router.push after sign-in.
- **Superadmin:** Auth test page (/admin/super/auth-test) runs health, validate-api-key, php-auth-status. New API routes: GET php-auth-health, POST php-auth-validate-key (superadmin or role-based when PHP-Auth configured).
- **Next:** Resolve post-login first-request role check (Edge vs cookie timing or proxy validate-user from Node); then M4 steps 7Ã¢â‚¬â€œ10 (supabase-auth doc, API routes role checks, recovery doc). Key files: `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/lib/php-auth/validate-user.ts`, `docs/reference/m4-central-only-read-plan.md`.

**Changes:**
- **M4 (resolve-role + middleware):** getRoleForCurrentUser/getRoleForCurrentUserOnSite return null when PHP-Auth configured and validate-user fails or no org; getEffectiveFeatureSlugsForCurrentUser uses role only from getRoleForCurrentUser; getTeamManagementContext uses getRoleForCurrentUser when configured; isSuperadminFromRole, isAdminRole, isTenantAdminRole in role-mapping + re-export from resolve-role. Middleware: when PHP-Auth configured, role from validateUser + getRoleSlugFromValidateUserData; super routes require SUPERADMIN, admin routes require admin slug; no Ã¢â‚¬Å“already logged inÃ¢â‚¬Â redirect from /admin/login when configured (avoids loop).
- **Validate-user:** PhpAuthValidateUserAssignment type; validateUserWithStatus(accessToken) returns { data, status }; getRoleSlugFromValidateUserData(data) prefers data.assignment.role.slug. Call sites (resolve-role, middleware, php-auth-status) use getRoleSlugFromValidateUserData.
- **Login:** Sign out button (handleSignOut); reason=no_central_role message with Ã¢â‚¬Å“Check why (diagnose)Ã¢â‚¬Â and validate-user-diagnose API (GET /api/auth/validate-user-diagnose, minimal response); 500ms delay before router.push(redirect) after sign-in.
- **Auth test:** Superadmin Ã¢â€ â€™ Auth test page; GET /api/admin/php-auth-health, POST /api/admin/php-auth-validate-key; php-auth-status and new routes use role-based superadmin when PHP-Auth configured. Sidebar nav link (Activity icon).
- **Docs:** M4 plan test checklist and link to validate-user-troubleshooting; login page and M4 plan reference troubleshooting doc.

---

### 2026-02-17 CT - Session wrap-up: Verify session page shows 2FA bypass state

**Context for Next Session:**
- **Verify session:** When `NEXT_PUBLIC_DEV_BYPASS_2FA` is set, middleware skips the AAL2 requirement so you can access superadmin without completing MFA. The verify-session page now detects this and shows: (1) MFA row detail "Not verified (2FA bypass is on Ã¢â‚¬â€ middleware is not requiring MFA)" and (2) an amber note that 2FA bypass is on and to turn it off to enforce MFA. No logic change Ã¢â‚¬â€ clarifies why "MFA not verified" can appear while you can still reach superadmin.
- **Next:** M4 central-only read (see [reference/m4-central-only-read-plan.md](./reference/m4-central-only-read-plan.md)); optional role-based post-login redirect; then D7/D8 (tabbed Dashboard, Superadmin Users). Sessionlog/planlog unchanged for focus.

**Changes:**
- **Verify session page** (`src/app/admin/super/verify-session/page.tsx`): Import `isDevModeBypassEnabled` from mfa.ts. When bypass is on and AAL is not aal2, MFA check detail explains that 2FA bypass is on and middleware is not requiring MFA. Added amber banner: "2FA bypass is on (NEXT_PUBLIC_DEV_BYPASS_2FA). Middleware is not requiring MFAÃ¢â‚¬Â¦ Turn it off to enforce MFA."

---

### 2026-02-17 CT - Session wrap-up: PHP-Auth roles API scope optional; 403 still pending

**Context for Next Session:**
- **PHP-Auth roles:** Roles are fetched from PHP-Auth only (SSOT). We call `GET {AUTH_BASE_URL}/api/external/roles` with X-API-Key; scope is **optional**: if **AUTH_ROLES_SCOPE** is set we send `?scope=<value>`, otherwise we omit scope so PHP-Auth derives from the API key. New PHP-Auth deployed; when scope omitted it returns **403**: "Application type \"web-app\" does not match any role scope. Valid scopes: php-authhub, website-cms. Set Application type to one of these." With **AUTH_ROLES_SCOPE=website-cms** (added to .env.local) we still saw errors at session end Ã¢â‚¬â€ not yet verified after deploy.
- **Next steps:** (1) In PHP-Auth admin, set the **Application type** for the website-cms application to **website-cms** (instead of web-app) so either omitted scope or `?scope=website-cms` returns 200 and roles. (2) Retest Superadmin Ã¢â€ â€™ Roles and role pickers (Settings Ã¢â€ â€™ Users); remove DEBUG blocks and debug hint on Roles page once working. (3) Ensure roles exist in PHP-Auth for scope website-cms so the list is non-empty.
- **Key files:** `src/lib/php-auth/fetch-roles.ts` (optional AUTH_ROLES_SCOPE), `src/app/api/admin/roles/route.ts`, `src/app/api/admin/php-auth-status/route.ts`, `docs/reference/php-auth-external-roles-api.md`, `.env.local` (AUTH_ROLES_SCOPE=website-cms; do not commit if in .gitignore).

**Changes:**
- **Roles API scope optional:** fetch-roles.ts sends `?scope=...` only when AUTH_ROLES_SCOPE is set; otherwise no query (PHP-Auth uses application type from API key). php-auth-status probe URL updated to match. Docs updated: scope optional; recommend omitting or using app type.
- **Config:** AUTH_ROLES_SCOPE=website-cms added to .env.local to request website-cms roles (valid scopes in PHP-Auth: php-authhub, website-cms). Application type in PHP-Auth for this app is currently web-app, causing 403 when omitted; explicit scope may work after Application type is set to website-cms.
- **Session end:** Roles page still shows "No roles found" until PHP-Auth returns 200 with roles; DEBUG blocks and debug hint left in place for next session.

---

### 2026-02-23 CT - Session wrap-up: PHP-Auth M0 integration (validate-user, audit-log, dual-read, role slugs)

**Context for Next Session:**
- **PHP-Auth M0 done:** Env config, validate-user client, audit-log helper, dual-read in resolve-role, and role slug convention (use PHP-Auth slug everywhere; no internal slug). Add AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, AUTH_API_KEY to .env.local and Vercel; test with PHP-Auth locally (port 5000) or staging.
- **Roles:** PHP-Auth slugs (website-cms-superadmin, website-cms-admin, website-cms-editor, website-cms-creator, website-cms-gpum) are the single reference. GPUM = CRM members only (member auth, not admin UI). Use `isMemberRole(role)` and `PHP_AUTH_ADMIN_ROLE_SLUGS` when gating admin vs member. Feature-registry maps PHP-Auth slug Ã¢â€ â€™ legacy slug for DB queries until DB is migrated.
- **Next:** M3 (writes to central), then optional M4 (central-only read). Consider migrating admin_roles/role_features/tenant_user_assignments to PHP-Auth slugs and removing legacy mapping.
- **Key files:** `src/lib/php-auth/` (config, validate-user, role-mapping, audit-log), `src/lib/auth/resolve-role.ts`, `src/lib/supabase/feature-registry.ts`, `docs/reference/php-auth-integration-clarification.md`, `docs/reference/php-auth-website-cms-tables-cross-reference.md`.

**Changes:**
- **PHP-Auth integration (M0):** Added `src/lib/php-auth/config.ts` (getPhpAuthConfig, isPhpAuthConfigured), `validate-user.ts` (validateUser, getOrgForThisApp), `role-mapping.ts` (toPhpAuthRoleSlug, PHP_AUTH_ROLE_SLUG, legacySlugToPhpAuthSlug, phpAuthSlugToLegacySlug, isMemberRole, PHP_AUTH_ADMIN_ROLE_SLUGS), `audit-log.ts` (pushAuditLog). Dual-read in resolve-role: try PHP-Auth validate-user first; fallback to user_metadata/tenant_user_assignments; return PHP-Auth slug; full-access check for website-cms-superadmin. Audit log wired to login API and auth callback (login_success, login_failed).
- **Role slugs:** Use PHP-Auth slug as single reference (no internal slug). Official slugs: website-cms-superadmin, website-cms-admin, website-cms-editor, website-cms-creator, website-cms-gpum (GPUM = CRM members, not admin users). Feature-registry accepts PHP-Auth slug and maps to legacy for DB during transition.
- **Docs:** php-auth-integration-clarification.md (scope, env, dual-read, role table, GPUM note, SSOT); php-auth-website-cms-tables-cross-reference.md (table mapping, PHP-Auth schema); prd-technical.md (AUTH_* env vars); sessionlog M0 marked completed.

---

### 2026-02-17 CT - Session wrap-up: PHP-Auth repurpose planning (authplanlog.md)

**Context for Next Session:**
- Planning only (no code changes). **Current top priority:** see and work from [authplanlog.md](./reference/Repurpose/authplanlog.md) Ã¢â‚¬â€ Section 1 (modify PHP-Auth app) and Section 2 (modify website-cms app). Plan covers: data/schema cleanup (keep auth_users; simplify roles to Superadmin, admin-style, GPUM); MFA (TOTP) implementation notes from website-cms (form POST, token-relay fallback on Vercel); API keys generated and stored in PHP-Auth only; no session carry-over between PHP-Auth and website-cms; auth persists across website-cms forks (one MFA for all forks). Sessionlog Current focus points to authplanlog as next focus.
- Key doc: `docs/reference/Repurpose/authplanlog.md` (archived). Reference: `docs/reference/RepurposeAuthApp/` (AUTH_APP_OVERVIEW_SCHEMA.md, AuthApp-prd.md). Planlog/sessionlog "Integrate with PHPAUTH standalone app" item remains; authplanlog is the detailed step-by-step plan for that work.

**Changes:**
- **authplanlog.md:** Created and refined: two-section plan (Section 1 PHP-Auth, Section 2 website-cms). Added API key responsibility (PHP-Auth generates/stores; website-cms receives/stores in env). Added MFA implementation notes from website-cms (Ã‚Â§1.2.1: form POST, token relay for Vercel, standalone challenge/success). Clarified session rules (Ã‚Â§1.2.2): no carry-over to/from PHP-Auth; auth persists across website-cms forks (one login + MFA for all forks). Summary table updated. No changelog/sessionlog/planlog checkoffs this session (planning only).

---

### 2026-02-12 CT - Session wrap-up: planning and docs; Member auth checked off

**Context for Next Session:**
- Session was planning and docs only (no code changes). Next up in sessionlog: Outbound SMTP emailer + contact activity stream; PWA Notifications (admin alerts); Media "Copy Shortcode" (and "Adds protection to hide URL info"); Terms and Policys manager.
- Member auth confirmed mostly complete: public `/login` has signin + signup and signup code field with redeem-code automation; `/members/*` protected by middleware; `/api/auth/member/*` deferred as optional.
- Decisions: admin notifications via PWA push page (not email); protected video/download and media shortcode design discussed (proxy routes, gallery URL building, optional `[[media:id]]` shortcode); public signup/signin already has signup code and automations.

**Changes:**
- **Planlog:** Member auth item checked off (optional register on `/login`, middleware for member routes done; `/api/auth/member/*` optional/deferred).
- **Sessionlog:** Already contained expanded steps for outbound SMTP emailer, PWA notifications, Media "Copy Shortcode"; no removals this session.

---

### 2026-02-13 CT - Merge field selector (side-by-side), CRM external UIDs (4 columns)

**Context for Next Session:**
- **Merge:** Contact merge (detail + bulk) now has a side-by-side field selector: table with Field | Primary | Secondary | Keep (Primary/Secondary) | Proposed. Notes and related data described as combined (not pick-one). Optional `fieldChoices` in POST /api/crm/contacts/merge; mergeContacts() applies choices for core and custom fields. Bulk merge suggests primary (more complete or more recent); GET /api/crm/contacts/[id]/custom-fields added for merge preview.
- **CRM external UIDs:** Four first-class columns on contacts: `external_crm_id` (Anychat), `external_vbout_id`, `external_stripe_id`, `external_ecommerce_id`. Migration 113 adds the three new columns and updates list/detail RPCs. getContactByExternalId(source, id) in crm.ts for anychat | vbout | stripe | ecommerce. Merge and on-member-signup set the new fields. No custom-field lock or system ecommerce custom field.
- **Key files:** `src/lib/supabase/crm.ts` (mergeContacts + fieldChoices, MERGEABLE_CORE_KEYS, getContactByExternalId, ExternalIdSource), `src/components/crm/MergeSideBySide.tsx`, `src/app/admin/crm/contacts/[id]/ContactMergeButton.tsx`, `src/components/crm/MergeBulkDialog.tsx`, `src/app/api/crm/contacts/merge/route.ts`, `src/app/api/crm/contacts/[id]/custom-fields/route.ts` (GET), `supabase/migrations/113_crm_contacts_four_external_uids.sql`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Merge field selector:** MergeSideBySide component (Field | Primary | Secondary | Keep | Proposed); default choice primary-if-non-empty else secondary. ContactMergeButton and MergeBulkDialog fetch both contacts + custom fields and show side-by-side; bulk suggests primary by completeness/recent. POST /api/crm/contacts/merge accepts optional fieldChoices; mergeContacts() uses it for core and custom fields. GET /api/crm/contacts/[id]/custom-fields for merge preview.
- **CRM external UIDs (4 columns):** Migration 113 adds external_vbout_id, external_stripe_id, external_ecommerce_id to crm_contacts; get_contacts_dynamic and get_contact_by_id_dynamic updated. CrmContact type and merge logic extended; getContactByExternalId(source, externalId) added; on-member-signup sets new fields to null. Custom-field lock and system ecommerce custom field cancelled in favor of 4th column.
- **Docs:** Sessionlog cleaned; next up empty.

---

### 2026-02-13 CT - Session wrap-up: CRM contact merge (detail + bulk), merge field selector on backlog

**Context for Next Session:**
- **CRM contact merge:** Implemented and working. (1) **Detail page:** Merge button in contact header opens dialog with dire "This action is not reversible" warning, dropdown to pick contact to merge into current one, required checkbox, "Merge permanently" (destructive). (2) **Bulk:** Select exactly 2 contacts Ã¢â€ â€™ Bulk actions Ã¢â€ â€™ "Merge 2 contacts" (only when not in Show trash). MergeBulkDialog lets user choose which contact to keep (primary); the other is merged into it and soft-deleted. Merge logic: primary keeps non-empty core fields, secondary fills blanks; related data (notes, submissions, MAGs, custom fields, consents, lists, taxonomy) reassigned or combined; secondary soft-deleted.
- **Next up (sessionlog):** Merge field selector/confirmation Ã¢â‚¬â€ optional UI to choose which contactÃ¢â‚¬â„¢s value wins per field (full preview or conflict-only). CRM external UIDs (schema, custom field lock, temporary ecommerce, helpers) remain on planlog.
- **Key files:** `src/lib/supabase/crm.ts` (mergeContacts, MERGEABLE_CORE_KEYS), `src/app/api/crm/contacts/merge/route.ts`, `src/app/admin/crm/contacts/[id]/ContactMergeButton.tsx`, `src/app/admin/crm/contacts/[id]/page.tsx`, `src/components/crm/MergeBulkDialog.tsx`, `src/components/crm/ContactsListBulkBar.tsx`, `src/app/admin/crm/contacts/ContactsListClient.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Contact merge (detail):** ContactMergeButton with irreversible warning, contact dropdown, confirmation checkbox; POST /api/crm/contacts/merge; mergeContacts() in crm.ts (core fields, external_crm_id, notes, form_submissions, MAGs, custom fields, consents, marketing lists, taxonomy, soft-delete secondary).
- **Contact merge (bulk):** "Merge 2 contacts" in Bulk actions when exactly 2 selected and not in trash; MergeBulkDialog to pick primary vs secondary with same warning/checkbox; on success clear selection and refresh.
- **Docs:** Sessionlog: completed merge and dashboard items removed; Merge field selector/confirmation added as next up. Planlog: Phase 07 CRM contact merge checked off.

---

### 2026-02-12 CT - Session wrap-up: Activity Stream, dashboard restructure, OmniChat link, RAG header

**Context for Next Session:**
- **Dashboard:** Metric blocks at top (Total Contacts, Form submissions with 24h/7d/30d/all, Content items, Media, Events with by-type). Tabs: Activity (default) | RAG. Activity tab shows combined stream (notes, form submissions, contact added) with search and type filter; RAG tab shows knowledge card with updated header. All working.
- **CRM:** Per-contact Activity Stream extended (Contact added, Form submissions, MAG assignments, Marketing list joins). Sidebar "New" badge refreshes after bulk actions and import via `crm-data-changed` event. Import refreshes and dispatches event; "Back to contacts" for navigation.
- **OmniChat:** Sidebar link now points to https://chat.phpmedia.com, opens in new tab.
- **API/integrations:** Discussed: no public API; Anychat (push to CRM) and VBout (send contacts/lists, receive activity) will use secret-per-tenant or webhook verification to protect endpoints. Rate limiting not needed for admin-only marketing routes.
- **Key files:** `src/app/admin/dashboard/page.tsx`, `DashboardTabsClient.tsx`, `FormSubmissionsMetricCard.tsx`, `EventsMetricCard.tsx`, `DashboardActivityStream.tsx`, `RagKnowledgeCard.tsx`, `src/components/dashboard/Sidebar.tsx`, `src/lib/supabase/crm.ts` (getContactsCount, getFormSubmissionsCount, getDashboardActivity), `src/components/crm/ContactNotesSection.tsx`, `docs/sessionlog.md`, `docs/planlog.md`.

**Changes:**
- **Activity Stream (per contact):** Contact added line; form submissions ("Submitted [Form name]"); MAG assignments ("Added to [MAG name]"); marketing list joins ("Added to list [name]"). getFormSubmissionsByContactId() in crm.ts.
- **CRM sidebar badge:** Sidebar listens for `crm-data-changed`; ContactsListClient and import page dispatch it after bulk actions/import; badge refetches without full reload.
- **Admin dashboard restructure:** Metric row (contacts, form submissions with period buttons, content count, media, events with by-type). Tabs: Activity (combined stream, filters) | RAG. getContentCount(), getEventsCount(), getEventsCountByType() added.
- **RAG card header:** "RAG (Retrieval Augmented Generation) Knowledge for AI Agent Training".
- **OmniChat:** Link href https://chat.phpmedia.com, target _blank, rel noopener noreferrer.
- **Docs:** Sessionlog trimmed; planlog Activity Stream dashboard widget checked off; changelog context for next session.

---

### 2026-02-12 CT - MFA: set cookies on success page (one-time token)

**Context for Next Session:**
- **MFA Vercel fix:** Cookies are now set on the success page document response instead of the API. Verify API stores session cookies in `mfa_upgrade_tokens`, redirects 302 to `/mfa/success?t=TOKEN`; success page (Server Component) reads token, sets cookies via `cookies().set()`, deletes token, renders. Run migration **110_mfa_upgrade_tokens.sql** in Supabase SQL Editor before testing.
- **Key files:** `src/app/api/auth/mfa/verify/route.ts`, `src/app/mfa/success/page.tsx`, `supabase/migrations/110_mfa_upgrade_tokens.sql`.

**Changes:**
- **Migration 110:** `public.mfa_upgrade_tokens` table (token, cookies jsonb, expires_at); RLS on, service-role only.
- **Verify API:** On success with redirect, insert cookies into table, redirect 302 to `/mfa/success?t=...` (no Set-Cookie on API).
- **Success page:** Read `t`, load cookies from DB, set via next/headers `cookies()`, delete token; redirect to challenge if missing/expired.
- **MFAChallenge:** Handle `error=expired` and `error=server` from URL.

---

### 2026-02-12 CT (late) - MFA: form POST for reliable cookie persistence

**Context for Next Session:**
- **MFA fix:** Switched from fetch to form POST so browser does full navigation to verify API; cookies apply reliably on document load. API redirects to /mfa/success first (meta refresh), then success page countdown Ã¢â€ â€™ admin.
- **Key files:** `src/components/auth/MFAChallenge.tsx`, `src/app/api/auth/mfa/verify/route.ts`.

**Changes:**
- **Form POST:** MFAChallenge uses form action/method POST instead of fetch; full page navigation so Set-Cookie applies on document load.
- **API:** Meta refresh redirects to /mfa/success?redirect=... (not directly to admin).

---

### 2026-02-12 CT (late) - MFA standalone flow, success page with delay

**Context for Next Session:**
- **MFA flow:** Standalone `/mfa/challenge` and `/mfa/success` pages (minimal layout, no admin sidebar). After verify, user lands on success page with "Success!" and 3-second countdown, then redirects to admin dashboard. Gives browser time to apply session cookies before final redirect.
- **Key files:** `src/app/mfa/` (layout, challenge, success), `src/components/auth/MFAChallenge.tsx`, `src/components/auth/MFASuccessClient.tsx`, `src/middleware.ts`, `src/app/api/auth/mfa/verify/route.ts`. Admin `/admin/mfa/challenge` and `/admin/mfa/success` redirect to `/mfa/*` for backward compat.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Standalone MFA:** New `/mfa` route group with minimal layout; challenge and success pages.
- **Success page:** MFASuccessClient shows "Success!" with checkmark, 3-second countdown, then redirect to admin.
- **Middleware:** Redirects to `/mfa/challenge` when AAL2 needed; `isMfaChallengeOrEnroll` includes `/mfa/challenge` and `/mfa/success`.
- **Verify flow:** MFAChallenge fetch POST Ã¢â€ â€™ verify API returns 200 + Set-Cookie Ã¢â€ â€™ client navigates to `/mfa/success?redirect=...` Ã¢â€ â€™ success page waits 3s Ã¢â€ â€™ redirect.
- **Cleanup:** Removed MFA_TRACE logs from verify route.

---

### 2026-02-13 CT - RAG doc packer, content types (FAQ/Quote), Add New modal, robots.txt, RAG warning

**Context for Next Session:**
- **RAG:** Article-based packing in `src/lib/rag.ts` (whole articles per URL; FAQ never split; oversize articles sub-split with "Blog post"/"Continued from" headers). Configurable via `RAG_MAX_TOKENS_PER_PART`. robots.txt disallows `/api/rag/`. Dashboard shows instructional note when partCount >= 5. Cache getRagStats() skipped (bot-only, sparse traffic).
- **Content types:** FAQ added (migration 107); Page removed from UI and from DB (migrations 107, 108). Core types (Post, Snippet, Quote, Article, FAQ) cannot be edited/deleted in Settings > Content Types. Add New opens modal to choose type; type fixed on document (new + edit). Custom fields moved to dedicated tab; "No custom fields for this content type" when none.
- **Templates:** New FAQ content gets body template (Topic/Q/A, single line); new Quote gets "Quote: Ã¢â‚¬Â¦ / Author: Ã¢â‚¬Â¦" instructional template. Taxonomy shows empty when no section config (e.g. FAQ).
- **UX:** Add Content and Edit Content pages have Cancel/Create or Cancel/Update in header (duplicate of footer). Add New type modal taller, scrollable, spacing between label and description.
- **Key files:** `src/lib/rag.ts`, `src/app/robots.ts`, `src/components/dashboard/RagKnowledgeCard.tsx`, `src/app/admin/content/ContentPageClient.tsx`, `src/components/content/ContentEditorForm.tsx`, `src/components/settings/ContentTypesBoard.tsx`, `src/app/admin/content/new/ContentNewClient.tsx`, `src/app/admin/content/[id]/edit/EditContentClient.tsx`, `src/lib/supabase/taxonomy.ts`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **RAG doc packer:** packArticlesIntoSegments() packs by article; FAQ type never split; oversize non-FAQ sub-split with headers. getRagContentRows() joins content_types for type_slug. getMaxTokensPerPart() + RAG_MAX_TOKENS_PER_PART env.
- **robots.txt:** `src/app/robots.ts` disallows `/api/rag/` so crawlers don't index RAG URL; bot still uses public URL.
- **RAG warning:** RagKnowledgeCard shows instructional note when partCount >= 5 (scale back or shorten content).
- **Content types:** Migration 107 adds FAQ; 108 removes Page content and type. ContentTypesBoard and Content list/Add New exclude Page. Core types: Edit and Delete disabled in Settings.
- **Add New flow:** Modal to choose type Ã¢â€ â€™ navigate to /admin/content/new?type=slug. Content type fixed on document (new and edit).
- **Custom fields:** New tab "Custom fields" after Membership; empty state "No custom fields for this content type."
- **FAQ/Quote templates:** getFaqTemplateBody() and getQuoteTemplateBody() prefill body on create (initial state so Tiptap shows on first paint). Taxonomy: no section config Ã¢â€ â€™ empty categories/tags (e.g. FAQ).
- **Header actions:** ContentNewClient and EditContentClient have Cancel + Create/Update in header (form ref + onSavingChange).
- **Add New modal:** Taller (max-h 70vh/520px), label/description spacing, scroll when many types.
- **Docs:** Sessionlog and planlog RAG optimization items checked off; sessionlog cleaned; FAQ packing rule in planlog/mvt/sessionlog.
- **Pre-launch cleanup & code review:** Dead code removed (ChangeStatusDialog, PostEditor). Stale 2FA TODOs removed in integrations; getAAL implemented in GET/PUT /api/admin/integrations. Code review: security (RLS, no secrets in client, auth + 2FA on integrations); modular alignment (routes/lib vs mvt.md). Refactor: ContactDetailClient Ã¢â€ â€™ ContactNotesSection, ContactCustomFieldsSection, ContactMarketingListsSection, ContactMagsSection; Marketing Lists/Memberships suggested items; Sidebar Ã¢â€ â€™ sidebar-config.ts; ContactsListClient Ã¢â€ â€™ ContactsListFilters, ContactsListBulkBar. Planlog "Code Review, Security & Modular Alignment" checked off. Security module discussed.

---

### 2026-02-12 CT (evening) - Vercel deploy: redirect loop, MFA flow, verify still stuck

**Context for Next Session:**
- **Vercel:** App deploys; admin was blocked by ERR_TOO_MANY_REDIRECTS and MFA. Fixes applied (below). **MFA verify still not working:** user sees challenge, enters code, clicks Verify Ã¢â€ â€™ stays on "Verifying..." and never completes (or redirect doesnÃ¢â‚¬â„¢t land on dashboard). Next session: debug why Ã¢â‚¬â€ e.g. `mfa.verify()` not resolving on Vercel, cookies not persisting after verify, or middleware still not seeing AAL2 after full-page redirect.
- **Done this session:** Middleware cookie carrier (setAll + copy to redirects) to fix redirect loop; skip MFA redirect when path is /admin/mfa/challenge or enroll; getCurrentUserFromRequest returns `{ user, session }` and middleware uses session.aal for AAL (getAAL used service-role, no session in Edge); 2FA bypass respects NEXT_PUBLIC_DEV_BYPASS_2FA in any env; getEnrolledFactors/hasEnrolledFactors use SSR client so server sees userÃ¢â‚¬â„¢s factors; enroll page redirects to challenge when user already has factors; MFAChallenge: 20s timeout on verify + window.location.replace(redirectTo) after success. Build fixes: Session.aal type cast, client.ts getSupabaseEnv() for all clients, getSetCookie type in middleware.
- **Key files:** `src/middleware.ts`, `src/lib/auth/supabase-auth.ts`, `src/lib/auth/mfa.ts`, `src/components/auth/MFAChallenge.tsx`, `src/app/admin/mfa/enroll/page.tsx`, `src/lib/supabase/client.ts`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Redirect loop (Vercel):** Cookie carrier in middleware; setAll writes refresh cookies to response; copyCookiesTo copies to redirects; skip AAL2 redirect on /admin/mfa/challenge and /admin/mfa/enroll.
- **AAL in middleware:** getCurrentUserFromRequest returns `{ user, session }`; middleware uses session.aal instead of getAAL(user) (service-role has no session in Edge).
- **2FA bypass:** isDevModeBypassEnabled() no longer requires NODE_ENV=development; only checks NEXT_PUBLIC_DEV_BYPASS_2FA.
- **MFA server factors:** getEnrolledFactors() uses createServerSupabaseClientSSR() so challenge/enroll pages see userÃ¢â‚¬â„¢s factors; enroll redirects to challenge when already enrolled.
- **MFA verify UX:** 20s timeout on verify; success path uses window.location.replace(redirectTo). Verify still not completing in production Ã¢â‚¬â€ to be debugged next session.
- **Build:** Session.aal type assertion; client.ts uses getSupabaseEnv() in createClientSupabaseClient, createServerSupabaseClient, createServerSupabaseClientSSR; ResponseWithGetSetCookie type for getSetCookie in middleware.

---

## Ã°Å¸Å¡â‚¬ MILESTONE Ã¢â‚¬â€ LAUNCH TO PRODUCTION (2026-02-12)

**This release marks the first production launch.** The application is deployed to a live domain on Vercel and is **LIVE**. Pre-launch refactor and documentation are complete; Main and Dev branches are in place for CI/CD. Post-launch: full smoke test on live site, then security check and OWASP review.

---

### 2026-02-12 CT - Session wrap: refactor, SimpleCommenter docs, branches, milestone

**Context for Next Session:**
- **MILESTONE:** App is ready for production deploy. After pushing this commit, deploy to Vercel and go LIVE. Then: full smoke test on live domain Ã¢â€ â€™ security check and outstanding updates Ã¢â€ â€™ full OWASP review.
- **Branches:** `main` (production) and `dev` (integration/staging) exist on origin. Work on `dev`, merge to `main` for releases; CI/CD can deploy `main` Ã¢â€ â€™ production, optionally `dev` Ã¢â€ â€™ staging.
- **Refactor (done):** ContactDetailClient split into ContactNotesSection, ContactCustomFieldsSection, ContactMarketingListsSection, ContactMagsSection; suggested items for Marketing Lists and Memberships; Sidebar nav Ã¢â€ â€™ `sidebar-config.ts`; ContactsListClient Ã¢â€ â€™ ContactsListFilters and ContactsListBulkBar. Copy label "Copy To Activity Stream." Fixes: showMags declaration order, ContactMagsSection confirm-remove dialog.
- **SimpleCommenter:** PRD and docs updated: production deployment tool, script always on forked tenant sites; tenant turns on via special URL, adds comments, turns off when not needed. Not dev-only; not for blog comments.
- **Key files:** `src/components/crm/Contact*Section.tsx`, `ContactsListFilters.tsx`, `ContactsListBulkBar.tsx`, `src/components/dashboard/sidebar-config.ts`, `docs/prd.md` (Third-Party Integrations), `IntegrationsManager.tsx`, `integrations.ts`, `(public)/layout.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Refactor:** ContactNotesSection, ContactCustomFieldsSection, ContactMarketingListsSection, ContactMagsSection; Marketing Lists and Memberships suggested items when search empty; sidebar-config.ts; ContactsListFilters and ContactsListBulkBar. Copy button label "Copy To Activity Stream." Bug fixes: showMags before useEffect; ContactMagsSection confirm-remove dialog.
- **SimpleCommenter:** PRD, prd-technical, IntegrationsManager, layout comment, integrations.ts JSDoc Ã¢â‚¬â€ now described as hybrid tenant feedback tool, always deployed on forked sites, tenant on/off via special URL.
- **Git:** `dev` branch created and pushed; `main` and `dev` ready for CI/CD.
- **Session docs:** Sessionlog and changelog updated; milestone noted.

---

### 2026-02-11 CT (later) - Content fixes, add/edit layout, RAG bot URL, Quick Support

**Context for Next Session:**
- **Content:** Dynamic RPCs (content + taxonomy) are called with `supabase.schema("public").rpc(...)` so PostgREST finds them; content data stays in tenant schema. Content editor loads body on first paint (form state init from `item.body`, RichTextEditor key by `item.id`). Add/edit page layout: header (Back + bold "Edit Content" or "Add Content"); two cards 60%/40% (left: type, name, slug; right: status, Use for AI Training); body editor; tabs Taxonomy settings / Membership settings; Cancel and Create/Update right-justified. Taxonomy saved after create. Debug logging removed from content.ts, ContentEditorForm, EditContentClient.
- **RAG:** Dashboard RAG card shows "URL for your bot" (or "URLs for your bot") when partCount >= 1 so the single-URL case is visible and copyable.
- **Quick Support:** Page reverted to simple embed (heading, description, iframe). No git push this session.
- **Next up:** See [sessionlog.md](./sessionlog.md) Ã¢â‚¬â€ Pre-launch cleanup & code review. Key files: `src/lib/supabase/content.ts`, `src/lib/supabase/taxonomy.ts`, `src/components/content/ContentEditorForm.tsx`, `src/app/admin/content/[id]/edit/EditContentClient.tsx`, `src/components/dashboard/RagKnowledgeCard.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Content 404 fix:** All dynamic RPCs in `content.ts` and `taxonomy.ts` use `.schema("public").rpc(...)` so the browser client (default schema = tenant) finds the functions; data remains in tenant schema.
- **Content editor:** Form initializes `data` from `item?.body`; RichTextEditor key `item?.id ?? "new"` so body appears on load and when switching items. Tiptap `immediatelyRender: false` to avoid SSR hydration warning.
- **Content add/edit layout:** EditContentClient and ContentNewClient header: Back link + bold mode only. ContentEditorForm: 60/40 grid cards (left: content type, name, slug; right: status, Use for AI Training); full-width body editor; Tabs (Taxonomy settings: categories/tags, excerpt, custom fields; Membership settings: access level, visibility, MAG, restricted message); buttons right-justified. Taxonomy applied after insert for new content.
- **RAG dashboard:** RagKnowledgeCard shows URL card when partCount >= 1 (title "URL for your bot" or "URLs for your bot"); single-URL case now copyable.
- **Quick Support:** Restored to original (heading, description, iframe only).
- **Cleanup:** Removed all [DEBUG] logs from content.ts, ContentEditorForm.tsx, EditContentClient.tsx; updateContent returns false when no row updated.

### 2026-02-11 CT - Pre-launch cleanup: dead code, 2FA integrations, code review

**Changes:**
- **Dead code:** Removed unused `ChangeStatusDialog` (replaced by SetCrmFieldsDialog) and `PostEditor` (posts use content redirect).
- **Integrations 2FA:** Removed stale TODOs; GET/PUT `/api/admin/integrations` now enforce getAAL (aal2); integrations page comment updated (middleware enforces 2FA for /admin/super).
- **Code review:** Spot-checked security (RLS in migrations, no secrets in client, auth + 2FA) and modular alignment (routes/lib vs mvt.md). Sessionlog and planlog updated.

### 2026-02-11 CT - Feature Guard: sidebar order, roles CRUD, feature registry 1:1, ghosted display, Settings

**Context for Next Session:**
- **Feature Guard / Roles & Features** is in place: sidebar order matches design (Dashboard Ã¢â€ â€™ OmniChat Ã¢â€ â€™ CRM Ã¢â€ â€™ Marketing Ã¢â€ â€™ Calendar Ã¢â€ â€™ Media Ã¢â€ â€™ Content Ã¢â€ â€™ Settings Ã¢â€ â€™ Support); Roles list page with Add/Delete role (system roles Admin, Editor, Creator, Viewer locked); per-role feature editor at `/admin/super/roles/[roleSlug]`; feature registry aligned 1:1 with sidebar via migrations 103Ã¢â‚¬â€œ105; route-features map all paths to slugs; blocked sidebar items shown **ghosted** (visible, non-clickable) for upsell; Settings sub-items in role assignment and sidebar are General, Style, Taxonomy, Customizer, Users; My Profile always visible (no feature gate). Run migrations 103, 104, 105 in Supabase SQL Editor if not already applied.
- **Next up:** See [sessionlog.md](./sessionlog.md) Ã¢â‚¬â€ Pre-launch cleanup & code review, RAG Page Builder. Key files: `src/components/dashboard/Sidebar.tsx`, `src/lib/admin/route-features.ts`, `src/components/superadmin/RolesList.tsx`, `src/components/superadmin/RolesManager.tsx`, `src/lib/supabase/feature-registry.ts`, `supabase/migrations/103_*.sql`, `104_*.sql`, `105_*.sql`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Sidebar:** Reordered to Dashboard, OmniChat, CRM (Contacts, Forms, Form Submissions, Memberships, Code Generator), Marketing (Lists), Calendar (Calendar, Resources), Media (Library, Galleries), Content, Settings, Support; Calendar as main nav after Marketing; OmniChat single link; Marketing twirldown with Lists.
- **Roles & Features:** List page at `/admin/super/roles` with cards; click role Ã¢â€ â€™ editor at `/admin/super/roles/[roleSlug]` (no role dropdown). Add role (dialog: slug, label, description); Delete role with confirm (system roles non-deletable, lock icon). API: POST /api/admin/roles, DELETE /api/admin/roles/[roleSlug]; feature-registry: createRole, deleteRole, getRoleBySlug, SYSTEM_ROLE_SLUGS.
- **Feature registry 1:1 with sidebar:** Migration 103 adds/orders omnichat, form_submissions, lists, calendar, events, resources, library, support + children; 104 adds Settings children (general, style, taxonomy, customizer, users); 105 disables legacy settings rows (fonts_colors, content_types, content_fields, settings_crm, security, api). Roles API uses listFeatures(false) so only enabled features show.
- **Route-features:** pathToFeatureSlug for all new paths (library, form_submissions, omnichat, lists, events, resources, support children, settings children); /admin/settings/profile Ã¢â€ â€™ null (always allowed); FEATURE_PARENT_SLUG and SIDEBAR_FEATURE_MAP updated. Sidebar mediaSubNav uses library; crmSubNav uses form_submissions.
- **Ghosted display:** Sidebar shows all sections; items without access render as greyed, non-clickable (opacity-50, cursor-not-allowed, title "Upgrade your plan to access"). Single links (Dashboard, OmniChat, Content) and twirldowns (CRM, Marketing, Calendar, Media, Settings) support ghosted; sub-items within a section can be link or ghosted by feature. Support remains always clickable.
- **Settings:** Sidebar settingsSubNav has featureSlug for General, Style, Taxonomy, Customizer, Users; My Profile has no featureSlug (always visible). Route guards for /admin/settings/* by slug; FEATURE_PARENT_SLUG for settings children. Role assignment shows only those five under Settings.

### 2026-02-11 CT (later) - Bulk Set CRM Fields (Standard + Custom)

**Context for Next Session:**
- **Bulk Set CRM Fields** is live: one bulk action in the contacts list dropdown, **"Set CRM Fields"**, replaces the former "Change status" item. Dialog step 1: choose **Standard field** or **Custom field**. Standard: set Status for all selected (existing `POST /api/crm/contacts/bulk-status`). Custom: pick one custom field, set value or "Clear value" for all selected (new `POST /api/crm/contacts/custom-fields/bulk`); value inputs by type (text, textarea, select, multiselect, checkbox, etc.). Plan doc `docs/bulk-custom-fields-plan.md` can be archived or removed; implementation steps 1Ã¢â‚¬â€œ4 complete; optional cap/toast (step 5) skipped for v1.
- **Next up:** See [sessionlog.md](./sessionlog.md) and [planlog.md](./planlog.md). Consider adding planlog item for "Bulk Set CRM Fields" and checking it off if not already done.
- **Key files:** `src/components/crm/SetCrmFieldsDialog.tsx`, `src/app/admin/crm/contacts/ContactsListClient.tsx` (bulk menu + dialog), `src/app/api/crm/contacts/custom-fields/bulk/route.ts`, `src/lib/supabase/crm.ts` (`upsertContactCustomFieldValueBulk`). `ChangeStatusDialog` no longer used in list flow (file remains).
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Backend:** `upsertContactCustomFieldValueBulk(contactIds, customFieldId, value)` in `crm.ts`; bulk upsert into `crm_contact_custom_fields`; `value: null` clears for selected contacts.
- **API:** `POST /api/crm/contacts/custom-fields/bulk` Ã¢â‚¬â€ body `{ contactIds, custom_field_id, value }`; auth, validation (non-empty contactIds, valid custom_field_id), calls bulk upsert.
- **Dialog:** `SetCrmFieldsDialog` Ã¢â‚¬â€ step 1: Standard field | Custom field; Standard = Status only (status chips, submit to bulk-status); Custom = fetch custom field definitions, pick one field, value by type or "Clear value", submit to custom-fields/bulk. Back/Cancel; reset on close.
- **Contacts list:** Bulk menu "Change status" replaced with **"Set CRM Fields"**; `SetCrmFieldsDialog` with `contactStatuses` and `onSuccess` refresh. `ChangeStatusDialog` removed from this flow.

### 2026-02-11 CT - CRM Contacts List complete (pagination, bulk actions, trash)

**Context for Next Session:**
- **CRM Contacts List** is complete: pagination (25/50/100), row selection and Check all, bulk action bar (search + Show trash + Bulk actions), Export (CSV/PDF, core + custom fields, 10k cap), Add to list, Remove from list, Change status, Taxonomy (single category/tag add or remove), Delete (soft), Restore, Empty trash (confirmation with dire warning), Show Trashed filter. Backend: `deleted_at` on `crm_contacts` (migration 102), list RPC excludes trashed; bulk APIs for status, list add/remove, taxonomy, soft delete, restore, purge. Purge and single-contact delete clear `taxonomy_relationships` so no orphaned records.
- **Next up:** See [sessionlog.md](./sessionlog.md) Ã¢â‚¬â€ Emailer (built-in), Complete Feature Guard. Key paths: `src/app/admin/crm/contacts/ContactsListClient.tsx`, `src/lib/supabase/crm.ts`, `src/components/crm/`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Pagination & selection:** `ContactsListClient` Ã¢â‚¬â€ pageSize 25/50/100, currentPage, footer (page size, Prev/Next, Ã¢â‚¬Å“Showing XÃ¢â‚¬â€œY of ZÃ¢â‚¬Â), checkbox column, selectedIds, Check all cycle, selection persists across bulk actions.
- **Bulk actions:** Dropdown right of search. Export (dialog: format, field selector core + custom, 10k limit, immediate download), Add to list, Remove from list, Change status (dialog), Taxonomy (single term add/remove dialog), Delete (soft, confirm dialog), Restore (when viewing trash), Empty trash (disabled when no trashed; confirm with dire warning).
- **Trash:** Migration 102 Ã¢â‚¬â€ `deleted_at` on `crm_contacts`; `get_contacts_dynamic` excludes trashed; `getTrashedContacts()`, Show trash (N) / Show active contacts inline with search. Restore and Empty trash APIs; purge and `deleteContact()` delete `taxonomy_relationships` for contact(s) first to avoid orphans.
- **APIs:** `bulk-status`, `bulk-delete`, `bulk-restore`, `purge-trash`, `taxonomy/bulk`; list add/remove already present. `crm.ts`: `updateContactsStatusBulk`, `softDeleteContactsBulk`, `restoreContactsBulk`, `purgeAllTrashedContacts`; `crm-taxonomy.ts`: `addContactsToTermBulk`, `removeContactsFromTermBulk`.
- **Sessionlog:** Completed CRM steps removed; Current Focus and Context updated. **Planlog:** CRM contacts list item checked off.

### 2026-02-10 CT (evening) - CRM contacts list plan; session wrap

**Context for Next Session:**
- **Next focus:** CRM Contacts List Ã¢â‚¬â€ pagination, selection, bulk actions, and trash. Full implementation steps are in [sessionlog.md](./sessionlog.md) under **"CRM Contacts List Ã¢â‚¬â€ implementation steps"** (16 steps: pagination, selection, bulk action bar, Export/Add to list/Remove from list/Change status/Taxonomy/Delete/Restore/Empty trash, Show Trashed filter, backend/DB for trashed state and bulk APIs).
- **This session:** Planning only. No code or database changes. Calendar module remains at a good stopping point (public calendar, ICS, filters). No RLS or DB left in a vulnerable state.
- **Key file for next work:** `src/app/admin/crm/contacts/ContactsListClient.tsx`; server: `page.tsx`, `src/lib/supabase/crm.ts`.

**Changes:**
- **Sessionlog:** Current Focus set to CRM Contacts List. Added full "CRM Contacts List Ã¢â‚¬â€ implementation steps" (pagination 25/50/100, footer left=page size / center=pages / right=count; checkbox column, Check all cycle, selection persists across bulk actions; bulk dropdown right of search; Export, Add to list, Remove from list, Change status, Taxonomy single-term add/remove, Delete soft, Restore, Empty trash with dire warning; Show Trashed filter; backend trashed state and bulk APIs).
- **Planlog:** Phase 07 Ã¢â‚¬â€ added CRM contacts list enhancement item referencing sessionlog.

### 2026-02-10 CT (afternoon) - Calendar: public calendar, ICS, resource filter fix, session wrap

**Context for Next Session:**
- **Next session may be on another machine.** Read [sessionlog.md](./sessionlog.md) first; it has handoff context (repo, pnpm, calendar state, key paths, next up). Then read this changelog entry and the previous one.
- **Calendar module:** Admin calendar complete (CRUD, recurrence, one-step create, filters, Resources CRUD at /admin/events/resources). **Public calendar** at **/events** (public layout): Events nav link in header; page fetches GET /api/events/public; click event Ã¢â€ â€™ detail modal; "Subscribe to calendar (ICS)" in header and modal. **Public = not hidden, not membership-protected:** `access_level=public`, `visibility=public`, `status=published`. ICS feed: GET /api/events/ics (same filter). Resource/participant filter on admin calendar now works for recurring events (assignments requested by real event ID; filter lookup uses eventIdForEdit(e.id)).
- **Key files:** `src/lib/supabase/events.ts` (getPublicEvents, isPublicEvent), `src/app/api/events/public/route.ts`, `src/app/api/events/public/[id]/route.ts`, `src/app/api/events/ics/route.ts`, `src/app/(public)/events/` (page + PublicCalendarPageClient), `src/app/(public)/layout.tsx` (Events nav), `src/app/admin/events/EventsPageClient.tsx` (real IDs for assignments + filter).
- **Next up (optional):** Resources CRUD polish, conflict check (14Ã¢â‚¬â€œ17), Step 5 testing/docs. Feature guard (32) deferred. No RLS or DB left in a vulnerable state.

**Changes:**
- **Public calendar & ICS:** GET /api/events/public (list public-only events), GET /api/events/public/[id] (single event or occurrence; 404 if not public), GET /api/events/ics (text/calendar feed, public-only). isPublicEvent() and getPublicEvents() in events.ts. Public page at /events with EventsCalendar, detail modal, ICS subscribe link. Events link in public header nav. EventsCalendar accepts optional onSelectEvent for public detail modal.
- **Resource/participant filter (recurring):** EventsPageClient requests assignments by real event IDs (eventIdForEdit); filter uses real ID when looking up eventResourceMap/eventParticipantMap so recurring occurrences show correctly when filtering by resource or participant.
- **Participants & Resources tab:** Empty resources state has button "Add resources (Calendar Ã¢â€ â€™ Resources)" linking to /admin/events/resources. Defensive parsing for resources API response shape.
- **Session wrap:** Sessionlog updated with Context for Next Session for handoff to another machine. Planlog: public calendar/ICS treated as done (sessionlog next-up list updated).

### 2026-02-10 CT - Calendar: one-step create (taxonomy, participants, resources)

**Context for Next Session:**
- **Calendar one-step create** is done: new events can set taxonomy, participants (team + CRM), and resources before first save; all applied on submit. Taxonomy: create mode in `TaxonomyAssignmentForContent` (optional `contentId`). Participants: single type-to-search (AutoSuggestMulti) from full team + CRM; composite ids `team_member:id` / `crm_contact:id`; pending state for new events, POST after create. Resources: multi-select (AutoSuggestMulti); pending resource ids for new events, POST after create. Participants & Resources tab shown for both create and edit (no "save first" gate).
- **Next up:** See sessionlog Ã¢â‚¬â€ Resources CRUD, conflict check, public calendar/ICS, then optional items. Feature guard (32) deferred. Key files: `EventFormClient.tsx`, `EventParticipantsResourcesTab.tsx`, `TaxonomyAssignmentForContent.tsx`, planlog "Calendar event detail Ã¢â‚¬â€œ One-step create".

**Changes:**
- **Taxonomy on new events:** `TaxonomyAssignmentForContent` supports create mode (`contentId` optional); load terms only, controlled state; EventFormClient shows taxonomy tab for new events; taxonomy applied via `setTaxonomyForContent` after POST (unchanged).
- **Participants tab:** Replaced three dropdowns with one AutoSuggestMulti (team + CRM contacts, composite ids). New events: `pendingParticipants` state, applied on submit via POST `/api/events/:id/participants`. Existing events: add/remove via same UI and existing APIs.
- **Resources tab:** Single-select Ã¢â€ â€™ AutoSuggestMulti (multi-select). New events: `pendingResourceIds`, applied on submit via POST `/api/events/:id/resources`. Existing events: add/remove via API.
- **Sessionlog:** Trimmed to lean format; phase checklist and one-step details moved to planlog/changelog.

### 2026-02-09 CT (evening) - Calendar: taxonomy fix, search/filters, sessionlog planning

**Context for Next Session:**
- **Calendar module (admin):** Schema done (events, event_exceptions, participants, resources, junctions). Admin calendar at /admin/events with month/week/day/agenda views, event create/edit form (taxonomy + memberships tabs), cover image, link_url. **Taxonomy fix:** `taxonomy.ts` schema fallback changed from "public" to "website_cms_template_dev" so event categories save correctly.
- **Calendar search and filters:** EventsFilterBar added: row 1 = search input + Reset button (right justified); row 2 = Categories, Tags, Memberships multi-select. Client-side filtering; loads taxonomy terms (event section), MAGs, and taxonomy relationships for visible events. Tags dropdown always visible between Categories and Memberships.
- **Sessionlog planning (docs only):** Added architecture notes (one calendar; participants/resources assigned TO events; view switching = filter). Public vs Internal: event form selector (Public = public calendar, Internal = admin only), maps to event_type; calendar filter checkboxes (Public, Internal); public route only shows event_type='public'. Participant picker: search-based (combobox/modal). Resource picker: same pattern. Resources CRUD: resource table editor as sub-link under Calendar (/admin/events/resources).
- **Next up:** See sessionlog Ã¢â‚¬â€ Feature guard, Public calendar/ICS, Resources CRUD, Participant/Resource pickers, Public vs Internal form control, Recurring events, Conflict checks. Key files: `src/app/admin/events/`, `src/components/events/`, `src/lib/supabase/events.ts`, `src/lib/supabase/taxonomy.ts`, `docs/sessionlog.md`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **taxonomy.ts:** Schema fallback `"public"` Ã¢â€ â€™ `"website_cms_template_dev"` (11 occurrences) so taxonomy_relationships and taxonomy_terms use correct client schema.
- **EventsFilterBar:** New component with search + Reset, Categories/Tags/Memberships filters.
- **EventsPageClient:** Search, filter state; loads taxonomy terms, configs, MAGs, event taxonomy relationships; client-side filtering; Tags always rendered.
- **sessionlog.md:** Architecture notes; Public vs Internal on form and calendar; participant/resource picker as search-based; Resources CRUD as sub-link under Calendar; public route only event_type='public'.

### 2026-02-06 CT (evening) - Gallery per-media MAG filter; Membership and media items planned

**Context for Next Session:**
- **Gallery per-media protection** is implemented: `GET /api/galleries/[id]/public` filters items by mag-tag. `getMagUidsForCurrentUser()` in `content-protection.ts` resolves session Ã¢â€ â€™ member Ã¢â€ â€™ contact Ã¢â€ â€™ MAG uids; `filterMediaByMagTagAccess(mediaIds, userMagUids)` keeps only media the user can see (no mag-tag, or user has matching MAG). Admins/superadmins bypass and see all items. Public gallery with mixed public + membership-tagged media shows different item sets to anonymous vs members with that MAG.
- **Next up (sessionlog):** Membership and media items Ã¢â‚¬â€ (1) Make media assignable to dynamic memberships via **media_mags** table (true protection; mag-tag optional for filtering), API + media item UI membership selector, switch protection logic to media_mags; (2) Red "M" badge on gallery list/grid for membership items; (3) Red "M" badge in media library (list + grid) for items in a membership. See `docs/sessionlog.md` Ã¢â€ â€™ "Membership and media items (up next)."
- **Key files:** `src/lib/mags/content-protection.ts` (getMagUidsForCurrentUser, filterMediaByMagTagAccess), `src/app/api/galleries/[id]/public/route.ts`, `docs/sessionlog.md`, `docs/planlog.md`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Gallery public API:** After `checkGalleryAccess`, response items are filtered by per-media MAG: `getMagUidsForCurrentUser()`, `filterMediaByMagTagAccess(mediaIds, userMagUids)`; admins bypass. Enables public galleries with mixed public/membership media to display different items per viewer.
- **content-protection.ts:** Added `getMagUidsForCurrentUser()` (session Ã¢â€ â€™ member Ã¢â€ â€™ getMagUidsForContact).
- **Docs:** Sessionlog Ã¢â‚¬â€ "Membership and media items (up next)" block added (media_mags, protection rewire, red M badges in gallery and media library). Current Focus set to this work. Planlog Ã¢â‚¬â€ Gallery media bullet updated; "Membership and media items" planned items added.

### 2026-02-06 CT - Tenant admin team (Owner flag, Settings Ã¢â€ â€™ Users) verified; Content Ã¢â‚¬Å“Is MembershipÃ¢â‚¬Â filter

**Context for Next Session:**
- **Tenant admin team management (Settings Ã¢â€ â€™ Users, Owner flag)** is complete and verified: migration 090 (`is_owner` on `tenant_user_assignments`), types/CRUD, `getTeamManagementContext()`, Settings Ã¢â€ â€™ Users link (adminOnly + canManageTeam), `/admin/settings/users` page, GET/POST/PATCH `/api/settings/team`, superadmin `is_owner` in tenant-sites users API, SettingsUsersContent (list, add, role, remove; Owner badge; Remove disabled for Owners unless superadmin). View as Creator correctly hides the Users link.
- **Content tab:** Ã¢â‚¬Å“Is MembershipÃ¢â‚¬Â checkbox filter added (after tags; Reset Filters right-justified); filters list to items with `access_level` members | mag. Migration 092 and Membership column were already in place.
- **Next:** Phase 09 (content protection, membership feature switch) or other sessionlog items. Key files: `docs/sessionlog.md`, `docs/planlog.md`, `src/lib/auth/resolve-role.ts`, `src/app/api/settings/team/route.ts`, `src/app/admin/content/ContentPageClient.tsx`.

**Changes:**
- **Content filter:** `ContentPageClient.tsx` Ã¢â‚¬â€ `filterMembershipOnly` state, Ã¢â‚¬Å“Is MembershipÃ¢â‚¬Â checkbox after tags, included in `hasFilters` and reset; filter row always shown; Reset Filters with `ml-auto`. No new dependencies.
- **Docs:** Sessionlog Ã¢â‚¬â€ First priority (tenant admin team management) marked complete and removed from sessionlog to keep it lean. Planlog Ã¢â‚¬â€ Completed / Reference: added bullet for tenant admin team management (Settings Ã¢â€ â€™ Users, Owner flag). Changelog Ã¢â‚¬â€ this entry.

### 2026-02-03 CT (afternoon) - Membership area, CRM sync on member pages only, CRM fixes, speed docs

**Context for Next Session:**
- **Membership:** Members Area nav (dropdown: Dashboard, Profile, Account) in public header when logged in. Member profile page edits display name and avatar (user_metadata). Apply code block on member dashboard; redeem-code API works when member has `members` row. **Sync (CRM contact + members row) runs only in `src/app/(public)/members/layout.tsx`**, not on every public pageÃ¢â‚¬â€keeps rest of site fast. Membership limited to certain pages for now; shortcode feature will need adjustments (see PRD/planlog).
- **Automations:** New signup Ã¢â€ â€™ CRM contact (status New) via `src/lib/automations/on-member-signup.ts`; triggered from auth callback (type=signup), login page (when session after signUp), and members layout. Duplicate fix: `getContactByEmail` uses `.limit(1)` and returns first row so duplicates no longer cause PGRST116 or re-create contacts.
- **CRM:** Contact delete on detail page (Delete button, DELETE `/api/crm/contacts/[id]`, `deleteContact` in crm.ts). List columns: Last name, First name, Full name, Phone, Status, Updated. Member display name syncs to contact `full_name` when existing contact found. Full name shown in list; formatSupabaseError in getContactByEmail for clearer errors.
- **Public header:** When logged in: Welcome {displayName}, Log Out; Members Area dropdown. AuthUser has optional `display_name` from user_metadata.
- **Docs:** PRD and planlog have Performance (Speed) guidelineÃ¢â‚¬â€notify of features that may slow the system. Member sync and performance and Ã¢â‚¬Å“membership limited to certain pages; shortcode adjustmentsÃ¢â‚¬Â documented. Sessionlog has performance note and handoff. Pagination for CRM list is in sessionlog backlog.
- **Next:** First priority (Tenant admin team management, Settings Ã¢â€ â€™ Users, Owner flag) or Phase 09 content protection / login redirect. Key files: `src/app/(public)/members/layout.tsx`, `src/lib/automations/on-member-signup.ts`, `src/app/admin/crm/contacts/`, `docs/prd.md`, `docs/planlog.md`, `docs/sessionlog.md`.

**Changes:**
- **Public header:** Welcome {displayName} and Log Out when logged in; Members Area dropdown (Dashboard, Profile, Account). `PublicHeaderAuth`, `PublicHeaderMembersNav`; `AuthUser.display_name` in supabase-auth.
- **Automations:** `src/lib/automations/on-member-signup.ts` (ensureMemberInCrm); auth callback and login page trigger; members layout runs sync only (removed from public layout). `getContactByEmail` uses `.limit(1)`; layout try/catch for missing CRM.
- **Member area:** Profile page (display name, avatar URL) via `MemberProfileForm`; Apply code block on dashboard; `createMemberForContact` in members layout so redeem-code works.
- **CRM:** deleteContact in crm.ts; DELETE in `/api/crm/contacts/[id]`; ContactDeleteButton on detail page. List: Full name column, order Last/First/Full name/Phone/Status/Updated. ensureMemberInCrm updates existing contact full_name from member display name.
- **Docs:** PRDÃ¢â‚¬â€Performance (Speed) and Member sync and performance; membership limited to certain pages; shortcode adjustments when implemented. PlanlogÃ¢â‚¬â€Performance guideline at top; Phase 9C Performance bullet; membership limited + shortcode note. SessionlogÃ¢â‚¬â€performance note; member routes step 4 updated; pagination for CRM in backlog.

### 2026-02-03 CT - Auth: password policy, forgot/change password, TOTP on Profile, 2FA optional, invite redirectTo, tenant auth header

**Context for Next Session:**
- **Auth/password/TOTP work done.** Password policy (12 chars, denylist) in `src/lib/auth/password-policy.ts`; forgot password flow (link, `/admin/login/forgot`, `/admin/login/reset-password`) with policy; My Profile change-password card and Security card with TOTP (MFAManagement); 2FA required only for superadmin on login; CRM recommendation banner on Profile; invite redirectTo our reset-password so first password meets policy; tenant site name on auth pages; hardening confirmed. Deeper auth-page design deferred to client site design.
- **Next:** First priority in sessionlog Ã¢â‚¬â€ Tenant admin team management (Settings Ã¢â€ â€™ Users, Owner flag). Key docs: `docs/sessionlog.md`, `docs/planlog.md`.

**Changes:**
- **Password policy:** `src/lib/auth/password-policy.ts` (min 12, max 128, denylist, normalizePassword, validatePassword, buildExtraDenylist).
- **Forgot password:** Login page "Forgot password?" link; `/admin/login/forgot` (request reset); `/admin/login/reset-password` (set new password with policy); success message on login when `?reset=success`.
- **My Profile:** Change password card (current + new + confirm, policy validation); Security card for non-superadmin uses MFAManagement with allowRemoveLastFactor true; CRM 2FA recommendation banner (dismissible) when hasCrmAccess and no factors.
- **MFA:** Enroll redirect when already has factors Ã¢â€ â€™ `/admin/settings/profile`. Login: only superadmin without factors forced to enroll; tenant admins optional.
- **Invite:** POST tenant-sites users and POST settings team pass `redirectTo: origin + /admin/login/reset-password` so invite acceptance uses our policy.
- **Tenant auth pages:** Layout resolves site name when unauthenticated; AdminLayoutWrapper shows tenant site name header on login/forgot/reset-password.
- **Sessionlog:** Top-priority block replaced with completed summary; next up = First priority (Tenant admin team management).

### 2026-02-03 CT - Phase 09 sub-phases (9A, 9E, 9B, 9D) sessionlog; Phase 12 cancelled

**Context for Next Session:**
- **Sessionlog is unchanged** and ready for tomorrow: Phase 09 (membership working), 9C (members & ownership), 9A (code redemption UI), 9E (gallery enhancement), 9B (marketing research), 9D (AnyChat integration) each have ordered steps or plan references. Pick up from **Next up** in `docs/sessionlog.md`.
- **Phase 12 (Visual Component Library):** Cancelled in planlog. We use the simple Code Library (code blocks/snippets), not a visual component catalog or page section editor; all Phase 12 items marked N/A.
- **Key docs:** `docs/sessionlog.md` (next steps), `docs/planlog.md` (Phase 09 overview table, 9A/9C/9E Ã¢â‚¬Å“What we built vs what we need,Ã¢â‚¬Â 9B/9D full scope, Phase 12 cancelled).

**Changes:**
- **Planlog:** Phase 9A Ã¢â‚¬Å“What we built vs what we needÃ¢â‚¬Â and Phase 9E same (with built/still-needed bullets); Phase 9E overview table and checkboxes updated; Phase 12 status set to Cancelled, all items marked [x] N/A (retained for reference).
- **Sessionlog:** Phase 9A steps (member Apply code, login access code, no-ambiguous preset); Phase 9E steps (external video embed, thumbnail strip, taxonomy filter, shortcode UX, deferred); Phase 9B block (research 2 email platforms, plan reference); Phase 9D block (review AnyChat docs, add integration, plan reference). Sessionlog kept as-is for next session.

### 2026-02-03 CT - View as Role + Site, sub-level feature guards, Roles UI hierarchy

**Context for Next Session:**
- **View as Role + Site** is implemented and tested: Superadmin dashboard card (Site + Role selector), cookie override, red banner with Exit, layout uses `getEffectiveFeatureSlugs(tenantId, roleSlug)` when active; Superadmin link stays visible. No git push this session.
- **Feature hierarchy:** Top-level ON = all sub-items allowed (sidebar + route guard); top-level OFF = only explicitly enabled sub-items. Sub-routes mapped (contacts, marketing, forms, memberships, code_generator); `canAccessFeature` and FeatureGuard use parent slug so having CRM grants all CRM sub-routes.
- **Roles & Features UI:** Toggling a top-level (e.g. CRM) ON turns on all its sub-items; toggling OFF turns off all sub-items. Operator can then turn individual sub-items on manually. Applies to all top-level sections.
- **Next:** Smoke-test core flows; Settings Ã¢â€ â€™ Team; or add new items to sessionlog. Sessionlog cleared to a clean slate.

**Changes:**
- View as Role + Site: `src/lib/admin/view-as.ts`, layout override in `admin/layout.tsx`, banner + Exit in `AdminLayoutWrapper`, `ViewAsCard` on Superadmin page; force-dynamic layout; guard when view-as active never pass "all".
- Sub-level guards: `pathToFeatureSlug` for contacts, marketing, forms, memberships, code_generator, listsÃ¢â€ â€™marketing; sidebar CRM/Media sub-nav by featureSlug; `FEATURE_PARENT_SLUG` and `canAccessFeature` parent rule; FeatureGuard uses `canAccessFeature`.
- RolesManager: top-level toggle adds/removes parent + all children; help text updated. Planlog View as Role + Site checked off.

### 2026-02-03 CT - Sessionlog cleanup; View as Role + Site planned

**Context for Next Session:**
- **Sessionlog is now lean.** Removed completed build-plan items, long MVP checklist, terminology table, route/table renames, and Superadmin layout detail. Sessionlog keeps only: current focus, next up, and View as Role + Site (planned). For full history and backlog use `planlog.md` and `changelog.md`.
- **Done (lives in planlog/changelog only):** Effective features (sidebar filter + FeatureGuard modal), profile (migration 087, Settings Ã¢â€ â€™ Profile), dynamic header (site + role), content editor full page, migrations 081Ã¢â‚¬â€œ087, tenant sites/users/roles UI, route renames. No need to re-read these in sessionlog.
- **Next:** Smoke-test core flows; then Settings Ã¢â€ â€™ Team or View as Role + Site implementation. View as Role + Site spec is in sessionlog (short) and planlog (Phase 18b).

**Changes:**
- **Sessionlog:** Pruned to ~50 lines. Kept: workflow, current focus, next up, View as Role + Site (planned), handoff pointer. Removed: MVP "What's left" list, build plan with done/remaining checkboxes, terminology table, route and table renames, Superadmin layout bullets.
- **Changelog:** This entry added.

### 2026-02-03 CT - Session wrap: Coming Soon snippet, Tiptap alignment, Site Mode UX

**Context for Next Session:**
- **Migrations 088 & 089:** If not yet run, copy `supabase/migrations/088_tenant_sites_coming_soon_message.sql` and `089_tenant_sites_coming_soon_snippet_id.sql` into Supabase SQL Editor and run in order. Adds `coming_soon_message` and `coming_soon_snippet_id` to `tenant_sites`.
- **Priority next step** (sessionlog): Change content creation editor from **modal to full page** with a **back button top left**; modal is too small. Tracked in planlog under Admin content UI.
- **Coming Soon:** Site Mode (General Settings + Superadmin Ã¢â€ â€™ Tenant Sites Ã¢â€ â€™ detail) uses a **snippet dropdown** (Content library, type Snippet). Coming Soon page renders the selected snippet with formatting, links, images, galleries when set; otherwise falls back to headline/message from settings. Snippets API: `GET /api/settings/snippets`, `GET /api/admin/tenant-sites/[id]/snippets`.
- **Tiptap:** Rich text editor has **left/center/right/justify** alignment in toolbar; `@tiptap/extension-text-align@2.1.13`; same extension in `ContentWithGalleries` for public render.
- **Key files:** `GeneralSettingsContent.tsx`, `TenantSiteModeCard.tsx`, `src/app/(public)/coming-soon/page.tsx`, `RichTextEditor.tsx`, `ContentWithGalleries.tsx`, `src/lib/supabase/tenant-sites.ts`, `src/lib/supabase/content.ts` (getSnippetOptions, getContentByIdServer), site-mode API routes, `ComingSoonSnippetView.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Coming Soon (snippet-based):** Migrations 088 (coming_soon_message), 089 (coming_soon_snippet_id). Types and CRUD for both; site-mode GET/PATCH return/accept coming_soon_snippet_id. Snippet dropdown (Select) in General Settings and TenantSiteModeCard; options from GET snippets APIs. Coming Soon page fetches snippet by id when set and renders via ComingSoonSnippetView; else uses getComingSoonCopy(). Radix Select "None" uses value `__none__` (empty string not allowed). updateTenantSite returns `{ ok, error }` so API can return real DB errors to client.
- **Tiptap text alignment:** Added @tiptap/extension-text-align; toolbar buttons (AlignLeft, AlignCenter, AlignRight, AlignJustify) in RichTextEditor; TextAlign in ContentWithGalleries EXTENSIONS for generateHTML.
- **Sessionlog:** "Priority next step" Ã¢â‚¬â€ Content editor modal Ã¢â€ â€™ full page with back button. **Planlog:** Unchecked item under Admin content UI for same.

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
- **PRD:** New subsection Ã¢â‚¬Å“Modular Design & Feature BoundariesÃ¢â‚¬Â (after Deployment Model). Code organized by product feature so each feature can be identified and updated or selectively synced to forks; principle Ã¢â‚¬Å“one feature Ã¢â€°Ë† one coherent boundary.Ã¢â‚¬Â Light **version marking (per module)** documented Ã¢â‚¬â€ forks may diverge, so version control can be per module (comment header or manifest) to compare and selectively update.
- **prd-technical:** New section 8 Ã¢â‚¬Å“Feature Boundaries & Modular Code MapÃ¢â‚¬Â with feature Ã¢â€ â€™ paths table (Content, CRM, Media, Galleries, Forms, Settings, Auth/MFA, Superadmin, Public). New subsection Ã¢â‚¬Å“Version Marking (Per Module)Ã¢â‚¬Â with options A (comment header), B (manifest), C (Git); recommend Option A to start.
- **planlog:** New phase Ã¢â‚¬Å“Code Review, Security, Optimization & Modular AlignmentÃ¢â‚¬Â Ã¢â‚¬â€ documentation (design) items checked; security review, optimization pass, modular alignment (refactor), and optional version marking as unchecked tasks.

**Key files:** `docs/prd.md`, `docs/prd-technical.md`, `docs/planlog.md`.

### 2026-02-03 CT - Session wrap: build fixes, tenant roles/features/team/profile plan

**Context for Next Session:**
- **Build passes:** Lint and type errors fixed across multiple files (Link usage, escaped entities, script/API/auth types, login Suspense for useSearchParams). `pnpm run build` completes successfully.
- **MVP plan in sessionlog:** Tenant roles, feature scope, team, and profile. Seven-step plan: (1) feature registry + role_features, (2) tenant features + getEffectiveFeatures, (3) Phase 03 client_tenants/client_admins/client_admin_tenants + role, (4) superadmin UI (roles, tenant features, assign users), (5) sidebar/route enforcement, (6) Settings Ã¢â€ â€™ Team (tenant admin adds Editor/Creator/Viewer only), (7) profile pages (super under Superadmin; admin/team under Settings). Execute in that order.
- **Key files:** `docs/sessionlog.md` (plan and focus), `docs/planlog.md` (Phase 03, 18, 18b reference). No DB or RLS left in a vulnerable state.

**Changes:**
- Code: ESLint/TypeScript fixes (super page Link; MFAChallenge, FormEditor, ColorsSettings, FontsSettings escaped entities; add-gallery script, galleries page, CRM mags, form submit, galleries mags route, redeem-code route, supabase-auth, content-protection, code-snippets, galleries-server, galleries.ts, licenses; login and admin/login Suspense for useSearchParams). Build succeeds.
- Docs: sessionlog updated with full roles/features/team/profile plan and profile step; completed items (donor folder, build passes) pruned from sessionlog. MVP focus = execute plan steps 1Ã¢â‚¬â€œ7.

### 2026-01-30 CT - PRD and planlog: specs and planning (no code changes)

**Context for Next Session:**
- **Documentation-only session.** Significant updates to PRD and planlog to capture product and technical specs for future development. No code or migrations changed.
- **Planning added/updated:** Page composition (sections in public schema; content UUID/title); RAG Knowledge Document (Phase 16a), Digicards (Phase 11b); central automations layer (trigger/response); FAQ block content type; color palette refactor (preset library in public schema); reusable sections/component library in public schema; **Tenant Team Members, roles & profile** (Phase 18b Ã¢â‚¬â€ Creator role, per-role feature set, team member profile as source for Digicards; Team Ã¢â€°Â  CRM).
- **Next priorities** unchanged: Phase 11 Deployment Tools, reusable components; implement specs when ready.

**Key Files Changed:**
- `docs/prd.md` Ã¢â‚¬â€ Tenant Team Members & Roles (Creator, per-role feature set, custom roles, team member profile; Team Ã¢â€°Â  CRM); Color Palette (central preset table in public); Page composition (sections library in public schema); Admin Users = Team Members; MAG vs Roles updated
- `docs/planlog.md` Ã¢â‚¬â€ Phase 00 (creator role); Phase 01 (color palette refactor: central preset in public); Phase 06 (page composition sections in public, FAQ block, content UUID); Phase 07 (central automations layer); Phase 11b (Digicards Ã¢â€ â€ team profile); Phase 12 (component library in public schema); Phase 16a (RAG Knowledge Document); Phase 18 (per-role note); Phase 18b (Tenant Team Members, Roles & Profile)

**Changes:**
- PRD: Team members & roles (Creator, editor, viewer, client_admin; custom roles; per-role feature set); team member profile (access + Digicards source); Team Ã¢â€°Â  CRM. Color palette and sections library: central tables in public schema.
- Planlog: New/expanded phases and tasks for automations, FAQ block, color palette refactor, sections in public, RAG, Digicards, and Phase 18b (team, roles, profile).

### 2026-01-30 CT - Session wrap: Code Generator Explore page, RAG + Digicards planning

**Context for Next Session:**
- **Code Generator complete** (admin-side): Create batches, generate codes, redeem via API. "Explore" button opens dedicated batch detail page (`/admin/crm/memberships/code-generator/batches/[id]`) with redemption table and contact links. Testing pending: create a batch and redeem to verify.
- **Next priorities:** (1) Phase 11 Deployment Tools (setup, reset, archive scripts), (2) Reusable components + component library for public pages.
- **Planning added:** Phase 16a (RAG Knowledge Document for external AI agents), Phase 11b (Digicards).
- **Deferred:** End-to-end membership testing until public pages exist.

**Key Files Changed:**
- `src/app/admin/crm/memberships/code-generator/batches/[id]/page.tsx` Ã¢â‚¬â€ new batch detail page
- `src/app/admin/crm/memberships/code-generator/batches/[id]/BatchExploreClient.tsx` Ã¢â‚¬â€ client component for redemption table
- `src/app/admin/crm/memberships/code-generator/CodeGeneratorClient.tsx` Ã¢â‚¬â€ "Explore" button, removed codes modal
- `src/app/api/admin/membership-codes/batches/[id]/codes/route.ts` Ã¢â‚¬â€ added contact_id to response
- `docs/planlog.md` Ã¢â‚¬â€ Phase 9A codes API checked off; Phase 16a, 11b added

**Changes:**
- Code Generator: "View table" Ã¢â€ â€™ "Explore" button; dedicated page with Code, Status, Contact/Email (link to contact), Redeemed timestamp.
- Planlog: Phase 16a (RAG Knowledge Document Export), Phase 11b (Digicards).

### 2026-01-30 CT - Session wrap: Membership, Code Generator, Phase 11 priority

**Context for Next Session:**
- **Synced to planlog:** Multi-MAG schema (gallery_mags junction), GalleryEditor Membership Protection, gallery MAG access (checkGalleryAccess, standalone + API), Member login page.
- **Phase reorder:** Phase 11 (Deployment Tools) before Phase 10 (API). API dev deferred until component structure exists.
- **Next priorities:** (1) Membership wrap-up (items not requiring public pages), (2) Phase 9A Code Generator, (3) Phase 11 Deployment Tools, (4) Reusable components + component library for public pages.
- **Deferred:** End-to-end membership testing until public pages exist for reliable testing.
- **Sessionlog** pruned and updated with new focus.

**Key Files Changed:**
- `docs/sessionlog.md` Ã¢â‚¬â€ rewritten with new priorities
- `docs/planlog.md` Ã¢â‚¬â€ checked off completed items, Phase 10/11 status updated

### 2026-01-30 CT - Gallery Phase 2: ImagePreviewModal assign media to galleries

**Context for Next Session:**
- **Gallery Phase 2** complete. ImagePreviewModal has "Assign to galleries" section: checkbox badges for published galleries, add/remove media via gallery_items. Migrations 071Ã¢â‚¬â€œ073 ran successfully.
- **Next:** Gallery Phase 3 (GalleryEditor media picker with taxonomy filter), or Phase 4 (shortcode spec, parser, GalleryRenderer).

**Key Files Changed:**
- `src/lib/supabase/galleries.ts` Ã¢â‚¬â€ getPublishedGalleries, getGalleriesForMedia, addMediaToGallery, removeMediaFromGallery
- `src/components/media/ImagePreviewModal.tsx` Ã¢â‚¬â€ Assign to galleries section with checkbox badges

**Changes:**
- Galleries lib: getPublishedGalleries, getGalleriesForMedia (with gallery name/slug), addMediaToGallery, removeMediaFromGallery.
- ImagePreviewModal: Assign to galleries section; load published galleries and current assignments; toggle to add/remove media from galleries.

### 2026-01-30 CT - Members Table & Ownership (User Licenses)

**Context for Next Session:**
- **Phase 9C (Members & Ownership)** implemented: `members` and `user_licenses` tables, utilities, types. Migrations 072, 073 ready to run in Supabase SQL Editor. See `docs/reference/members-and-ownership-summary.md` for design.
- **Elevation flow:** Simple signup = contact only. Member = purchase OR admin grant OR signup code. Form `auto_assign_mag_ids` only for qualifying forms.
- **Next:** Run migrations 072 and 073 in Supabase; continue Gallery Enhancement Phase 2 (ImagePreviewModal assign media to galleries) or Phase 9A Code Generator (requires members table).

**Key Files Changed:**
- `supabase/migrations/072_members_table.sql` Ã¢â‚¬â€ members(contact_id, user_id nullable), RLS
- `supabase/migrations/073_user_licenses_table.sql` Ã¢â‚¬â€ user_licenses(member_id, content_type, content_id), RLS
- `src/lib/supabase/members.ts` Ã¢â‚¬â€ getMemberByContactId, getMemberByUserId, createMemberForContact, resolveMemberFromAuth
- `src/lib/supabase/licenses.ts` Ã¢â‚¬â€ hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership
- `src/types/database.ts` Ã¢â‚¬â€ members, user_licenses types
- `docs/reference/members-and-ownership-summary.md` Ã¢â‚¬â€ design summary
- `docs/planlog.md` Ã¢â‚¬â€ Phase 9C added and items checked off
- `docs/sessionlog.md` Ã¢â‚¬â€ Phase 9C items completed

**Changes:**
- Members table: qualified contacts (MAG + auth). Existence of row = member; user_id nullable until register.
- User licenses table: per-item ownership for media and courses (iTunes-style "My Library"). Access: MAG OR ownership.
- Members utilities: getMemberByContactId, getMemberByUserId, createMemberForContact (idempotent), resolveMemberFromAuth.
- Licenses utilities: hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership.

### 2026-01-30 CT - MAG mag-tag creation, content-protection helper, Gallery Enhancement plan

**Context for Next Session:**
- **Gallery Enhancement** is the priority. Start with Phase 1: migration for galleries (status, access_level, required_mag_id), GalleryEditor status field. Then Phase 2: ImagePreviewModal assign media to galleries; Phase 3: taxonomy filter in gallery media picker; Phase 4Ã¢â‚¬â€œ6: shortcode, builder UIs, public page. Full plan in planlog "Gallery Enhancement" section.
- **Membership protection testing** depends on galleries being functional. After galleries: member auth, checkContentAccess, filter gallery items by mag-tag, end-to-end testing.
- **MAG mag-tags:** On MAG create/update, taxonomy tag `mag-{uid}` auto-created in image, video, membership sections. Existing MAGs: save on detail view creates tag.
- **content-protection.ts:** Helper to resolve mag-tags on media, check user MAGs for visibility. Ready for gallery API integration once member auth exists.

**Key Files Changed:**
- `src/lib/supabase/taxonomy.ts` Ã¢â‚¬â€ ensureMagTagExists, addMagTagSlugToSections, membership section
- `src/lib/mags/content-protection.ts` Ã¢â‚¬â€ getMagTagSlugsOnMedia, canAccessMediaByMagTags, filterMediaByMagTagAccess, getMagUidsForContact
- `src/app/api/crm/mags/route.ts` Ã¢â‚¬â€ call ensureMagTagExists after create
- `src/app/api/crm/mags/[id]/route.ts` Ã¢â‚¬â€ call ensureMagTagExists after update
- `src/app/admin/crm/memberships/[id]/MAGDetailClient.tsx` Ã¢â‚¬â€ Dialog warning when UID/MAG-TAG changed (unsync relations, manual update)
- `supabase/migrations/070_add_membership_taxonomy_section.sql` Ã¢â‚¬â€ membership section for mag-tag grouping
- `docs/planlog.md` Ã¢â‚¬â€ Gallery Enhancement phase (7 phases)
- `docs/sessionlog.md` Ã¢â‚¬â€ focus galleries first, then membership

**Changes:**
- MAG create/update: auto-create taxonomy tag `mag-{uid}` in image, video, membership sections. Idempotent.
- Membership taxonomy section: new staple section for filtering mag-tags in Taxonomy Settings.
- MAGDetailClient: UID/MAG-TAG change warning dialog (relations unsync, manual update needed).
- content-protection: resolve mag-tags on media, filter by user MAGs for visibility.
- Gallery Enhancement plan: schema, assignment (mediaÃ¢â€ â€galleries), shortcode (spec, parser, renderer), builder UIs, public page.

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
- **Context for Next Session:** CRM Custom Fields section is complete (form filter, persist accordion open state, PATCH custom-fields API, inline edit per row). Sessionlog synced to planlog and pruned; items that will be implemented with memberships remain in sessionlog. **Next:** Membership code Ã¢â‚¬â€ Memberships page (`/admin/crm/memberships`), MAG list/select/contacts, list/create/edit MAGs; then Review walk-through; Boei integration in a future session.
- **Updated:** `docs/sessionlog.md` Ã¢â‚¬â€ Wrapped up CRM (Custom Fields form filter, persist open, inline edit, API). Checked off and removed completed items; kept Ã‚Â§4 Memberships (MAG tables/RPCs, mags.ts, Admin Memberships page), Ã‚Â§5 Review, Ã‚Â§6 Boei for next work. Current focus set to memberships.
- **Synced:** Completed sessionlog steps matched and checked in `docs/planlog.md` (Phase 08 Custom Fields already marked done).
- **Note:** Doc(s) moved to `docs/archived` to keep root clean (per user).

### 2026-01-28 (session wrap-up) - CRM/forms evaluation; Boei next session
- **Context for Next Session:** CRM and forms in good shape. This session: evaluation and sessionlog update (sidebar "New" badge, fixed "New" status, status on Taxonomy card, contact list columns/sort/clickable row, form submit API and submissions list). **Next up:** Optional Custom Fields form filter; Phase 09 Memberships; full review walk-through. **Next session:** Review [Boei](https://boei.help/) docsÃ¢â‚¬â€page widget (forms, links, chatbot); use Boei API to add forms/submissions into CRM. Sessionlog Ã‚Â§6 has the Boei review task.
- **Updated:** `docs/sessionlog.md` Ã¢â‚¬â€ Added Ã‚Â§6 Next session: Boei integration (review); Context updated for handoff.

### 2026-01-28 (evaluation) - CRM and forms completed; sessionlog updated
- **Context for Next Session:** CRM and forms are in good shape. **Completed (this session / evaluation):** Sidebar "New" badge (red counter on CRM header, slug `new`; fixed "New" status in Settings Ã¢â€ â€™ CRMÃ¢â‚¬â€non-deletable, slug read-only); status selector on contact detail Taxonomy card (Save persists status + taxonomy, `router.refresh()` updates Contact card); contact list columns (Last name, First name, Email, Phone, Status, Updated), sort by last name, whole row clickable to view; form submit API and submissions list (`/admin/crm/forms/submissions`). **Next up:** Optional Custom Fields form filter on contact detail; Phase 09 Memberships (MAG list, select MAG Ã¢â€ â€™ contacts) if not done; then full review walk-through.
- **Updated:** `docs/sessionlog.md` Ã¢â‚¬â€ Added "Completed (this session / evaluation)" summary; checked off form submission API, form submissions view, and Contact Status Ã‚Â§8; reordered Forms Ã‚Â§3 (submit + submissions done, filter-by-form deferred); updated Context for changelog handoff.

### 2026-01-28 17:30 CT - Session wrap-up: Forms page fixes, custom field types, form-field assignment plan
- **Context for Next Session:** Forms page (`/admin/crm/forms`) fixed and extended. **Error fetching forms** resolved: `forms` table lacked `auto_assign_tags` / `auto_assign_mag_ids`; migration 059 added those columns. `forms.fields` NOT NULL caused "null value in column fields" on create; migration 060 made `fields` nullable + default `[]`. Removed `.from()` fallback in `getForms` (prd-technical: reads via RPC only). Added `formatSupabaseError` in crm.ts for clearer RPC errors. Custom field types: **select** and **multiselect**; options in `validation_rules.options` (one per line in UI). Forms tab: add/edit/delete form definitions (name, slug). **Next up:** **Assign form fields to form** Ã¢â‚¬â€ Form = logical grouping of custom fields. Steps in `sessionlog.md` Ã‚Â§3 (migration for formÃ¢â‚¬â€œfield link, RPC/crm.ts, Forms UI multi-select, API). **Filter by form on contact Custom Fields tab** deferred until form-field assignment is done.
- **Updated:** `sessionlog.md` Ã¢â‚¬â€ Form registry (list, new, edit) marked done and pruned; added "Assign form fields to form" (migration, RPC, UI, API) and "Filter by form on contact Custom Fields tab (later)". Context for next session.
- **Updated:** `planlog.md` Ã¢â‚¬â€ Phase 08 form registry UI marked done (Custom Fields + Forms tabs, select/multiselect, migrations 059/060); added "Assign form fields to form" and optional contact-filter steps.
- **Updated:** `src/lib/supabase/crm.ts` Ã¢â‚¬â€ `formatSupabaseError`, `getForms` RPC-only (no `.from()` fallback).
- **Updated:** `src/app/admin/crm/forms/CrmFormsClient.tsx` Ã¢â‚¬â€ Custom field types select/multiselect; options textarea in modal; `validation_rules.options` on save.
- **Added:** `supabase/migrations/059_add_missing_forms_columns.sql` Ã¢â‚¬â€ add `auto_assign_tags`, `auto_assign_mag_ids` to `forms`.
- **Added:** `supabase/migrations/060_fix_forms_fields_column.sql` Ã¢â‚¬â€ make `forms.fields` nullable, default `[]`.

### 2026-01-26 19:00 CT - Session wrap-up: Phase 05 check-off, build/runtime fixes, docs
- **Context for Next Session:** Content phase (1Ã¢â‚¬â€œ13) complete. Dev server runs clean; `/admin/content` loads without Fast Refresh full-reload errors. **Phase 05** (Media Library) checked off in planlog; **Phase 06** (Content, legacy redirects) done. **Fixes this session:** `@radix-ui/number` added as explicit dependency (resolve "Module not found" build error); Content page split into `ContentPageClient` + server `page` with `<Suspense>` around `useSearchParams` (fix "Fast Refresh had to perform a full reload due to a runtime error"). Sessionlog cleared; planlog and changelog updated.
- **Updated:** `planlog.md` Ã¢â‚¬â€ Phase 05 marked complete (core), deferred items noted; "Phase 05 created: media, media_variants" in schemas section.
- **Updated:** `package.json` Ã¢â‚¬â€ `@radix-ui/number` ^1.1.1.
- **Updated:** `admin/content` Ã¢â‚¬â€ `ContentPageClient.tsx` (client, `useSearchParams`), `page.tsx` (server, `Suspense` wrapper).
- **Updated:** `sessionlog.md` Ã¢â‚¬â€ pruned completed steps; Current Focus / Next Up reset for next session.

### 2026-01-26 17:15 CT - Legacy routes redirect (Step 12)
- **Context for Next Session:** Step 12 complete. `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]` redirect to `/admin/content?type=post`; `/admin/pages` redirects to `/admin/content?type=page`. Content page reads `?type=` and sets type filter. Phase 06 content work done. `PostEditor` unused (can remove later).
- **Updated:** `admin/content/page.tsx` Ã¢â‚¬â€ `useSearchParams`, `useEffect` to set `typeFilter` from `?type=`.
- **Replaced:** `admin/posts/page`, `admin/posts/new/page`, `admin/posts/[id]/page` Ã¢â‚¬â€ redirect to `/admin/content?type=post`.
- **Added:** `admin/pages/page.tsx` Ã¢â‚¬â€ redirect to `/admin/content?type=page`.

### 2026-01-26 16:45 CT - Public blog/page routes (Step 11)
- **Context for Next Session:** Step 11 complete. Public routes: homepage `/` (page slug `/` or fallback), blog list `/blog`, single post `/blog/[slug]`, dynamic pages `/[slug]`. `RichTextDisplay` renders Tiptap JSON Ã¢â€ â€™ HTML with prose. `generateMetadata` for post/page titles. Duplicate `app/page.tsx` removed; `(public)/page` is sole homepage. Added `@tiptap/core` for `generateHTML`. Next: legacy redirects (12).
- **Added:** `RichTextDisplay` (StarterKit, Image, Link; `generateHTML` + prose), `(public)/blog/page`, `(public)/blog/[slug]/page`, `(public)/[slug]/page`.
- **Updated:** `(public)/page` Ã¢â‚¬â€ fetch page `/`, render or fallback; `package.json` Ã¢â‚¬â€ `@tiptap/core`.
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
- **Added:** `prd.md` Ã¢â‚¬â€ "Third-Party Integrations" section describing Google Analytics, VisitorTracking.com, and SimpleCommenter (purpose, when to enable/disable, "not blog comments").
- **Added:** `prd-technical.md` Ã¢â‚¬â€ "SimpleCommenter (simple_commenter)" subsection under Integrations (purpose, config, script injection, blog comments clarification).
- **Updated:** `IntegrationsManager.tsx` Ã¢â‚¬â€ SimpleCommenter description: "Client feedback tool for dev/staging: pinpoint annotations on the site. Disable in production. Not for blog comments."
- **Updated:** `integrations.ts` Ã¢â‚¬â€ JSDoc; `(public)/layout.tsx` Ã¢â‚¬â€ comment above SimpleCommenter script.
- **Updated:** `planlog.md` Ã¢â‚¬â€ Script injection bullet now states SimpleCommenter is dev feedback, disable in production, not blog comments.

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
- Step 4: Upload Media modal Ã¢â‚¬â€œ two modes
  - **Upload file:** `MediaFileUpload` Ã¢â‚¬â€œ drop/browse, accept images + video (mp4, webm, mov). Auto-detect image vs video; images get variants, videos upload raw, `video_url` = storage URL
  - **Add Video URL:** `AddVideoUrlForm` Ã¢â‚¬â€œ URL + optional name, validate YouTube/Vimeo/Adilo, `normalizeVideoUrl`, create media with `video_url`
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
  - Form state cleanup when switching between different edit operations (e.g., edit section Ã¢â€ â€™ edit category no longer conflicts)
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
- **Context for Next Session:** Color palette UI uses 3Ãƒâ€”5 grid (Alternate 1 in row 2, Alternates 2Ã¢â‚¬â€œ6 in row 3). Labels match schema (Alternate 1Ã¢â‚¬â€œ6). Planlog includes "Color palette schema evolution (consider)" for `color01`Ã¢â‚¬â€œ`color15` + user-defined labels. Docs live only in `docs/`; `.cursor/` holds only `rules/`. Ready to test palette features, continue Phase 02/05, or explore color01Ã¢â‚¬â€œcolor15 when desired.
- Color palette layout (ColorsSettings)
  - Reorganized to **3 rows Ãƒâ€” 5 columns** to fix unbalanced 5-column grid (core 9 = 5+4, alternates 6 = 5+1)
  - Row 1: Primary, Secondary, Accent, Background, Background Alt
  - Row 2: Foreground, Foreground Muted, Border, Link, Alternate 1
  - Row 3: Alternate 2Ã¢â‚¬â€œ6
  - Single "Brand & theme colors (15)" section; merged former Core/Alternate blocks
- Reverted label renames (no Hover / Alternate 1Ã¢â‚¬â€œ5)
  - Kept schema keys as `alternate1`Ã¢â‚¬â€œ`alternate6`; display labels stay "Alternate 1"Ã¢â‚¬â€œ"Alternate 6"
  - Avoids label/schema mismatch (e.g. "Alternate 1" Ã¢â€ â€ `alternate2`)
- Planlog: added "Color palette schema evolution (consider)" to Session Continuation
  - Future option: `color01`Ã¢â‚¬â€œ`color15` fixed keys + user-defined labels; store labels separately; migration from current keys
  - Enables flexible naming (e.g. Hover, Success) without schema changes
- Removed duplicate docs from `.cursor/` root (accidental copy/paste)
  - Compared 14 `.md` files in `.cursor/` vs `docs/`; 13 identical, `planlog.md` differed (docs newer, has color-palette step)
  - Deleted all 14 duplicates from `.cursor/`; `docs/` is sole source of truth for project docs
  - Retained `.cursor/rules/` (coding.mdc, MCP.md, structure.mdc)
- **Files Changed:**
  - Updated: `src/components/settings/ColorsSettings.tsx` (3Ãƒâ€”5 grid, single palette section, label revert)
  - Updated: `docs/planlog.md` (color01Ã¢â‚¬â€œcolor15 step in Session Continuation)
  - Deleted: 14 duplicates from `.cursor/` root (`ADDING_NEW_TABLES_CHECKLIST.md`, `ADDING_NEW_TABLES.md`, `ARCHITECTURE_DECISION_SCHEMAS.md`, `changelog.md`, `CLIENT_SETUP_CHECKLIST.md`, `MFA_SETUP.md`, `planlog.md`, `prd.md`, `SECURITY_RPC_FUNCTIONS.md`, `SESSION_SUMMARY.md`, `STATUS.md`, `SUPABASE_SCHEMA_SETUP.md`, `TESTING_2FA.md`, `TESTING_SETUP_SCRIPT.md`)
- **Next Steps:** Test palette features; Phase 02 (admin dark theme) or Phase 05 (Media Library); consider color01Ã¢â‚¬â€œcolor15 when ready

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
  - Status tracking (planned Ã¢â€ â€™ in progress Ã¢â€ â€™ complete)
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
  - Duplicate detection logic (perfect match Ã¢â€ â€™ update, partial match Ã¢â€ â€™ flag for review)
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
- Updated PRD to standardize template Ã¢â€ â€™ client fork workflow and promotion process back to the template via PRs
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
