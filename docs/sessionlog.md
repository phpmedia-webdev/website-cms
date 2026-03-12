# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

### Phase 09Ecom: Ecommerce (Lightweight)

**Status:** Planned. No on-site payment processing: build cart/order in-app, redirect to Stripe for payment; webhook/return URL confirms and updates order. Lightweight relative to WooCommerce; reuse CRM where possible. **Currency:** USD only (US developer). **Security:** No PCI on local app — no card data stored; Stripe handles all payment data.

**Subscriptions in MVP scope:** Subscriptions are an important part of the Ecommerce MVP. Web design and hosting are primary services and must be supported as subscription (recurring) products in the Ecommerce module, not only one-time payments. Plan product type/flag and Stripe Checkout subscription mode, recurring Prices, and subscription webhooks when implementing checkout and product model.

**Phase 09 scope (complete ecommerce):** (1) **Data:** CRM addresses, product content type + product table, cart, orders + order_items, coupons (code batches + discount fields). (2) **Admin:** Ecommerce nav, Products list/UI, Orders list/detail + fulfillment, order metrics (dashboard + PWA), email templates, RLS. (3) **Checkout:** Cart → collect address → apply coupon app-side → create order → Stripe Checkout (price_data) → webhook + return. (4) **Customer/public:** Shop, product, cart, checkout, success; **order history** (logged-in: e.g. /members/orders; guest: lookup by email + order number or link); **digital delivery** (access links on order detail and in email). (5) **Stripe:** Product-only sync, no Price; app-side discounts; webhook. (6) **Safety:** No PCI; abandoned/failed visibility; stock optional.

**Tables (tenant schema):** Product = content (type Product) + related `product` table; cart_sessions (or cart + cart_items); orders; order_items (reference content_id). Reuse and extend `membership_code_batches` / `membership_codes` for coupons (use_type, discount fields or `coupon_discounts`). Order history = list/detail from orders.

**Customer pages:** Shop/catalog, product page, cart page, checkout (collect info → redirect to Stripe), return/success, order history (and optional account/order hub). See **Public routes and customer account pages** below.

**Product = content + related table (mapping):**

| From content (reuse) | From related `product` table (new) |
|----------------------|-------------------------------------|
| id (content_id), title, slug, body, excerpt, featured_image_id, status, published_at, created_at, updated_at, seo_title, meta_description, og_image_id; taxonomy for categories/tags | content_id (FK, UNIQUE), **price** (in CMS; not pushed to Stripe), currency, stripe_product_id (Stripe Product only; no Price created), sku, stock_quantity (optional), gallery_id (optional FK → galleries), **taxable**, **shippable**, **available_for_purchase** |

**Product types (driven by taxable + shippable):** Physical (taxable, shippable); Digital (taxable, not shippable); Service (not taxable, not shippable); Virtual e.g. SaaS (taxable = true or false per product, not shippable). Checkout collects shipping address only when cart contains at least one shippable product; otherwise billing address only.

**Members Area (existing):** When a user is logged in (e.g. GPU converts to GPUM and signs in via `/login`), the public header already shows a **"Members Area"** dropdown (see `PublicHeaderMembersNav`). It has: Dashboard (`/members`), **Shop** (`/shop`), Profile (`/members/profile`), Account (`/members/account`). Cart will be added under Step 13c; later: Order history, Memberships, Galleries. Middleware protects `/members/*` for auth + type member/admin/superadmin. The cart page will be linked from both the dropdown and a header cart icon.

**Suggested development order (dependencies first):**



**Subscriptions (MVP — web design, hosting):**

