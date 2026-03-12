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
- **Notifications & PWA:** Admin → Settings → Notifications (route, actions list, preferences); SMTP config storage, encryption, Admin/Superadmin UIs, send lib, test endpoint; `notifyOnFormSubmitted` (email + PWA per preferences). PWA: `/status` page, manifest, push subscriptions, VAPID, service worker, StatusPushSubscribe. Tenant setup checklist: single doc with env list, Vercel section, merged env templates (archived).
- **Contact outbound email & SMTP branding:** Drop-in `ComposeEmail` component (subject, body, attachments, dialog); send-email API and `sendEmail()` support attachments; activity log `email_sent` with snippet + attachment count. SMTP branding MVP: from-name fallback to site name when unset; minimal HTML wrapper for text-only sends. Contact UX: delete button moved to edit page; top row order Status, Merge, Edit, Compose email.
- **GPUM member area (public):** `/members` dashboard (links to profile, account; Apply code); `/members/profile` (display name, avatar via user_metadata); `/members/account` placeholder for password etc. Sessionlog documents MVP; account settings to be built.

---

## Remaining Work (by phase)

### Phase 00: Supabase Auth Integration

**Status:** In progress. Core auth, MFA (TOTP), password policy, integrations, and superadmin area done.

- [ ] Test Automated Client Setup Script (required before deploying a fork)
- [x] Superadmin → Tenant Sites → [site] → Site URL field (for gallery standalone URL prefix)
- [ ] Template (root) domain deployment: Vercel, env vars, superadmin user, test auth
- [ ] Integrations: test script injection, enable/disable, superadmin-only access
- [x] 2FA: API route AAL checks; RLS for AAL if needed; edge cases (session refresh, last factor); testing. **In progress:** MFA verify on Vercel — challenge shows but verify step sticks (debug next session).
- [ ] SMS/Phone 2FA: deferred

### Phase 01: Foundation & Infrastructure

- [x] **skip - decided to keep on local installations** Color palette: central preset library in public schema; tenant custom palettes only in tenant

### Phase 02: Superadmin UI

- [x] **skip** Admin dark theme (optional; previously decided to skip)

### Phase 03: Tenant Admin Management (Tenant Sites & Users)

**Status:** Complete. Tenant Sites, Tenant Users, site mode + lock, invite on add user.

- [x] Optional: Custom email template for new admin welcome; tenant-specific login URL in template

### Phase 04: Tenant Admin UI

**Status:** Complete. Sidebar, Dashboard, Content, Media, Galleries, Forms, CRM, Settings.

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

### Phase 07: CRM

**Status:** Core complete (schema, contacts list + detail, Activity Stream, taxonomy, custom fields, MAGs, marketing lists, forms, submissions, bulk actions, trash).

- [x] Activity Stream dashboard widget (combined activity stream + filters on admin dashboard)
- [x] Contact merge: detail page Merge button + bulk "Merge 2 contacts" (Bulk actions when exactly 2 selected); irreversible warning and checkbox; MergeBulkDialog to pick primary; mergeContacts in crm.ts, POST /api/crm/contacts/merge.
- [x] Merge field selector: side-by-side UI (MergeSideBySide), fieldChoices in merge API, suggested primary in bulk; GET /api/crm/contacts/[id]/custom-fields.
- [x] CRM external UIDs (4 columns): external_crm_id, external_vbout_id, external_stripe_id, external_ecommerce_id; migration 113; getContactByExternalId(source, id).
- [x] CRM contact list sort: column headers (Last name, First name, Full name, Status, Updated) clickable; default sort = Updated desc (last activity at top).
- [x] Optional: `crm_consents`; auto-assign tags on form submit; central automations layer; push to external CRM

### Phase 08: Forms Management

**Status:** Complete.

- [x] **skipped** Optional: "Edit all" mode in Custom Fields section (contact detail)

### Phase 09: Membership (MAG, Protection, Code Generator)

**Status:** Core complete (MAG schema, gallery + media protection, code generator, member routes, Apply code, membership feature switch). Remaining:

- [x] Content protection (blog/pages): `checkContentAccess`, gate blog + dynamic [slug], redirect to login with return URL; never send restricted body to unauthorized users
- [ ] Protected video: `/api/stream/media/[id]` proxy (verify session + MAG, stream bytes)
- [ ] Protected download: `/api/download/media/[id]` (proxy or expiring signed URL)
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

