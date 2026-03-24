# Plan Log

This document tracks planned work and remaining tasks for the Website-CMS project. For **MVP-through-fork** handoff, see [sessionlog.md](./sessionlog.md) — **open items only**; completed MVP work is checkmarked in the phase sections below and in [changelog.md](./changelog.md).

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
- **Notifications & PWA:** Admin → Settings → Notifications (route, actions list, preferences); SMTP config storage, encryption, Admin/Superadmin UIs, send lib, test endpoint; `notifyOnFormSubmitted` (email + PWA per preferences). PWA: `/status` page, manifest, push subscriptions, VAPID, service worker, StatusPushSubscribe. Tenant setup checklist: single doc with env list, Vercel section, merged env templates (archived).
- **Contact outbound email & SMTP branding:** Drop-in `ComposeEmail` component (subject, body, attachments, dialog); send-email API and `sendEmail()` support attachments; activity log `email_sent` with snippet + attachment count. SMTP branding MVP: from-name fallback to site name when unset; minimal HTML wrapper for text-only sends. Contact UX: delete button moved to edit page; top row order Status, Merge, Edit, Compose email.
- **GPUM member area (public):** `/members` dashboard (links to profile, account; Apply code); `/members/profile` (display name, avatar via user_metadata); `/members/account` placeholder for password etc. Sessionlog documents MVP; account settings to be built.
- **Taxonomy — category home + order (migration 175):** One home section per category; `display_order`; Taxonomy Sections + Categories UI (drag/save). **Open:** order category pickers in tasks/projects/content by `display_order` then name (see Phase 06/07 backlog if tracked).
- **Cursor session docs:** `.cursor/rules/sessions.mdc` + `.cursor/rules/coding.mdc` — **changelog** updates batched at **session wrap-up** (or explicit ask / release), not after every edit.
- **Phase 18C planning (Directory + messages/notifications):** Full checklist under **Phase 18C** below + [prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging); **design locks** done — implementation (migrations, APIs, UI) remains open.
- **Number sequences (migration 194):** `number_sequences.sequence_year` (UTC); `get_next_invoice_order_number` and `tasks_assign_task_number` reset the `NNNNN` segment to `start_number` when the UTC calendar year changes (Jan 1 UTC). Formats `INV-YYYY-NNNNN` / `TASK-YYYY-NNNNN`. Run SQL in Supabase SQL Editor per tenant schema.

---

## MVP completion track (fork-ready)

**Open items:** [sessionlog.md](./sessionlog.md) — sections **1–5** (unchecked only). **Completed** MVP work: check boxes **below** in phases **00**, **18C**, **19**, **21**, etc., and record sessions in [changelog.md](./changelog.md). When you finish something listed in sessionlog, remove it there and check the matching bullet here (or add a bullet here if the work was sessionlog-only).