**Design decisions (confirmed):**
- **Order history = all payments.** Create an order for first subscription payment and for each renewal so Order history shows a single list of initial and renewal payments.
- **Mixed cart:** Block mixing. When cart has one type and user adds the other, block with clear message: "One-time purchases cannot be mixed with subscriptions. Please make 2 separate transactions." (Option A.)
- **Checkout requires account.** No guest checkout for any transactions (one-time or subscription). Require sign-in for both; safer and consistent.
- **Admin Subscriptions:** Separate tab/section (Ecommerce → Subscriptions) to review all customers and active subscriptions; admin pages should mirror Stripe data.
- **Subscription emails:** Send all three — (1) subscription started, (2) renewal, (3) canceled / payment failed — to keep customer informed.
- **Scope:** Start and cancel only for MVP. No trials or plan-change proration in scope. Term/commitment (e.g. 6–12 months) may be needed later; Stripe supports subscription schedules / commitment; revisit when required.
- **Stripe Customer Portal:** Use for manage/cancel; customer rarely sees it. Admin UI mirrors Stripe; Stripe remains source of truth.

- [ ] **30. Product model for subscriptions:** Add to product table: `is_recurring` (or product type subscription), `billing_interval` (e.g. `month` | `year`). Optional: `stripe_price_id` for the recurring Price. Admin product form: same editor as one-time; toggle or type for one-time vs subscription; interval picker when subscription. Migration + UI.
- [ ] **31. Stripe recurring Price for subscription products:** When syncing a subscription product to Stripe: create Stripe **Price** with `recurring: { interval: 'month' | 'year' }`, link to existing Stripe Product; save `stripe_price_id` on product. "Sync to Stripe" (or "Create recurring Price") for subscription products.
- [ ] **32. Checkout subscription mode:** Cart must be all one-time OR all subscription; block mixed with message above. When cart is subscription-only: require sign-in (no guest checkout); create Stripe Checkout Session `mode: 'subscription'` with line items using recurring `price` (stripe_price_id). Redirect and success/cancel URLs same as one-time; webhook differs (subscription + invoice events). Enforce account required for one-time checkout as well (remove/block guest checkout app-wide).
- [ ] **33. Subscription and invoice webhooks:** Handle `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Store subscription state in `subscriptions` table (stripe_subscription_id, stripe_customer_id, contact_id, user_id, product/content_id, status, current_period_end). Create order for first subscription payment and for each renewal so Order history shows all payments (initial + renewals). Idempotent handling.
- [ ] **34. Admin: subscriptions list and status:** Ecommerce → **Subscriptions** (separate tab/section): list all customers and active subscriptions with product, status, current period end; mirror Stripe data; link to Stripe dashboard; optional cancel/sync status from webhooks.
- [ ] **35. Customer-facing subscriptions:** Members area: **Order history** = single list of all payments (one-time orders + subscription first payment + renewal orders). **Subscriptions** = separate tab: list customer’s active subscriptions, next billing date, link to Stripe Customer Portal for manage/cancel only. Send emails: subscription started, renewal, canceled/payment failed.

**Client support: Activity stream messaging (admin ↔ client, shared inbox)**

Asynchronous messages in the activity stream. The activity stream is part of the **client dashboard** (Members Area landing at `/members`), not a separate nav item; the stream header has search, type filter (like admin), and an "Add new message" button so the client can view activity and start conversations. No client-to-client in MVP; design allows it later (nullable recipient, same-membership filter). Admin targets customer by opening CRM contact → Activity Stream → send message. Client messages go to support; visible to entire admin team (no per-admin inbox).
- Discuss if we shoiuld add email followup for messages
- [ ] **36. Message schema and activity stream:** Add "Message" as a note/activity type. Schema: nullable `recipient_contact_id` (null = to/from support; later, set for client→client). Thread grouping: `conversation_id` or `parent_note_id` so replies stay grouped. Visibility rule: member sees messages where they are `contact_id` OR `recipient_contact_id`. Reuse/extend `crm_notes` (e.g. `note_type = 'message'`) or add minimal message table; ensure activity stream merge includes messages.
- [ ] **37. Activity stream type filter:** Add "Message" to `ACTIVITY_TYPE_FILTER_OPTIONS` (and any dashboard/contact activity stream UI) so admin and member can filter by Message.
- [ ] **38. Member dashboard — Activity Stream:** Make the activity stream part of the member dashboard (e.g. `/members`), not a separate sub-item. Dashboard includes an activity stream viewport: same event types as master stream (orders, memberships, form submissions, notes, messages, etc.) filtered by current customer (resolve member → contact_id). Stream **header** has search, type filter (like admin Activity Stream — including Message), and an **"Add new message"** button. Reuse activity item types and filtering patterns from dashboard/contact Activity Stream so the client can see and filter their activity (including conversations).
- [ ] **39. Client sends message (to support):** From the member dashboard activity stream header, "Add new message" opens compose/send flow. No recipient picker (always "to support"). Message stored with `contact_id` = sender's contact, `recipient_contact_id` = null. Appears in the client's stream and in admin shared stream.
- [ ] **39a. Clent message changes activity stream view** When client clicks button to send a message, the activity stream auto filters to show messages to make it more focuses. client can switch to view all at any time. the default activity stream view when dashboard is refreshed is view all.
- [ ] **40. Admin sees and replies:** Client messages visible to all admins (dashboard Activity Stream and/or contact detail Activity Stream). Admin initiates conversation by going to CRM → Contacts → open contact → Activity Stream tab → send message (target = that contact). Reply creates a message in the same thread (conversation_id or parent_note_id). No per-admin inbox or assignment.
- [ ] **41. Threading and replies (optional):** If not covered in 36/40: ensure reply flow creates a linked message (same conversation/thread) so client and admin see a coherent back-and-forth in the stream.
- [ ] **42. (Future) Client-to-client messaging:** Not in MVP. When added: use existing `recipient_contact_id`; add UI for client to "message another member"; target list = contacts who share at least one MAG with the sender (same-membership filter). Same visibility rule (contact_id OR recipient_contact_id) already supports it.

**Coupons (design):** Discount stored with the code/batch, not on product. App-side discounts only (no Stripe Coupons). Use type on batch: `membership` | `discount` | `other`. Discount fields: `discount_type`, `discount_value`, `min_purchase`, `scope`. Implemented in steps **5** (schema), **18–19** (checkout + coupon flow), **14** (orders record discount columns).

**Stripe (design):** 1:1 CMS product → Stripe Product only (price not pushed). Checkout uses **price_data** per line: `product: stripe_product_id`, `unit_amount` (after app-side discount), `currency`, `tax_behavior`. No Stripe Coupons. Stripe → QuickBooks many-to-few. Implemented in steps **9** (config), **11** (Create Stripe Product routine), **12** (eligibility), **18** (Checkout Session), **20** (webhook + return URL). **MVP includes subscriptions:** support recurring products (e.g. web design, hosting) via product type/flag, Stripe recurring Prices, Checkout `mode: 'subscription'`, and subscription/invoice webhooks.

**Stripe MCP:** Stripe MCP is enabled in Cursor. When implementing checkout (Step 18), webhooks (Step 20), or subscription flows (30–35), use the Stripe MCP to pull official docs and patterns so implementation stays aligned with current Stripe API and best practices.

### Other / Backlog

- [ ] **ADD PROPER ECOMMERCE Documentation to the mvt.md document** Detail the ECommerce module in MVT
- [ ] **Gate system: hide vs ghost:** Extend the gating system to support **hiding** features and nav links (in addition to current ghosting). Goal: clean admin UI for tenants with limited features, and avoid loading module code when the feature is not enabled. Allow per-tenant configuration so some tenants see a minimal nav (hide unused modules) while others can keep ghosted entries for upsell. Design: e.g. hide mode vs ghost mode per feature or per tenant; ensure sidebar/nav and route guards respect hide so hidden modules are not loaded.
- [ ] **Forms: captcha, rate limiting, and other protections:** Review and add protections for public forms (e.g. Contact). Options to evaluate: captcha (reCAPTCHA, hCaptcha, Turnstile, or similar) to reduce bots; rate limiting per IP or per session on form submit API; optional honeypot fields; and any other anti-spam/abuse measures. Document choices and implement per-form or global form settings where appropriate.

---

## Paused / Later

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog).
- [ ] **Banners** - A programmable display block that can show html5 content on a schedule. Usually at top of home page.
- [ ] **Carousel shortcode item** Build a shortcofe that generates a carousel (pan slider) from objects like images or content