**Status:** Planned. No on-site payment processing: build cart/order in-app, redirect to Stripe for payment; webhook/return URL confirms and updates order. Lightweight relative to WooCommerce; reuse CRM where possible. **Currency:** USD only (US developer). **Security:** No PCI on local app — no card data stored; Stripe handles all payment data.

**Phase 09 scope (complete ecommerce):** (1) **Data:** CRM addresses, product content type + product table, cart, orders + order_items, coupons (code batches + discount fields). (2) **Admin:** Ecommerce nav, Products list/UI, Orders list/detail + fulfillment, order metrics (dashboard + PWA), email templates, RLS. (3) **Checkout:** Cart → collect address → apply coupon app-side → create order → Stripe Checkout (price_data) → webhook + return. (4) **Customer/public:** Shop, product, cart, checkout, success; **order history** (logged-in: e.g. /members/orders; guest: lookup by email + order number or link); **digital delivery** (access links on order detail and in email). (5) **Stripe:** Product-only sync, no Price; app-side discounts; webhook. (6) **Safety:** No PCI; abandoned/failed visibility; stock optional.

**Tables (tenant schema):** Product = content (type Product) + related `product` table; cart_sessions (or cart + cart_items); orders; order_items (reference content_id). Reuse and extend `membership_code_batches` / `membership_codes` for coupons (use_type, discount fields or `coupon_discounts`). Order history = list/detail from orders.

**Customer pages:** Shop/catalog, product page, cart page, checkout (collect info → redirect to Stripe), return/success, order history (and optional account/order hub). See **Public routes and customer account pages** below.

**Product = content + related table (mapping):**

| From content (reuse) | From related `product` table (new) |
|----------------------|-------------------------------------|
| id (content_id), title, slug, body, excerpt, featured_image_id, status, published_at, created_at, updated_at, seo_title, meta_description, og_image_id; taxonomy for categories/tags | content_id (FK, UNIQUE), **price** (in CMS; not pushed to Stripe), currency, stripe_product_id (Stripe Product only; no Price created), sku, stock_quantity (optional), gallery_id (optional FK → galleries), **taxable**, **shippable**, **available_for_purchase** |

**Product types (driven by taxable + shippable):** Physical (taxable, shippable); Digital (taxable, not shippable); Service (not taxable, not shippable); Virtual e.g. SaaS (taxable = true or false per product, not shippable). Checkout collects shipping address only when cart contains at least one shippable product; otherwise billing address only.