| Sessionlog section | Planlog / docs |
|--------------------|----------------|
| 1. Tasks & Projects (open) | Phase **19** (+ QA bullet below); optional Directory in Phase **18C** |
| 2. Resources | **No sessionlog lines** when Phase **21** MVP slice is done; **MVP-if-time** [picker hints](#event-resource-picker--mvp-if-time-permits) |
| 3. Messaging & notifications | Phase **18C**; [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) |
| 4. Shared identity UX | Phase **00** (Shared identity UX bullets) |
| 5. Pre-fork | Code Review & Modular Alignment; Performance & Caching; Phase **00** setup/deploy; **[mvt.md](./mvt.md)** |

### Event resource picker — MVP if time permits

Proactive hints so users see **availability before save** (not only after **409** / conflict dialog). **Server** enforcement on **`event_resources`** stays mandatory (races, recurrence). **Ship one or both** when schedule allows before fork MVP; check boxes here when done.

- [ ] **Unavailable / ghost (overlap):** When event draft **start/end** are set, extend picker option model + API (e.g. `unavailableResourceIds`) for resources that overlap other **`event_resources`** in that window (broader than exclusives-only).
- [ ] **Busy exclusive (dim / label):** When draft times are set, dim or label **exclusive** resources already booked in the window — debounced **`POST /api/events/check-conflicts`** or a slim read-only endpoint.

**Ref:** [event-resource-conflicts.md](./reference/event-resource-conflicts.md). Implementation detail also tracked under [Phase 21](#phase-21-asset--resource-management) (picker APIs + `check-conflicts`).

**Post-MVP** items remain in the phase sections below (e.g. Phase **20** calendar, Phase **21** full asset manager, Phase **22** accounting, analytics).

---

## Remaining Work (by phase)

### Phase 00: Supabase Auth Integration

**Status:** In progress. Core auth, MFA (TOTP), password policy, integrations, and superadmin area done.

- [ ] Test Automated Client Setup Script (required before deploying a fork)
- [x] Superadmin → Tenant Sites → [site] → Site URL field (for gallery standalone URL prefix)
- [ ] Template (root) domain deployment: Vercel, env vars, superadmin user, test auth
- [ ] Integrations: test script injection, enable/disable, superadmin-only access
- [x] 2FA: API route AAL checks; RLS for AAL if needed; edge cases (session refresh, last factor); testing. MFA verify on Vercel fixed (cookie carrier, token relay / success-page cookies; working as expected).
- [ ] SMS/Phone 2FA: deferred

- **MVP — Shared identity UX (PHP-Auth / one account across the tenant family):** Spec: [prd.md — Shared identity UX (forks)](./prd.md#shared-identity-ux-forks). Single Supabase Auth user across forks sharing the project; messaging and emails must stay **enumeration-safe** on cold pages; **PHP-Auth** may appear helpfully in **transactional email** and richer copy when signed in.
  - [ ] Implement tiered copy: cold `/login`, `/register`, forgot-password; signup/welcome (+ optional reset/confirm) emails; signed-in Security / account / admin profile help
  - [ ] Signup/welcome email: mention PHP-Auth usefully; no tenant directory or attacker-useful infra map
  - [ ] Profile / settings UI: label **global** vs **this site only** fields where tenant-local metadata exists
  - [ ] Fork / deployment checklist: confirm auth + email templates still comply (see PRD subsection)

### Phase 01: Foundation & Infrastructure

- [x] **skip - decided to keep on local installations** Color palette: central preset library in public schema; tenant custom palettes only in tenant

### Phase 02: Superadmin UI

- [x] **skip** Admin dark theme (optional; previously decided to skip)

### Phase 03: Tenant Admin Management (Tenant Sites & Users)

**Status:** Complete. Tenant Sites, Tenant Users, site mode + lock, invite on add user.

- [x] Optional: Custom email template for new admin welcome; tenant-specific login URL in template

### Phase 04: Tenant Admin UI

**Status:** Complete. Sidebar, Dashboard, Content, Media, Galleries, Forms, CRM, Settings.

- [x] **Sidebar — Content consolidation:** One top-level "Content" with sub-items: Text Blocks (current Content page), Media (Media Library), Galleries. Remove separate top-level Media nav item. Do this before Phase 19 roles/gate sidebar work.

### Phase 05: Media Library

**Status:** Core complete. Deferred: local copy workflow, `createClientBucket`/`renameBucket`, `getImageUrl`, `POST /api/media/[id]/optimize`, video embed on public.

- [x] Deferred: Local copy workflow (schema, local-copy.ts, UI)
- [x] Deferred: Video embed component for public pages

### Phase 06: Content Management

**Status:** Core complete. Shortcode Library MVP planned (see sessionlog for phased steps).

- [x] Document content-by-UID for code library; example snippets
- [x] Optional: FAQ block content type (create/edit, body or fields, public render)
- [x] Blog template — author on post: Author dropdown in Content Status (GET /api/admin/authors); author_id saved; “By {name}” on /blog/[slug].
- [x] Author display from profile: Superadmin in author picker; content/comment author resolution uses profile display_name (Settings → My Profile) first, then user_metadata, then email. Phase 2b form steps in sessionlog.
- [x] **Shortcode Library MVP Phase 1 + 1a + 2 + 2b:** Public shortcode_types; universal picker; Gallery, Media, Separator, Section break, Spacer, Clear, Button, Form, Snippet; alignment; media size; Layout wizard (composite shortcode, Form column); Form styles, FormEmbed, embed code. **Phase 3 eliminated:** Content shortcode + default content types cover Quote/FAQ/Accordion (use content types + [[content:id]] or Layout → Content); no dedicated quote/faq_sets tables or specialized shortcodes.
- [x] **Taxonomy — category home + order (migration 175):** Schema + UI for single home section per category and scoped drag `display_order` (Sections tab, Categories list Save order).
- [ ] **Taxonomy — consumer pickers:** Order category pickers by `display_order` then name (tasks/projects/content APIs and UI) — next pass.

### Phase 07: CRM

**Status:** Core complete (schema, contacts list + detail, Activity Stream, taxonomy, custom fields, MAGs, marketing lists, forms, submissions, bulk actions, trash).

- [x] Activity Stream dashboard widget (combined activity stream + filters on admin dashboard)
- [x] Contact merge: detail page Merge button + bulk "Merge 2 contacts" (Bulk actions when exactly 2 selected); irreversible warning and checkbox; MergeBulkDialog to pick primary; mergeContacts in crm.ts, POST /api/crm/contacts/merge.
- [x] Merge field selector: side-by-side UI (MergeSideBySide), fieldChoices in merge API, suggested primary in bulk; GET /api/crm/contacts/[id]/custom-fields.
- [x] CRM external UIDs (4 columns): external_crm_id, external_vbout_id, external_stripe_id, external_ecommerce_id; migration 113; getContactByExternalId(source, id).
- [x] CRM contact list sort: column headers (Last name, First name, Full name, Status, Updated) clickable; default sort = Updated desc (last activity at top).
- [x] Optional: `crm_consents`; auto-assign tags on form submit; central automations layer; push to external CRM
- [x] **CRM avatar_url (contacts + organizations):** Migration 172 (tenant schema). Add avatar_url to crm_contacts and organizations; create/edit forms + Media Library picker; project list uses for client and member avatars.

- **CRM organizations ↔ contacts linking (phone-first):**
  - [x] **Schema — organization company fields:** confirm/add `company_domain` on organizations; keep `company_email` and `company_phone` as company-level fields.
  - [x] **Schema — multi-value contact methods:** add labeled phone/email rows for contacts with `label` (work, mobile, personal, main), `value`, `normalized_value`, and `is_primary`.
  - [x] **Matching — phone-first linking:** when a contact phone uniquely matches an organization phone, auto-link the organization/contact relationship; ambiguous matches become review suggestions.
  - [x] **Matching — manual override and review:** provide a review UI to confirm/reject matches and manually add/remove organization links without losing history.
  - [ ] **Later — email/domain matching:** add email/domain-based matching after phone-first linking is stable.

### Phase 08: Forms Management

**Status:** Complete. Form protection (rate limit, honeypot, reCAPTCHA, time-on-page) implemented; see changelog 2026-03-13.

- [x] **skipped** Optional: "Edit all" mode in Custom Fields section (contact detail)
- [ ] **Future:** Form protection — optional AI + BYOK (tenant API key) to score submissions as spam/legitimate; run after captcha/honeypot; allow/reject or flag for review.

### Phase 09: Membership (MAG, Protection, Code Generator)

**Status:** Core complete (MAG schema, gallery + media protection, code generator, member routes, Apply code, membership feature switch). Remaining:

- [x] Content protection (blog/pages): `checkContentAccess`, gate blog + dynamic [slug], redirect to login with return URL; never send restricted body to unauthorized users
- [ ] Protected video: `/api/stream/media/[id]` proxy (verify session + MAG, stream bytes). **Deferred:** Protected media on public pages will use existing membership (MAG) at page level; dedicated stream/proxy when needed later.
- [ ] Protected download: `/api/download/media/[id]` (proxy or expiring signed URL). **Deferred:** Same as above; page-level membership gating first.
- [ ] Vimeo domain restriction plan; consider Roku/OTT if needed
- [x] Membership and media: Red "M" badge on gallery list/grid and media library; optional backfill from mag-tags
- [x] Content editor: section-level restrictions; Tiptap protected text (shortcode); menu item restrictions

- [x] Member auth: optional register page; `/api/auth/member/*`; middleware for member routes
- [x] GPUM member area (public): `/members` dashboard, `/members/profile` (display name, avatar); `/members/account` placeholder
- [x] Dashboard: membership stats; `/admin/members` list; link form submissions to member profiles (email match)

### Phase 9C: Members Table & Ownership

**Status:** Schema and utilities complete. Admin assign MAG → create member done.

- [x] Optional: First-time code redemption (register with code on login)
- [x] Update LMS Phase 17 plan to use `user_licenses` for course enrollment

### Phase 9A: Code Generator & Redemption

**Status:** Core complete. Apply code on member dashboard done. Code Generator module (CG.0–CG.8): batches table, create modal scrollable, codes living table with batch/status filter and search, CSV export, manual mark used, batch_id in redeem response for workflows. See sessionlog "Code Generator Workflow" for scenarios.

- [x] Optional: "No ambiguous" character preset in admin generator UI; custom exclude list

### Phase 9E: Gallery Enhancement

**Status:** Core complete (shortcode, GalleryEmbed, GalleryPreviewModal with image + native video, MAG protection).

- [x] GalleryPreviewModal: external video embed (YouTube/Vimeo/Adilo); thumbnail strip; zoom/pan for images
- [x] Gallery page: filter items by media taxonomy (categories/tags) in header
- [x] Future: Content–gallery linking (junction, editor UI); gallery style templates & presets

### Phase 09Ecom: Ecommerce (Lightweight)

**Status:** Core complete. Cart, orders, checkout (Stripe price_data), webhook, return URL, order history, digital delivery, coupons, subscriptions, sync/import/export all implemented. Core taxonomy sections (linked to core content types) are protected and not deletable. Lightweight relative to WooCommerce; reuse CRM where possible. **Currency:** USD only (US developer). **Security:** No PCI on local app — no card data stored; Stripe handles all payment data.

**Phase 09 scope (complete ecommerce):** (1) **Data:** CRM addresses, product content type + product table, cart, orders + order_items, coupons (code batches + discount fields). (2) **Admin:** Ecommerce nav, Products list/UI, Orders list/detail + fulfillment, order metrics (dashboard + PWA), email templates, RLS. (3) **Checkout:** Cart → collect address → apply coupon app-side → create order → Stripe Checkout (price_data) → webhook + return. (4) **Customer/public:** Shop, product, cart, checkout, success; **order history** (logged-in: e.g. /members/orders; guest: lookup by email + order number or link); **digital delivery** (access links on order detail and in email). (5) **Stripe:** Product-only sync, no Price; app-side discounts; webhook. (6) **Safety:** No PCI; abandoned/failed visibility; stock optional.

**Tables (tenant schema):** Product = content (type Product) + related `product` table; cart_sessions (or cart + cart_items); orders; order_items (reference content_id). Reuse and extend `membership_code_batches` / `membership_codes` for coupons (use_type, discount fields or `coupon_discounts`). Order history = list/detail from orders.

**Customer pages:** Shop/catalog, product page, cart page, checkout (collect info → redirect to Stripe), return/success, order history (and optional account/order hub). See **Public routes and customer account pages** below.

**Product = content + related table (mapping):**

| From content (reuse) | From related `product` table (new) |
|----------------------|-------------------------------------|
| id (content_id), title, slug, body, excerpt, featured_image_id, status, published_at, created_at, updated_at, seo_title, meta_description, og_image_id; taxonomy for categories/tags | content_id (FK, UNIQUE), **price** (in CMS; not pushed to Stripe), currency, stripe_product_id (Stripe Product only; no Price created), sku, stock_quantity (optional), gallery_id (optional FK → galleries), **taxable**, **shippable**, **available_for_purchase** |

**Product types (driven by taxable + shippable):** Physical (taxable, shippable); Digital (taxable, not shippable); Service (not taxable, not shippable); Virtual e.g. SaaS (taxable = true or false per product, not shippable). Checkout collects shipping address only when cart contains at least one shippable product; otherwise billing address only.

- [x] **CRM addresses (billing + shipping):** Treat existing `crm_contacts` address fields as **billing**. Add shipping columns: `shipping_address`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`. Use shipping for delivery when any shipping field is set; otherwise use billing for both. Migration; update `CrmContact` type and RPCs; contact detail/edit UI: Billing address (existing) + Shipping address (optional, “if different”).
- [x] **Product content type:** Add "Product" to `content_types` (slug e.g. `product`) as a **core default** (can't delete). Show it in **Settings → Customizer → Content types** and in **Settings → Taxonomy** so taxonomy can be applied to products. Hide it only from the main **Content list** view (products managed under Ecommerce → Products). Products are content rows with this type; use taxonomy for product categories/tags.
- [x] **Core taxonomy sections not deletable:** In Settings → Taxonomy, core sections (for core content types) must not be deletable. Section = content type; core content types and their taxonomy sections are protected and not deletable (is_core guard in UI).
- [x] **Related `product` table:** Migration (tenant schema). Columns: `content_id` (UUID FK → content.id, UNIQUE, NOT NULL), `price` (numeric/decimal; used at checkout, not pushed to Stripe), `currency` (text, default USD), `stripe_product_id` (text nullable; Stripe Product ID only; no Stripe Price), `sku` (text nullable), `stock_quantity` (integer nullable; null = no stock tracking; off by default), `gallery_id` (UUID nullable FK → galleries), `taxable` (boolean, default true), `shippable` (boolean, default false), `available_for_purchase` (boolean, default true). RLS; one row per product content. Product image gallery = featured_image_id (content) + gallery_id (product) → gallery_items for extra images.
- [x] **Product lib + RPC/API:** Helper to get product by content_id or by content slug (join content + product table, optional gallery). List products = content by type Product with join to product; public API for shop/catalog and product detail. Shop visibility: content **published** + product has **stripe_product_id** set + **available_for_purchase** = true. Optional: if stock_quantity is set, enforce at add-to-cart or checkout and decrement on payment (simple stock manager).
- [x] **Content list excludes products:** In the main admin Content list (and "New content" picker if desired), filter out content type `product` so editorial users only see posts, articles, snippets, etc. Products are managed only under Ecommerce.
- [x] **Ecommerce nav + Products list:** Add **Ecommerce** top-level sidebar nav; under it, **Products** (and later Orders, etc.). Products list shows only content where type = Product (join to `product` table). Single place for product management. Reuse existing components (content table, shortcodes, galleries, media); the product UI is a dedicated mini-UI that uses the same building blocks.
- [x] **Admin product UI (under Ecommerce):** Under Ecommerce → Products: list (content type Product only), create/edit product with full product form: content fields (title, slug, body, excerpt, featured_image_id, status, SEO) plus product section (price, currency, stripe_product_id [read-only after sync], sku, stock_quantity, gallery_id with gallery picker, taxable, shippable, **available_for_purchase**). "Create Stripe Product from CMS Product" button syncs Product only to Stripe (no Price). Create/update content row (type Product) and related `product` row.
- [x] **Order address snapshot and CRM update:** Store billing (and shipping when collected) on the order at checkout — e.g. `billing_*` / `shipping_*` columns or JSON snapshot on `orders`. When customer is or becomes a known contact (email/contact_id), update CRM contact with new shipping (and billing if changed) from checkout so contact record stays current.
- [x] **Cart session:** Table or server-side session storing items (content_id as product ref, qty, price snapshot). API: add to cart, update, get cart. Optional: link cart to contact/user when logged in.
- [x] **Orders + order_items:** Orders table (customer_email, contact_id/user_id nullable, **status**, total, currency, stripe_checkout_session_id, created_at; **billing/shipping snapshot** per above; optional coupon_code/coupon_batch_id, discount_amount). Order items table (order_id, content_id for product, name snapshot, quantity, unit_price, line_total; optionally store product shippable flag per line for fulfillment logic). Create order (pending) from cart at checkout.
- [x] **Order status and fulfillment (lightweight):** Order **status** values: e.g. `pending` (unpaid), `paid` (payment confirmed), `processing` (paid + has shippable items; awaiting fulfillment), `completed` (done). **Digital/virtual only:** Once payment is confirmed and customer receives access (join link, download instructions, etc.), treat order as **completed** — no staff intervention. **Physical (or mixed):** When order contains any shippable product, set status to **processing** after payment (like WooCommerce) so staff know to fulfill; provide a simple way in admin to mark as **completed** (or **shipped**) when done. No full warehouse/shipping module — status-driven list of "orders to fulfill" and a button to mark complete.
- [x] **Payment-to-MAG flow (membership products):** When a customer pays for an order that includes a **membership product** (product linked to a MAG), grant them access to that membership. Optionally link product to MAG (e.g. `membership_id` or MAG UID on product or product type); on Stripe webhook `checkout.session.completed`, after marking order paid, for each order item that is a membership product: ensure customer has a member record (create/link from contact or email), assign the corresponding MAG to that member so they receive access. Send access instructions (email/link) as part of digital delivery. Purchasing memberships and providing access is a core feature of the payment system.
- [x] **Checkout flow:** Collect customer email and billing address (from CRM contact or guest). If cart contains any **shippable** product, also collect shipping address (or "same as billing"); otherwise billing only. Create order + order_items from cart; create Stripe Checkout Session with line_items (per-line tax_behavior from product.taxable); redirect to Stripe. Success/cancel return URLs.
- [x] **Stripe webhook + return:** On `checkout.session.completed`, mark order paid (set status to `paid`). If order has **no shippable** items, set status to `completed` and send access instructions (email/link); if order has **any shippable** item, set status to `processing`. Optional stock decrement when stock_quantity is set. Return URL: show thank-you / order confirmation; clear cart.
- [x] **Transactional email and template manager (breakout module):** Build an **Email Template Storage Manager** for all transactional email. Store templates (e.g. order confirmation, digital delivery, password reset) with placeholders; use existing SMTP mailer to send. Order confirmation email required for all orders; digital delivery email (or thank-you page with link) for digital/virtual orders. Template area in admin (e.g. Settings or Ecommerce) to edit these templates.
- [x] **Abandoned / failed payment visibility:** Provide a fallback so operators can see abandoned or failed transactions: e.g. prominent note in **customer activity stream**, status or tag on **CRM contact** (e.g. "Abandoned checkout" or "Payment incomplete"), so staff can review and follow up. Pending orders remain in order list with status `pending`; optionally highlight or filter "needs attention."
- [x] **Order history:** My orders page (list by user or email); order detail page. Admin: orders list and detail; filter by status; for orders in `processing`, allow staff to mark as `completed` (or `shipped`) when fulfilled.
- [x] **Public routes and customer account pages:** Define public shop routes (e.g. `/shop` catalog, `/shop/[slug]` product, `/shop/cart`, `/shop/checkout`, `/shop/success` or `/order/success`). **Order history:** For logged-in members, provide "My orders" under existing member area (e.g. `/members/orders` or `/account/orders`) — list orders for current user/contact; order detail with items, status, totals, and for digital items **access/download links**. For **guests**, provide order lookup (e.g. by email + order number or secure link from confirmation email) so they can view order status and digital access without an account. Optional: small account hub (under `/members` or `/account`) linking to Orders, Profile, and saved addresses (from CRM contact) for checkout prefill.
- [x] **Digital delivery (customer-facing):** On order detail page and in order confirmation/digital-delivery email, show **access links** for digital/virtual items (e.g. join link, download URL, course access). Optional: dedicated "My downloads" or "Access your purchases" page. **Product delivery type is multi-select:** product can be Shippable, Downloadable, or both (e.g. CD/DVD, book + PDF). Add `downloadable` alongside `shippable`; both can be true.
- [x] **25a. Product delivery type multi-select:** Add `downloadable` boolean to product; product form: both checkboxes (Shippable, Downloadable). Cart/order: `has_shippable` + `has_downloadable`; order detail shows ship vs download per line.
- [x] **25b. Schema: real download URL(s) per product:** Store real URL(s) for downloadable products (JSONB or `product_download_links` table); multiple links per product (e.g. Part 1, Part 2, PDF, Audio). Migration + types.
- [x] **25c. Admin: Digital delivery links UI:** Product form when downloadable: "Digital delivery links" section — Label + URL rows, add/remove, save.
- [x] **25d. Time-limited download links:** Customer never sees real URL. App endpoint (e.g. `/api/shop/download?token=...`) validates order/ownership/expiry, then redirects to real URL. Token encodes order, item, link index, expiry (e.g. 24–72h).
- [x] **25e. Customer-facing: download links on order detail and email:** Per downloadable line, show one time-limited "Download" (or label) per link. Optional: "My downloads" page.
- [x] **Order metrics (admin dashboard and PWA):** Add order metrics to the admin dashboard (e.g. orders today, count in processing, recent orders or revenue). Add order metrics to the PWA helper app so staff can see key order counts and processing queue at a glance. API or RPC for order counts by status (and optional date range); consume in dashboard and PWA.
- [x] **Ecommerce nav and RLS:** Ecommerce sidebar nav and routes follow the existing **role and gate system** (e.g. admin; optionally a dedicated "order manager" role). RLS on all new tables (product, orders, order_items, cart, coupon_discounts); tenant isolation; no card data stored in app (Stripe only; no PCI on local app).
- [x] **Stock (optional, simple):** When product has `stock_quantity` set, optionally validate at add-to-cart or checkout and block if out of stock; decrement on successful payment. Leave stock tracking off by default for new products (null = no tracking).
- [x] **Public pages:** Shop/catalog (list products), product page (single product, add to cart), cart page, checkout page (pre-redirect), success/confirmation, order history (and guest order lookup). All customer-facing pages and routes covered by "Public routes and customer account pages" and "Digital delivery" above.

**Subscriptions (steps 30–35) — design in sessionlog:** Order history = all payments (create order for first subscription payment and each renewal). No mixed cart: block with message "One-time purchases cannot be mixed with subscriptions. Please make 2 separate transactions." Account required for all checkout (no guest). Admin: Ecommerce → Subscriptions (separate tab), mirror Stripe data. Emails: subscription started, renewal, canceled/payment failed. MVP: start and cancel only; trials/plan-change/term (e.g. 6–12 months) out of scope (Stripe supports later). Stripe Customer Portal for manage/cancel; admin UI mirrors Stripe.

- [x] **30. Product model for subscriptions:** is_recurring, billing_interval, stripe_price_id; same editor as one-time.
- [x] **31. Stripe recurring Price:** Sync creates recurring Price; save stripe_price_id.
- [x] **32. Checkout subscription mode:** Cart all one-time OR all subscription; require sign-in; subscription session uses stripe_price_id. Enforce account for one-time too.
- [x] **33. Subscription and invoice webhooks:** subscriptions table; create order for first payment and renewals; handle subscription + invoice events.
- [x] **34. Admin Subscriptions:** Separate tab; list customers and active subscriptions; mirror Stripe.
- [x] **35. Customer Subscriptions:** Order history = all payments; Subscriptions tab = manage/cancel via Stripe Portal; three emails.

**Activity stream messaging (steps 36–41) — see sessionlog:** Messages as note_type = 'message' in crm_notes; recipient_contact_id (null = support), parent_note_id for threading. Member dashboard activity stream with search, type filter, "Add new message"; client sends to support; admin sends/replies from contact Activity Stream.

- [x] **36–41. Message schema, filter, member stream, client send, admin reply, threading:** Migration 139 (recipient_contact_id, parent_note_id; RPC); ACTIVITY_TYPE message; getMemberActivity + GET /api/members/activity; POST /api/members/messages; ContactNotesSection "Send message" + Reply with parent_note_id.
- [ ] **42. (Future) Client-to-client messaging:** Not in MVP. When added: use existing recipient_contact_id; add UI for client to "message another member"; target list = contacts who share at least one MAG with the sender (same-membership filter). Same visibility rule (contact_id OR recipient_contact_id) already supports it.

**Stripe & platform sync (steps 43–48) — see sessionlog:** For tenant onboarding/migration: sync from existing Stripe, WooCommerce, or raw/CSV. Drift sync for products (reconcile Stripe vs app); Stripe → customers and order history; WooCommerce import; raw/CSV import with field mapping. **Order IDs:** Our system has its own order number (generator, human-friendly); Stripe uses random UIDs per object (cs_xxx, in_xxx)—no “order number”; store stripe_checkout_session_id + stripe_invoice_id and woocommerce_order_id (or external_order_id) as cross-reference only. Add order_number column + generator and external id columns (migration) before or as part of sync. **Visibility:** Admins see our order number + Stripe UIDs on order detail (for audits). WooCommerce/external order IDs only in superadmin-only table/view, not on tenant admin order UI.

- [x] **43. Stripe → products (drift sync):** Reconcile Stripe Products/Prices vs app; report drift; optional Import/Update from Stripe. Done: stripe-drift.ts, GET/POST drift API, Reconcile card on Products page.
- [x] **44. Stripe → products (bulk import / link):** Bulk import from Stripe; per-product "Link to existing Stripe product."
- [x] **45. Stripe → CRM customers:** Sync Stripe Customers to contacts; external_stripe_id; idempotent.
- [x] **46. Stripe → order history:** Sync Stripe Invoices to orders + order_items; idempotent by stripe_invoice_id.
- [x] **47. WooCommerce → customers / order history:** Import via WooCommerce API or CSV; map to contacts and orders.
- [x] **48. Raw/CSV import with field mapping:** Generic CSV/raw import; map columns to contact and/or order fields; preview and import. Done: orders import page + API + lib; CRM import has paste and link to orders import.
- **Accounting export:** Stripe’s QuickBooks plugin may suffice for some; others need app transaction data. **[x] 49.** Export orders as CSV (done: GET /api/ecommerce/export/orders?format=csv; lib export-orders.ts; Export button on Orders page). **[x] 50.** Stub: non-CSV formats 501; GET /api/ecommerce/export/formats. Full IIF/QBO when required.

**Coupons / code-based discounts (reuse existing code generator):**

- **Discount stored with the code (batch), not on product.** One code can apply a discount universally (e.g. 10% off cart or $20 off) without attaching discount rules to products. Products stay product-focused; the code is the trigger and the batch (or linked coupon row) holds the rule.
- **Use type on batch.** Add `use_type` (or `batch_type`) to `membership_code_batches`: e.g. `membership` | `discount` | `other`. Drives behavior when code is applied: membership redemption vs apply discount at checkout. Same code system supports both; filter/report by type.
- **Discount fields (for use_type = discount).** Either extend batch table with nullable discount columns or add `coupon_discounts` table (batch_id FK). Fields: `discount_type` ('percent' | 'fixed'), `discount_value`, optional `min_purchase`, `scope` ('cart' | 'product_ids' | 'category'). At checkout: validate code in CMS and apply discount to cart totals app-side.
- **App-side discounts only (no Stripe Coupons).** All discount logic stays in the app. Validate coupon code in CMS; apply discount (percent or fixed) to cart; compute final line or cart amounts. Send the **calculated (discounted when applicable) amounts** to Stripe at checkout via `price_data` (see Stripe integration below). No Stripe Coupon creation or sync — avoids extra manual work in Stripe and keeps one source of truth (CMS) for codes and pricing. Store applied coupon_code and discount_amount on order for display and audit.
- [x] **Code/batch schema for ecommerce:** Migration: add `use_type` to `membership_code_batches` (e.g. text: 'membership' | 'discount' | 'other', default 'membership'). Add discount columns to batch table OR create `coupon_discounts` (batch_id FK UNIQUE, discount_type, discount_value, min_purchase nullable, scope). No Stripe coupon fields. Update batch create/edit UI and code generator to support use_type and discount fields when use_type = discount. (Implemented as `purpose` + discount columns on batch; see archive migration 129.)
- [x] **Checkout coupon flow:** Checkout UI: optional "Apply code" field. API: validate code (membership → redemption; discount → look up batch/coupon_discounts). Apply discount to cart app-side (percent or fixed per scope); compute final amounts per line or cart. Store applied coupon_code and discount_amount on order. Build Stripe Checkout with these calculated amounts (price_data), not Stripe Coupons.
- [x] **Orders record discount:** Orders table: optional `coupon_code` or `coupon_batch_id` and `discount_amount` so order history shows which code was used and how much was discounted (ensure columns on orders).

**Stripe integration (design and steps) — CMS → Stripe → QuickBooks:**

- **1:1 CMS product → Stripe Product only (price not pushed to Stripe).** Each sellable product in the CMS has a **price in the CMS** and a corresponding **Stripe Product** (name, description, images) for invoice display and reporting. We do **not** create or store a Stripe Price for checkout — the amount is sent from the app at checkout time. Store `stripe_product_id` on the related `product` table; `stripe_price_id` optional or unused for checkout. Create Stripe Product via "Create Stripe Product from CMS" (Product only, no Price).
- **Create Stripe Product from CMS (automated).** "Create Stripe Product from CMS Product" button: reads content (title, body/excerpt, featured_image_id, gallery_id → images); creates **Stripe Product only** (name, description, images[]) via Stripe API; stores `stripe_product_id` on the product row. No Price created in Stripe; product price lives in CMS only.
- **Eligible for sale.** Shop/catalog and add-to-cart only show products that are **published**, have **stripe_product_id** set (Stripe Product synced), and **available_for_purchase** = true. Manual flag allows hiding from sale without removing Stripe sync.
- **Checkout: push calculated price from app (price_data).** One line item per cart row. For each line use **price_data** (not a pre-created Price): `product: stripe_product_id`, `unit_amount` (in cents — from our order/cart, **after app-side discount**), `currency`, `tax_behavior` from product.taxable. So we send the final amount we want to charge; discounts are already applied in our totals. Stripe invoice shows the product name/description and the amount we sent. No Stripe Coupons; no manual Stripe coupon setup.
- **Taxable vs non-taxable.** Per product, store taxable flag; at checkout pass `tax_behavior` in price_data per line so Stripe Tax can calculate when applicable.
- **Stripe → QuickBooks (many-to-few).** Many Stripe Products can map to fewer QuickBooks items. Sync logic (or integration) should map by category or mapping table (e.g. all “event video” Stripe Products → one QB item “Event video sales”) so QB stays clean. Document this so CMS → Stripe → QB mapping is correct.
- [x] **Stripe config:** Store Stripe secret key and publishable key (env or tenant settings); webhook secret for verifying `checkout.session.completed`. Document Stripe dashboard setup and webhook endpoint.
- [x] **Create Stripe Product from CMS routine:** API or server action: given content_id (product), load content + product + featured_image + gallery; resolve image URLs; call Stripe **Products.create** only (name, description, images[]); save `stripe_product_id` to product row. No Prices.create. Expose as "Create Stripe Product from CMS Product" (or "Sync to Stripe") button in product edit UI.
- [x] **Eligibility check:** Shop/catalog and add-to-cart only include products where content is published, product.stripe_product_id is set, and product.available_for_purchase is true. Product detail shows "Not yet available for purchase" or hides add-to-cart when not eligible.
- [x] **Checkout Session:** Build `line_items` from cart with **price_data** per line: `product: stripe_product_id`, `unit_amount` (calculated from order/cart in cents, after app-side discount), `currency`, `tax_behavior`. Create Stripe Checkout Session; redirect to session.url. No pre-created Price IDs; no Stripe Coupons.
- [x] **Webhook:** Handle `checkout.session.completed`; match session to order (e.g. metadata order_id); mark order paid; optional stock decrement. Idempotent handling.
- [x] **Return URL:** Success URL shows order confirmation and clears cart. Optionally fetch session/order for display.

### Phase 10: API Development

**Status:** Deferred (after Phase 11).

- [ ] Enhance public API (error handling, SEO metadata, pagination, search/filter); ensure protected endpoints check MAG
- [x] Form submission email notifications (Nodemailer/SMTP, env vars, mailer utility, notifyOnFormSubmitted)
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

- **Packing (implemented):** Pack by article so whole items stay in one URL; oversize non-FAQ sub-split with "Blog post"/"Continued from" headers. **FAQ content:** never split between URLs; each FAQ document is one atomic unit.

### Phase 16: RAG Chatbot

**Status:** Future (vector DB, content indexing, RAG retrieval, LLM, chat widget, membership-aware).

### Phase 17: LMS (Courseware)

**Status:** Future (courses, lessons, progress, course_mags, user_licenses).

### Phase 18: Feature Gating & Custom Links

- [x] Schema: sidebar feature gating + custom links per tenant
- [x] Superadmin UI: toggle features per tenant; add/edit/delete custom sidebar links
- [x] Sidebar: load config, render disabled as ghosted or upsell URL; block disabled routes
- [x] API: GET/PUT tenant sidebar config; GET current tenant sidebar config

### Phase 18b: Team Members, Roles & Profile

- [x] Roles: Creator (content-only), editor, viewer, client_admin; per-role feature set
- [x] Optional: custom roles
- [x] Team member profile (name, email, role, avatar, bio, photo, social links, digicard_slug); admin UI; source for Digicards

### Phase 18C: Directory (unified picker) & Messages / notifications

**Living wiring checklist** (thread messages vs notifications timeline, check off as built): [reference/messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md).

**Status:** Planned — **prerequisite** before deepening Tasks/Projects UX (task detail polish, cross-module assignees, **task comments / threads** that would otherwise keep overloading `crm_notes`). Spec alignment: [prd.md — Shared identity UX (forks)](./prd.md#shared-identity-ux-forks) (auth unchanged). **No CRM history backfill required in dev** unless desired later.

**Next build focus:** Implement **tenant migrations** for **contact timeline** + **thread** tables (and RLS) **before** wiring task-detail comments UI — comments should target **thread storage** per [prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging). Directory picker wiring (Projects/Tasks) can proceed in parallel where not blocked.

**Directory (read model for pickers)** — SSOT remains `crm_contacts`, `members`, `auth.users` / team; Directory is **not** a second writable identity store.

- [x] **Design lock:** Document in [prd-technical.md](./prd-technical.md) — **§ Phase 18C** (Directory row shape, sources, dedup, security).
- [x] **Implementation:** Migration **`188_directory_search_rpc.sql`** — `public.get_directory_search_dynamic(schema_name, tenant_site_id, search_query, result_limit)`; `src/lib/supabase/directory.ts` (`searchDirectoryEntries`); **`GET /api/directory`** (admin-only). Run **188** in Supabase SQL Editor per tenant DB.
- [x] **Wire pickers — Events:** `EventParticipantsResourcesTab` uses `/api/directory` for participant options (replaces separate CRM contacts + Settings team fetches).
- [x] **Wire pickers — Tasks (assignees):** `TaskFollowersSection` — **Add Assignee** modal + **`DirectoryParticipantPicker`** + `GET /api/directory` (team_member / crm_contact → task_followers `user_id` / `contact_id`).
- [ ] **Wire pickers — Projects (members):** Optional: align project “add member” flows with Directory API where it reduces duplicate fetches (assignee path above is done).
- [ ] **Performance:** Indexes on underlying tables; avoid N+1; document cost in planlog Performance note if hot path.
- [ ] **Fork note:** Custom pickers must not drop enumeration-safe patterns from PRD (Directory is admin/authenticated use).

**Messages & notifications (two logical stores, one UI tab)** — GPUM and admin both use a single **“Messages and notifications”** surface; merged API normalizes rows. **MVP target:** former contact notes → **`contact_notifications_timeline`**; conversation-shaped traffic → **threads**; **`crm_notes`** deprecated for migrated types after cutover/backfill (open checklist: [sessionlog.md](./sessionlog.md) — **§3**).

- [x] **Design lock (prd-technical):** [§ Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging) — table roles, column lists, enums (`kind`, `visibility`, `thread_type`), UI filter mapping, MAG rules, pruning/idempotency, RLS requirements, cutover vs `crm_notes`, edge-case defaults.
- [x] **Schema — contact notifications timeline:** Tenant table **`contact_notifications_timeline`** — migration **`190_contact_notifications_timeline.sql`** (`recipient_user_id`, indexes, partial unique `source_event`). **Run in Supabase SQL Editor** per tenant DB after 189. (Name avoids confusion with calendar `events`.)
- [x] **Schema — threads:** **`conversation_threads`**, **`thread_messages`**, **`thread_participants`** — migration **`191_conversation_threads_and_messages.sql`**. **Run in SQL Editor** after 190.
- [x] **RLS (v1 in migrations):** Tables enabled with **authenticated** full-access policies + grants (matches legacy tenant CRM pattern). **GPUM must not see `admin_only` timeline rows** — enforce in **API / routes** (see §18C.7); tighten policies in a follow-up migration if desired.
- [x] **Write path — prove (v1):** Authenticated **POST** `/api/crm/contacts/[id]/notifications-timeline` inserts timeline rows (`staff_note`, etc.); **POST** `/api/conversation-threads` (+ optional `first_message`) and **POST** `.../[threadId]/messages` for threads. Lib: `contact-notifications-timeline.ts`, `conversation-threads.ts`.
- [ ] **Read APIs:** **GET** notifications-timeline + thread messages **done** for admin; still need merged **stream** for GPUM + **Messages and notifications** tab (`UNION`/sort), cursors, and **visibility** filtering for GPUM routes.
- [ ] **UI — contact detail:** **v1 shipped:** `ContactNotificationsTimelineSection` on Notes tab (list + add `staff_note`). **Remaining:** merge/filters with Activity Stream, `kind` categories, deep links.
- [ ] **UI — Messages and notifications:** Single tab GPUM + admin; filters (transactions vs messages, etc.); thread drill-in for task/support/DM/MAG.
- [ ] **Cutover (dev):** New writes to new tables; stop growing `crm_notes` for types you migrate (messages, duplicate system events); **reconcile** Phase 19 bullets that add `task_id` / `conversation_uid` on `crm_notes` — prefer new thread table or dual-write during transition (document choice in prd-technical).
- [ ] **Edge cases checklist (document decisions):** Leave MAG → lose group thread access? Guest blog comment authors; read receipts (`last_read_at` on participants); admin system-wide feed for superadmin.

### Phase 19: Project Management Module

**Status:** Planned. Scope in [prd.md](./prd.md) — Project Management Module. Enhancement before/at domain launch; tenant-scoped, feature-gatable.

**Prerequisite:** **Phase 18C** on this page — especially **messages/notifications schema** (timeline + **threads**) — before heavy **task detail comments / threading** UI; Directory pickers + other task UI polish can proceed in parallel where unblocked. Prefer **thread table** over new `crm_notes` volume for task discussion (see Phase 18C cutover + [prd-technical](./prd-technical.md#phase-18c-directory-and-messaging)).

- **Taxonomy (locked):** Use the **existing taxonomy system** for projects. Add **Projects** as a taxonomy section (like Post, Page, CRM, Media). Projects link to this section for **categories** (project type; one level is enough for now) and **tags**. No separate "project types" or simple-category system. Search and filter for projects follow the same category/tag patterns as Content and CRM.
- **Task taxonomy (locked):** Tasks have their own taxonomy section **Tasks**. *Superseded for admin dimensions (2026-03):* **status, type, and phase** are **Customizer slugs** on the task row (`task_*_slug`); migration **187** clears `taxonomy_relationships` for `content_type = 'task'`. **Priority** remains taxonomy (`task_priority`). Historical note: phases/milestones were previously categories on the Tasks section.

- [x] **CRM: Organizations table and contact–organization many-to-many (before Project Management):** Add first-class organizations (companies) and true many-to-many with contacts. **Schema:** (1) `organizations` table: id, name, email, phone, timestamps; (2) junction `contact_organizations`: contact_id, organization_id, optional role/title, optional is_primary, timestamps, UNIQUE(contact_id, organization_id). **Custom fields for organizations:** Reuse the existing **crm_custom_fields** definition table by adding an `entity_type` column ('contact' | 'organization'). Existing rows default to 'contact'. Add **crm_organization_custom_field_values** (organization_id, custom_field_id, value) for org values. Contact custom fields and forms continue to use only entity_type='contact'; Settings can show "Contact custom fields" and "Organization custom fields" (filter by entity_type). One definition table, two value tables (contacts = existing; organizations = new). **Deliverables:** Migration(s), RPC/API for orgs and junction, org list/detail/edit UI, contact detail "Organizations" section (assign/unassign, role), optional migration path for existing contact.company text (e.g. suggest/create org or keep as display-only). Do this upgrade before starting Project Management work.

- [x] **Membership (MAG) parent/child hierarchy:** Update the membership system to support parent/child MAG organization with **infinite levels** (any depth). Schema: add `parent_id` to `mags`; assign-to-child auto-assigns to all ancestors (parent and above). Parent = grouping + catalog visibility (e.g. organization); child = specific access (e.g. content item). Assigning to parent does **not** grant child MAGs; assigning to child **does** auto-assign parent. Supports e-commerce (org membership = parent MAG; content product = child MAG; purchase child → grant child + parent) and project visibility (MAG as restriction). Sub-steps: migration (parent_id, cycle prevention), ancestor lookup (RPC or app), add-contact-to-MAG flow (insert ancestors), optional UI (MAG tree), remove-from-child behavior.

- [ ] **Project Management (projects + tasks)** — step-by-step. Feature slug: **projects** (roles/gate step at end).
  - [x] **Schema — projects:** Table `projects`: id, name, description, status (new | active | closed | perpetual), proposed_start_date, proposed_end_date (nullable), end_date_extended (boolean), potential_sales (numeric), required_mag_id (FK → mags), created_at, updated_at, created_by. RLS, indexes.
  - [x] **Schema — project taxonomy:** Add **Projects** as a Core section in `section_taxonomy_config` (**is_staple = true**, not deletable). Link projects via `taxonomy_relationships` (content_type = 'project', content_id = projects.id). Project list/filters by category and tag.
  - [x] **Schema — tasks:** Table `tasks`: id, project_id, title, description, status, task_type (default | support_ticket), **priority** (low | medium | high), proposed_time, actual_time, due_date, creator_id, responsible_id, timestamps. Optional: `task_time_entries` for punch-style time. RLS, indexes.
  - [x] **Schema — task taxonomy:** Add **Tasks** as a Core section in `section_taxonomy_config` (**is_staple = true**, not deletable). Task ↔ term via `taxonomy_relationships` (content_type = 'task', content_id = tasks.id) for categories (phases/milestones) and tags. Filter and group by phase within a project; "Show all" when no filter.
  - [x] **Schema — task assignments:** Junction (e.g. task_followers): task_id, user/contact id, role (creator | responsible | follower). Team members can assign a GPUM as follower on a project/task; GPUM cannot self-assign as follower. For "my tasks" and visibility.
  - [x] **Schema — project linking:** Add **project_id** (FK → projects, nullable) to **orders** and **events**. (Verified: both tables have `id` UUID; neither has project_id today — add in migration.) Optional: project_links (project_id, link_type, target_id or url, label) for docs/images/forms.
  - [x] **Schema — archive:** projects.archived_at (nullable); archive/restore via UI only (no status).
  - [x] **RPC/API — projects:** List (filter status, MAG, taxonomy, assignment), get by id, create, update, delete. Tenant + MAG visibility.
  - [x] **RPC/API — tasks:** List by project / assignment / "my tasks", filter by taxonomy (category/tag for Task section — phase/milestone). Get by id, create, update, delete. Auto-extend project end when task due_date > project proposed_end_date (set end_date_extended; optionally update proposed_end_date).
  - [x] **RPC/API — list visibility:** "My tasks" = creator/responsible/follower. Optional: team restricted to assigned-only vs all. Top-level admins see all.
  - [x] **Admin UI — sidebar & gate:** Projects in sidebar; feature slug **projects**; feature-gate per tenant. Routes /admin/projects, /admin/projects/[id]. Roles and feature-registry step at end of phase.
  - [x] **Admin UI — projects list:** Filters (status, taxonomy, search). Columns: name, status, dates, MAG, potential_sales. Show archived toggle.
  - [x] **Admin UI — projects list (refresh):** Table: title + project-type color dot, Proposed End Date, client (contact/org link + avatar), status pill, member avatars (contact/team), task-segment progress bar (done/overdue/todo/cancelled), project type. Batch server data (members, tasks, contacts, orgs, profiles); include_archived filter. Migration 172 adds avatar_url to crm_contacts and organizations (tenant schema).
  - [x] **Admin UI — project detail:** Header (name, description, status, timeline, potential_sales, MAG), tasks list or Kanban, linked events/orders/links. Edit, Archive/Restore.
  - [x] **Admin UI — project detail (layout refresh, Mar 2026):** Donor-style overview + stat cards; tabs Tasks · Events · Transactions · Attachments (Attachments shell); Activities breadcrumb; **`ProjectDetailClient.tsx`** — see changelog **2026-03-23 22:50 CT**.
  - [ ] **Admin UI — project detail Attachments:** Replace placeholder tab with uploads or document links (schema/API TBD).
  - [x] **Admin UI — project create/edit:** Form: name, description, status, proposed start/end, potential_sales, required_mag_id, taxonomy (categories/tags).
  - [x] **Admin UI — tasks:** Add/edit task (title, description, status/type/phase via **Customizer slugs**, **priority** via taxonomy, due_date, proposed/actual time, creator, responsible, followers). Project task list + All Tasks use slug-backed filters/badges. Optional Kanban deferred.
  - [x] **Admin UI — All Tasks (§1.1–1.3, Mar 2026):** Single-row toolbar + unified **Custom filters** modal (Projects, Assignees, Phase, Type, Status); funnel badge for active modal dimensions (not title search); presets **All Active** (default, SSR `exclude_status_slugs`) / **My tasks** / **Overdue** (`due_before`) + master reset (↺); sortable column headers + **Project** group headers (`all-tasks-sort.ts`, client-side sort). **`get_tasks_dynamic`:** migrations **197** (tasks in archived projects excluded), **198** (`exclude_status_slugs`, `due_before`). See changelog **2026-03-23 22:50 CT**.
  - [ ] **QA — All Tasks (manual):** Default paint; preset + modal narrow results; **Overdue** + title search; column sort shows completed when preset cleared; **All Active** hides completed again; master reset → full recap + cleared search/filters.
  - [x] **Migration 187 — task Customizer slugs:** `187_tasks_customizer_slugs.sql`; RPC `get_tasks_dynamic` / `get_task_by_id_dynamic` slug columns + text[] filters. Run in SQL Editor per tenant.
  - [ ] **Admin UI — time tracking:** Task proposed_time, actual_time; optional punch-style entries UI.
  - [x] **Admin UI — archive/restore:** Buttons; list hides archived by default.
  - [ ] **Integration — activity stream:** Log task created/completed, project status changes. Filter by project access (MAG).
  - [ ] **Integration — support tickets:** GPUM submits a **ticket** (task of type support_ticket) via member area; auto-create or reuse a **perpetual Support project** for that GPUM (customer) when they start a support process (first ticket). Project: status = **perpetual** (lives with the life of the client), category = **Support Ticket**. Create task with task_type = support_ticket linked to that project.
  - [ ] **Integration — e-commerce:** Order optional project_id; project detail shows linked orders; optional actual vs potential_sales.
  - [x] **Integration — calendar:** Event project_id; project detail shows linked events (Events tab, list + Unlink); event form Project selector; API create/update accept project_id. (Event visibility by project MAG deferred to member-facing project view.)
- [x] **Project Events tab — calendar view (UI):** Project detail Events tab = calendar mirror (month / week / list views); create event from here auto-assigns project_id; wiring in place.
  - [ ] **Member area (GPUM):** Two additional items: **(1) Projects** — list/detail of projects the GPUM can see (MAG); read-only progress. **(2) Support Tickets** — list view of tickets (tasks with task_type = support_ticket) submitted by that GPUM. **(3) Tasks** — standard task list when the GPUM was assigned tasks to accomplish or follow under a project (creator/responsible/follower). Feature registry, sidebar gating, and roles for projects at end of phase.

- **Phase 19 expansion (decisions 3/16/2026):** Orders + invoices remain two tables; project_id on both; project total = sum(orders.total). Activity stream: task_id and conversation_uid on crm_notes for task threads and message threading; focus-mode UI later. User handle for messaging/conversations.
  - [ ] **Schema — task start_date:** Add start_date (DATE, nullable) to tasks. Migration; RPC/types; task forms and list/detail.
  - [ ] **Schema — task_id on crm_notes:** Add task_id (UUID, nullable, FK → tasks) to crm_notes. Index; migration; update RPC. Note tied to task (support ticket thread).
  - [ ] **Schema — conversation_uid on crm_notes:** Add conversation_uid (TEXT or UUID, nullable). For note_type = 'message', same UID links thread; lookup by conversation_uid. Migration; index; RPC/API return.
  - [ ] **Schema — task_time_logs:** Table task_time_logs (id, task_id FK, user_id nullable, contact_id nullable, log_date DATE, minutes INTEGER, note TEXT, created_at). Migration; RLS; indexes.
  - [ ] **Schema — project_id on invoices:** Add project_id (nullable FK → projects) to invoices. Migration; index. When order created from paid invoice, copy project_id to order.
  - [ ] **User handle — schema & profile:** Add handle (TEXT, unique per tenant/app) to profile (tenant_users or profiles). Migration; auto-generate (e.g. last name + suffix); editable in profile/settings.
  - [ ] **User handle — display:** Show handle (fallback to email or "User") in task threads, member activity stream, blog comments where author is user.
  - [x] **Conversation (thread) — create/get:** Unified model: conversation = comment/support ticket/message thread; conversation_uid identifies thread (task threads: `task:${taskId}`). createNote sets task_id + conversation_uid; RPC/API get notes by conversation_uid; task detail UI: thread, "Add reply", display handle. Messages/focus filter later.
  - [x] **Task followers — UI:** Task detail Assignments section: list followers (contact/user + role), add follower (role + contact search), remove. API GET/POST/DELETE /api/tasks/[id]/followers. Enables task thread "Add reply" (contact_id from followers).
  - [x] **Conversation — activity inclusion:** getMemberActivity includes notes for tasks I'm on (and messages by conversation_uid when applicable); filter by type.
  - [x] **Project detail — Transactions tab:** Tab on project detail: merged list of orders + invoices where project_id = this project. Project total = sum(orders.total). Link/unlink project_id from project tab or order/invoice detail. When creating order from paid invoice, copy invoice.project_id to order.
  - [x] **Sidebar — Activities:** Replace top-level Calendar and top-level Projects (currently Projects + Tasks) with one "Activities" section; under it: Events, Tasks, Projects, Resources. Update sidebar-config and Sidebar; feature gating and roles for Activities.
  - [x] **Time tracking — API & UI:** Time log API (create/list/update/delete per task). Task detail: time log entries (date, minutes, note); total on task; project detail rolled-up total. Time logs do not create activity stream items.
  - [x] **Priority & taxonomy colors:** Task priority color mapping (e.g. high=red); task list/detail color chip. Optional color on taxonomy terms (Projects section); projects list color chip per type. Document extend to other sections later.
  - [x] **Taxonomy — color option (do first):** Add optional color field to taxonomy_terms (migration). Categories (parent and child) and tags: each term has an optional color chip (stored value). UI: Admin → Settings → Taxonomy; add color to the shared Edit Category / Edit Tag modal (Categories tab and Tags tab). When creating a new sub-item (child category or tag), auto-inherit the color from the parent.
  - [x] **Task priority as taxonomy:** Implement task priority as taxonomy-driven (dedicated section; terms tag-like). Remove hardcoded low/medium/high from tasks (migration; backfill; drop enum/CHECK). Manage priority terms in Settings → Taxonomy; task create/edit and lists use priority term (label + color from taxonomy).
  - [x] **Projects/tasks — taxonomy UI (with color):** Add taxonomy assignment to project and task create/edit/detail; display categories/tags with taxonomy color where shown.
  - [ ] **Custom view presets (optional):** Table user_view_presets (user_id, view_type, name, payload JSON). API CRUD. Projects/tasks list: View dropdown, Save current view, Manage presets.
  - [x] **Activity stream — task state changes:** When task status (or key fields) changes, create activity stream entry so stream shows e.g. "Task X marked done" (no time logs in stream).
  - [x] **Support project (per GPUM):** Create when GPUM starts support (first ticket), not on member creation; status = perpetual; category = Support Ticket (taxonomy); one project per GPUM; all support_ticket tasks link to it.
  - [x] **Integration — support tickets:** GPUM submits ticket (task type support_ticket) via member area; auto-create or reuse perpetual Support project (status = perpetual, category = Support Ticket) when GPUM starts support; create task linked to that project.
  - [x] **Integration — calendar:** Event project_id; project detail shows linked events (Events tab, list + Unlink); event form Project selector; API create/update accept project_id. (Event visibility by project MAG deferred to member-facing project view.)
  - [x] **Project Events tab — calendar view (UI):** Project detail Events tab = calendar mirror (month / week / list); create event auto-assigns project; wiring in place.
  - [x] **Feature registry, sidebar gating & roles (Phase 19):** Add projects to feature registry; ensure sidebar gating; adjust roles. Ecommerce/Social/Marketing order in registry (migration 171); route-features and sidebar match.

- **Phase 19 — Project members, client, assignee scoping (plan):** See [project-members-and-client-plan.md](./project-members-and-client-plan.md). **Core PM taxonomy sections (non-deletable):** Project Type, Project Status, Task Type, Task Status, Task Priority, **Project Roles** (new). Reserved terms (e.g. Support, Perpetual) protected from deletion (optional this phase).
  - [x] **Schema — project client (org):** Add `client_organization_id` (nullable FK → organizations) to projects; RPC/types/API.
  - [x] **Schema — project_roles section:** Add Project Roles as core taxonomy section (is_staple); optionally seed default terms; lib getProjectRoleTerms().
  - [x] **Schema — project_members:** Table project_members (project_id, user_id | contact_id, role_term_id nullable FK → taxonomy_terms); RLS; list/add/remove API.
  - [x] **Project UI — client:** Client = Contact or Organization; when org, “Add org members” (all or tick) → project_members.
  - [x] **Project UI — members:** Project detail: members as circle badges (initials + role); “Add member” (team + contacts) with role picker from Project Roles taxonomy.
  - [x] **Task assignee scoping:** When task has project with members, restrict assignee picker (creator/responsible/follower) to project members; API + TaskFollowersSection.
  - [x] **Task assignee — team + contacts:** Allow adding team (user) and contacts from project members in Assignments section.
  - [ ] **Support project:** Title "Support Requests for – (client-name)"; project_type_term_id = Support; add GPUM contact to project_members when creating perpetual support project.
  - [ ] **Reserved taxonomy terms (optional):** Prevent deletion of reserved term slugs (e.g. project_type.support, project_status.perpetual) in Settings → Taxonomy; document list.

### Phase 20: Calendar — reminders & personal ICS feeds

**Status:** Planned. Steps are listed in **Phase 20** below (schema, API, ICS, personal feed, tokens, notifications, cron). **Note:** Creator auto-added as event participant on `POST /api/events` is already done (see changelog 2026-03-19); supports My View and personal-feed queries.

- [ ] **Schema:** `events.reminder_minutes_before`; `event_reminder_deliveries`; `calendar_feed_tokens` (hashed token, optional JSON filters); RLS; indexes for cron and lookups. Migration with `-- File:` header; run in Supabase SQL Editor.
- [ ] **API & form:** Reminder field on event create/update; types in `events.ts`; `EventFormClient` UI.
- [ ] **ICS:** Shared `ics` builder module + VALARM from `reminder_minutes_before`; refactor public `GET /api/events/ics` to use it.
- [ ] **Personal feed:** `GET /api/events/ics/personal` (token query); events where token’s user is participant; optional event_type filter from token metadata.
- [ ] **Token UI + API:** Generate/rotate personal feed token; copy webcal/https URL; optional event-type matrix in Settings.
- [ ] **Notifications:** `event_reminder` action; prefs (email/push); send helper + dedupe via `event_reminder_deliveries`.
- [ ] **Push:** Subscriptions by user ids helper if missing; targeted send for reminders.
- [ ] **Cron:** `/api/cron/event-reminders` + `CRON_SECRET`; `vercel.json` crons; env docs.

### Phase 21: Asset / Resource Management

**Status:** Planned. Single `resources` table as **asset registry** + **183** schedulability flags (`is_schedulable_calendar`, `is_schedulable_tasks`); Customizer **`resource_type`** (slug, label, color). **Bundles** (UI term) = virtual **`resource_bundles`** + **`resource_bundle_items`**; apply expands to **`event_resources`** / **`task_resources`**. **Time attribution** = event intervals + task time logs (see [resource-time-attribution.md](./reference/resource-time-attribution.md)). **MVP slice** = checked bullets below (picker, bundles, conflicts, Resource manager, task bento, usage API).

- [x] **Schema:** Migration `183_resources_asset_and_scheduling.sql` on tenant `resources` — schedulability flags, `asset_status` + `archived_at`, inventory + financial fields (USD-only, non-negative costs). RLS unchanged.
- [x] **Schema — bundles:** `resource_bundles`, `resource_bundle_items`; **`bundle_instance_id`** on **`event_resources`** + **`task_resources`** for rolled-up UI (migration **`195_task_resources_resource_bundles.sql`**). **Applied on tenant** (SQL Editor — no errors).
- [x] **Schema — task_resources:** Junction `task_id` + `resource_id` + optional `bundle_instance_id`; RLS + grants; RPC **`get_task_resources_dynamic`** (migration **195**). **Applied on tenant.**
- [x] **Read path — 195:** Public RPCs (`get_event_resources_dynamic` / `get_events_resources_bulk` incl. **`bundle_instance_id`**, `get_task_resources_dynamic`, `get_resource_bundles_dynamic`, `get_resource_bundle_items_dynamic`) + **`src/lib/supabase/participants-resources.ts`** helpers (assign/unassign, bundle instance remove).
- [ ] **Schema — usage (optional MVP slice):** `resource_usage_*` segments (resource_id, source event/task, minutes, …) + rebuild hooks.
- [x] **API — task_resources (REST):** **`GET/POST/DELETE /api/tasks/[id]/resources`** — enriched list (`name`, `resource_type`, `bundle_instance_id`); POST optional `bundle_instance_id`; DELETE by `resource_id` or `bundle_instance_id` (admin + task exists). Client: **`src/lib/tasks/task-resources-api.ts`**, UI: **`TaskResourcesSection`**.
- [x] **API — bundles (REST):** `GET/POST /api/events/bundles`; `GET/PUT/DELETE /api/events/bundles/[id]`; `POST/DELETE /api/events/bundles/[id]/items` (member resources).
- [x] **API — picker lists (183):** **`GET /api/events/resources`** + **`GET /api/events/bundles`** — optional **`?context=calendar|task`** (archive/retired + schedulability); omit context = full registry for Resource manager. **`participants-resources.ts`**: `getResourcesAdminForPicker`, `listResourceBundlesWithItemsForPicker`.
- [x] **API — resource conflicts (events):** **`getResourceConflicts`** + **`POST /api/events/check-conflicts`** (`resource_ids` / `resource_conflicts`); **`PUT`/`POST` `/api/events/[id]/resources`** **409** when **exclusive** resource overlaps another event. **Docs:** [event-resource-conflicts.md](./reference/event-resource-conflicts.md).
- [x] **API — get_resources_dynamic / registry reads:** Migration **196** — `get_resources_dynamic(schema_name, picker_context)` (`NULL` = full registry; `calendar` \| `task` = same filter rules as REST + **`resourcePassesPickerContext`**). App **`getResources()`** delegates to **`getResourcesAdmin()`** (no stale RPC-only catalog). **Applied on tenant** (`196_get_resources_dynamic_picker_alignment.sql`); run on any fork/schema not yet migrated.
- [x] **UI — picker (events + tasks):** Grouped **Bundles** then **Resources** (`AutoSuggestMulti` groups); **`bundle:`** / **`resource:`** composite ids; Customizer **type labels** via **`resource-picker-groups.ts`** + **`/api/settings/calendar/resource-types`**. **MVP-if-time — proactive hints** (ghost/overlap + busy exclusive): [Event resource picker — MVP if time permits](#event-resource-picker--mvp-if-time-permits) (check boxes there).
- [x] **UI — bundle rollup (§2.2):** **`ResourceAssignmentsRollupList`** on event form + task bento/modal; **`source_bundle_id`** on draft rows for bundle title (not persisted; API strips).
- [x] **UI — admin Resource management:** `/admin/events/resources` — **`ResourceManagerClient`**: **Resources** tab (registry + **183** scheduling flags, asset status, archive) + **Bundles** tab (CRUD + members); `GET /api/events/resources` uses **`getResourcesAdmin`** (full row).
- [x] **UI — task bento (structure):** **`TaskResourcesSection`** — grouped picker, bundle rollup, **`PUT`** on save (task detail/edit).
- [x] **UI — usage (MVP preview):** Resource manager **Analytics** tab; **`GET /api/events/resources/usage`** (dynamic estimates, filters). **Docs:** [resource-time-attribution.md](./reference/resource-time-attribution.md). **Follow-on:** charts, presets, persisted **`resource_usage_*`** if needed.
- [ ] **Tasks follow-on (full):** Union usage API + project rollup (extends MVP above).
- [ ] **Docs:** Keep `mvt.md` Events/Resources notes in sync; `prd-technical.md` when schema/API stabilizes.

### Phase 22: Accounting module

**Status:** Planned. Tenant-scoped **standalone accounting** (income & expenses) suitable for small business use and **handoff to an accountant** (exports with clear categories and periods)—not a full tax engine; goal is to reduce or replace tools like QuickBooks for operators who already live in this admin app.

- [ ] **PRD / technical spec:** Scope, data model sketch, privacy (who sees what), export formats (e.g. CSV/Excel for accountant), alignment with ecommerce/orders if double-counting must be avoided.
- [ ] **Schema (tenant):** Core entities—e.g. chart of accounts or category taxonomy, transactions (income/expense), optional splits, import batches (file metadata, status), categorization rules or user overrides. Migrations with `-- File:` header; RLS; indexes for dashboard queries.
- [ ] **Admin dashboard — accounting:** Summary view of **income vs expenses** over selectable periods (month/quarter/custom); optional comparison to prior period; links into detail views.
- [ ] **Expense tracker:** List/filter transactions; manual add/edit; mark reviewed; attach to categories; search by payee, amount, date, category.
- [ ] **CSV statement import:** Upload bank/CC exports; **column mapping** (date, amount, description, balance optional); preview before commit; idempotent or duplicate detection strategy; store raw row + parsed fields for audit.
- [ ] **Categorization:** Post-import (and ongoing) flow to assign **proper expense/income categories**—manual picker, optional **rules** (e.g. description contains X → category Y), bulk recategorize; ensure categories are stable enough for **accountant-ready** exports.
- [ ] **Export for accountant:** Date-range export (transactions + category + memo); optional P&L-style summary sheet; document recommended workflow for CPA (what to send, how often).
- [ ] **Feature registry & access:** Sidebar/nav entry; Phase 19-style gating if required; superadmin vs tenant admin roles as spec’d.

### Site Visitor Analytics

**Status:** Planned. Simple site visitor tracker; anonymous aggregate stats; optional GPUM page-view tracking with activity stream. Scope: schema, tracking, API, admin dashboard graph, GPUM page views in activity stream.

- [ ] **Schema:** Table(s) for visitor events or daily aggregates (e.g. page views, visits by path/date). Tenant-scoped. Optional: member page views (contact_id, path, visited_at) for GPUM tracking. Migration; RLS.
- [ ] **Tracking:** Record visits for public pages (API or middleware); minimal data (path, date, optional referrer/session). No PII for anonymous. When request is from logged-in GPUM, optionally record with contact_id for activity stream.
- [ ] **API:** Endpoints to fetch aggregated stats (e.g. by date range, by path) for admin.
- [ ] **Admin dashboard:** Widget or section with visitor statistics and graph (e.g. line/bar chart over time). Admin dashboard only.
- [ ] **GPUM page views in activity stream:** When GPUM views public pages, record per-member page views; include in getMemberActivity so member (and admin viewing contact) sees "Viewed: …" in activity stream. Scope to content pages only if desired.

### Code Review, Security & Modular Alignment

- [ ] Security review (auth, RLS, input validation, per-feature pass)
- [ ] Optimization (bundle, queries, caching); modular alignment to feature boundaries
- [ ] Optional: per-module version marking

### Performance & Caching (Load Times)

Planned steps to reduce sluggishness and improve public-site load times. See PRD — Performance (Speed). Implement in roughly this order.

- [ ] **Cache site mode in middleware.** Right now every request runs `getSiteModeForEdge()` and hits Supabase for `tenant_sites.site_mode`. Add a short-lived cache (e.g. 30–60s per schema) in Edge so most requests skip the DB. *Helps: removes one DB round-trip from every single request before the page even runs.*
- [ ] **Cache integrations in public layout.** Public layout calls `getIntegrations()` (RPC) on every public page load. Cache the result (e.g. `unstable_cache` or short TTL) or move to build-time/env if rarely changed. *Helps: avoids repeated RPC on every navigation; layout stays fast.*
- [ ] **ISR / revalidate on public pages.** Homepage and public content pages use `force-dynamic` and refetch on every request. Where acceptable, remove `force-dynamic` and add `revalidate = 60` (or 300) so Next.js serves cached HTML and revalidates in the background. *Helps: most hits get cached HTML; only first request or after revalidate interval hits server/DB.*
- [ ] **Cache-Control on public HTML responses.** For cacheable public routes, set `Cache-Control` (e.g. `public, s-maxage=60, stale-while-revalidate=300`) on the response so Vercel edge can cache full HTML. *Helps: CDN can serve cached pages without hitting the server.*
- [ ] **Keep middleware minimal.** Avoid extra auth or DB work for purely public paths; ensure matcher and logic stay lean. *Helps: every request pays the middleware cost; less work per request = lower latency.*
- [ ] **Hot-path DB indexes.** Ensure indexes exist for queries used on every request (e.g. `tenant_sites.schema_name`, content by type/slug/status, integrations). *Helps: prevents a single slow query from making the whole site feel sluggish.*

---

## Architecture Notes (reference)

- **Auth:** Supabase Auth; admin vs member; `tenant_id` in metadata; middleware validates schema.
- **2FA:** TOTP primary; AAL1/AAL2; superadmin always aal2; client admin sensitive routes aal2.
- **Multi-tenant:** Single schema per deployment; isolation via env and metadata.
- **MAG:** access_level (public/members/mag), visibility_mode, optional section/shortcode/menu restrictions.
- **Design system:** CSS variables at root; settings in DB.
- **Archive/Restore:** Schema rename + registry; bucket rename.

---

## Backlog (post-MVP)

Confirmed post-MVP items; [sessionlog.md](./sessionlog.md) **Post-MVP** points here. No change needed for MVP assessment.

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog Phase 00 / Phase 12 as applicable)
- [ ] **Banners** — A programmable display block that can show HTML5 content on a schedule. Usually at top of home page.
- [ ] **Carousel shortcode** — Build a shortcode that generates a carousel (pan slider) from objects like images or content.

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