- [ ] **CRM addresses (billing + shipping):** Treat existing `crm_contacts` address fields as **billing**. Add shipping columns: `shipping_address`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`. Use shipping for delivery when any shipping field is set; otherwise use billing for both. Migration; update `CrmContact` type and RPCs; contact detail/edit UI: Billing address (existing) + Shipping address (optional, “if different”).
- [ ] **Product content type:** Add "Product" to `content_types` (slug e.g. `product`) as a **core default** (can't delete). Show it in **Settings → Customizer → Content types** and in **Settings → Taxonomy** so taxonomy can be applied to products. Hide it only from the main **Content list** view (products managed under Ecommerce → Products). Products are content rows with this type; use taxonomy for product categories/tags.
- [ ] **Core taxonomy sections not deletable:** In Settings → Taxonomy, core sections (for core content types) must not be deletable. Identify core/system sections (e.g. by content_type or flag) and disable or hide Delete for them in the taxonomy UI.
- [ ] **Related `product` table:** Migration (tenant schema). Columns: `content_id` (UUID FK → content.id, UNIQUE, NOT NULL), `price` (numeric/decimal; used at checkout, not pushed to Stripe), `currency` (text, default USD), `stripe_product_id` (text nullable; Stripe Product ID only; no Stripe Price), `sku` (text nullable), `stock_quantity` (integer nullable; null = no stock tracking; off by default), `gallery_id` (UUID nullable FK → galleries), `taxable` (boolean, default true), `shippable` (boolean, default false), `available_for_purchase` (boolean, default true). RLS; one row per product content. Product image gallery = featured_image_id (content) + gallery_id (product) → gallery_items for extra images.
- [x] **Product lib + RPC/API:** Helper to get product by content_id or by content slug (join content + product table, optional gallery). List products = content by type Product with join to product; public API for shop/catalog and product detail. Shop visibility: content **published** + product has **stripe_product_id** set + **available_for_purchase** = true. Optional: if stock_quantity is set, enforce at add-to-cart or checkout and decrement on payment (simple stock manager).
- [x] **Content list excludes products:** In the main admin Content list (and "New content" picker if desired), filter out content type `product` so editorial users only see posts, articles, snippets, etc. Products are managed only under Ecommerce.
- [ ] **Ecommerce nav + Products list:** Add **Ecommerce** top-level sidebar nav; under it, **Products** (and later Orders, etc.). Products list shows only content where type = Product (join to `product` table). Single place for product management. Reuse existing components (content table, shortcodes, galleries, media); the product UI is a dedicated mini-UI that uses the same building blocks.
- [x] **Admin product UI (under Ecommerce):** Under Ecommerce → Products: list (content type Product only), create/edit product with full product form: content fields (title, slug, body, excerpt, featured_image_id, status, SEO) plus product section (price, currency, stripe_product_id [read-only after sync], sku, stock_quantity, gallery_id with gallery picker, taxable, shippable, **available_for_purchase**). "Create Stripe Product from CMS Product" button syncs Product only to Stripe (no Price). Create/update content row (type Product) and related `product` row.
- [ ] **Order address snapshot and CRM update:** Store billing (and shipping when collected) on the order at checkout — e.g. `billing_*` / `shipping_*` columns or JSON snapshot on `orders`. When customer is or becomes a known contact (email/contact_id), update CRM contact with new shipping (and billing if changed) from checkout so contact record stays current.
- [ ] **Cart session:** Table or server-side session storing items (content_id as product ref, qty, price snapshot). API: add to cart, update, get cart. Optional: link cart to contact/user when logged in.
- [ ] **Orders + order_items:** Orders table (customer_email, contact_id/user_id nullable, **status**, total, currency, stripe_checkout_session_id, created_at; **billing/shipping snapshot** per above; optional coupon_code/coupon_batch_id, discount_amount). Order items table (order_id, content_id for product, name snapshot, quantity, unit_price, line_total; optionally store product shippable flag per line for fulfillment logic). Create order (pending) from cart at checkout.
- [ ] **Order status and fulfillment (lightweight):** Order **status** values: e.g. `pending` (unpaid), `paid` (payment confirmed), `processing` (paid + has shippable items; awaiting fulfillment), `completed` (done). **Digital/virtual only:** Once payment is confirmed and customer receives access (join link, download instructions, etc.), treat order as **completed** — no staff intervention. **Physical (or mixed):** When order contains any shippable product, set status to **processing** after payment (like WooCommerce) so staff know to fulfill; provide a simple way in admin to mark as **completed** (or **shipped**) when done. No full warehouse/shipping module — status-driven list of "orders to fulfill" and a button to mark complete.
- [ ] **Payment-to-MAG flow (membership products):** When a customer pays for an order that includes a **membership product** (product linked to a MAG), grant them access to that membership. Optionally link product to MAG (e.g. `membership_id` or MAG UID on product or product type); on Stripe webhook `checkout.session.completed`, after marking order paid, for each order item that is a membership product: ensure customer has a member record (create/link from contact or email), assign the corresponding MAG to that member so they receive access. Send access instructions (email/link) as part of digital delivery. Purchasing memberships and providing access is a core feature of the payment system.
- [ ] **Checkout flow:** Collect customer email and billing address (from CRM contact or guest). If cart contains any **shippable** product, also collect shipping address (or "same as billing"); otherwise billing only. Create order + order_items from cart; create Stripe Checkout Session with line_items (per-line tax_behavior from product.taxable); redirect to Stripe. Success/cancel return URLs.
- [ ] **Stripe webhook + return:** On `checkout.session.completed`, mark order paid (set status to `paid`). If order has **no shippable** items, set status to `completed` and send access instructions (email/link); if order has **any shippable** item, set status to `processing`. Optional stock decrement when stock_quantity is set. Return URL: show thank-you / order confirmation; clear cart.
- [ ] **Transactional email and template manager (breakout module):** Build an **Email Template Storage Manager** for all transactional email. Store templates (e.g. order confirmation, digital delivery, password reset) with placeholders; use existing SMTP mailer to send. Order confirmation email required for all orders; digital delivery email (or thank-you page with link) for digital/virtual orders. Template area in admin (e.g. Settings or Ecommerce) to edit these templates.
- [ ] **Abandoned / failed payment visibility:** Provide a fallback so operators can see abandoned or failed transactions: e.g. prominent note in **customer activity stream**, status or tag on **CRM contact** (e.g. "Abandoned checkout" or "Payment incomplete"), so staff can review and follow up. Pending orders remain in order list with status `pending`; optionally highlight or filter "needs attention."
- [ ] **Order history:** My orders page (list by user or email); order detail page. Admin: orders list and detail; filter by status; for orders in `processing`, allow staff to mark as `completed` (or `shipped`) when fulfilled.
- [ ] **Public routes and customer account pages:** Define public shop routes (e.g. `/shop` catalog, `/shop/[slug]` product, `/shop/cart`, `/shop/checkout`, `/shop/success` or `/order/success`). **Order history:** For logged-in members, provide "My orders" under existing member area (e.g. `/members/orders` or `/account/orders`) — list orders for current user/contact; order detail with items, status, totals, and for digital items **access/download links**. For **guests**, provide order lookup (e.g. by email + order number or secure link from confirmation email) so they can view order status and digital access without an account. Optional: small account hub (under `/members` or `/account`) linking to Orders, Profile, and saved addresses (from CRM contact) for checkout prefill.
- [ ] **Digital delivery (customer-facing):** On order detail page and in order confirmation/digital-delivery email, show **access links** for digital/virtual items (e.g. join link, download URL, course access). Optional: dedicated "My downloads" or "Access your purchases" page. **Product delivery type is multi-select:** product can be Shippable, Downloadable, or both (e.g. CD/DVD, book + PDF). Add `downloadable` alongside `shippable`; both can be true.
- [ ] **25a. Product delivery type multi-select:** Add `downloadable` boolean to product; product form: both checkboxes (Shippable, Downloadable). Cart/order: `has_shippable` + `has_downloadable`; order detail shows ship vs download per line.
- [ ] **25b. Schema: real download URL(s) per product:** Store real URL(s) for downloadable products (JSONB or `product_download_links` table); multiple links per product (e.g. Part 1, Part 2, PDF, Audio). Migration + types.
- [ ] **25c. Admin: Digital delivery links UI:** Product form when downloadable: "Digital delivery links" section — Label + URL rows, add/remove, save.
- [ ] **25d. Time-limited download links:** Customer never sees real URL. App endpoint (e.g. `/api/shop/download?token=...`) validates order/ownership/expiry, then redirects to real URL. Token encodes order, item, link index, expiry (e.g. 24–72h).
- [ ] **25e. Customer-facing: download links on order detail and email:** Per downloadable line, show one time-limited "Download" (or label) per link. Optional: "My downloads" page.
- [x] **Order metrics (admin dashboard and PWA):** Add order metrics to the admin dashboard (e.g. orders today, count in processing, recent orders or revenue). Add order metrics to the PWA helper app so staff can see key order counts and processing queue at a glance. API or RPC for order counts by status (and optional date range); consume in dashboard and PWA.
- [x] **Ecommerce nav and RLS:** Ecommerce sidebar nav and routes follow the existing **role and gate system** (e.g. admin; optionally a dedicated "order manager" role). RLS on all new tables (product, orders, order_items, cart, coupon_discounts); tenant isolation; no card data stored in app (Stripe only; no PCI on local app).
- [x] **Stock (optional, simple):** When product has `stock_quantity` set, optionally validate at add-to-cart or checkout and block if out of stock; decrement on successful payment. Leave stock tracking off by default for new products (null = no tracking).
- [x] **Public pages:** Shop/catalog (list products), product page (single product, add to cart), cart page, checkout page (pre-redirect), success/confirmation, order history (and guest order lookup). All customer-facing pages and routes covered by "Public routes and customer account pages" and "Digital delivery" above.

**Subscriptions (steps 30–35) — design in sessionlog:** Order history = all payments (create order for first subscription payment and each renewal). No mixed cart: block with message "One-time purchases cannot be mixed with subscriptions. Please make 2 separate transactions." Account required for all checkout (no guest). Admin: Ecommerce → Subscriptions (separate tab), mirror Stripe data. Emails: subscription started, renewal, canceled/payment failed. MVP: start and cancel only; trials/plan-change/term (e.g. 6–12 months) out of scope (Stripe supports later). Stripe Customer Portal for manage/cancel; admin UI mirrors Stripe.

- [ ] **30. Product model for subscriptions:** is_recurring, billing_interval, stripe_price_id; same editor as one-time.
- [ ] **31. Stripe recurring Price:** Sync creates recurring Price; save stripe_price_id.
- [ ] **32. Checkout subscription mode:** Cart all one-time OR all subscription; require sign-in; subscription session uses stripe_price_id. Enforce account for one-time too.
- [ ] **33. Subscription and invoice webhooks:** subscriptions table; create order for first payment and renewals; handle subscription + invoice events.
- [ ] **34. Admin Subscriptions:** Separate tab; list customers and active subscriptions; mirror Stripe.
- [ ] **35. Customer Subscriptions:** Order history = all payments; Subscriptions tab = manage/cancel via Stripe Portal; three emails.

**Coupons / code-based discounts (reuse existing code generator):**

- **Discount stored with the code (batch), not on product.** One code can apply a discount universally (e.g. 10% off cart or $20 off) without attaching discount rules to products. Products stay product-focused; the code is the trigger and the batch (or linked coupon row) holds the rule.
- **Use type on batch.** Add `use_type` (or `batch_type`) to `membership_code_batches`: e.g. `membership` | `discount` | `other`. Drives behavior when code is applied: membership redemption vs apply discount at checkout. Same code system supports both; filter/report by type.
- **Discount fields (for use_type = discount).** Either extend batch table with nullable discount columns or add `coupon_discounts` table (batch_id FK). Fields: `discount_type` ('percent' | 'fixed'), `discount_value`, optional `min_purchase`, `scope` ('cart' | 'product_ids' | 'category'). At checkout: validate code in CMS and apply discount to cart totals app-side.
- **App-side discounts only (no Stripe Coupons).** All discount logic stays in the app. Validate coupon code in CMS; apply discount (percent or fixed) to cart; compute final line or cart amounts. Send the **calculated (discounted when applicable) amounts** to Stripe at checkout via `price_data` (see Stripe integration below). No Stripe Coupon creation or sync — avoids extra manual work in Stripe and keeps one source of truth (CMS) for codes and pricing. Store applied coupon_code and discount_amount on order for display and audit.
- [ ] **Code/batch schema for ecommerce:** Migration: add `use_type` to `membership_code_batches` (e.g. text: 'membership' | 'discount' | 'other', default 'membership'). Add discount columns to batch table OR create `coupon_discounts` (batch_id FK UNIQUE, discount_type, discount_value, min_purchase nullable, scope). No Stripe coupon fields. Update batch create/edit UI and code generator to support use_type and discount fields when use_type = discount.
- [ ] **Checkout coupon flow:** Checkout UI: optional "Apply code" field. API: validate code (membership → redemption; discount → look up batch/coupon_discounts). Apply discount to cart app-side (percent or fixed per scope); compute final amounts per line or cart. Store applied coupon_code and discount_amount on order. Build Stripe Checkout with these calculated amounts (price_data), not Stripe Coupons.
- [ ] **Orders record discount:** Orders table: optional `coupon_code` or `coupon_batch_id` and `discount_amount` so order history shows which code was used and how much was discounted (ensure columns on orders).

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
- [ ] **Checkout Session:** Build `line_items` from cart with **price_data** per line: `product: stripe_product_id`, `unit_amount` (calculated from order/cart in cents, after app-side discount), `currency`, `tax_behavior`. Create Stripe Checkout Session; redirect to session.url. No pre-created Price IDs; no Stripe Coupons.
- [ ] **Webhook:** Handle `checkout.session.completed`; match session to order (e.g. metadata order_id); mark order paid; optional stock decrement. Idempotent handling.
- [ ] **Return URL:** Success URL shows order confirmation and clears cart. Optionally fetch session/order for display.

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
