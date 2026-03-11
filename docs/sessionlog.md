# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

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

**Suggested development order (dependencies first):**


- [ ] **7. Product lib + RPC/API:** Helper to get product by content_id or by content slug (join content + product table, optional gallery). List products = content by type Product with join to product; public API for shop/catalog and product detail. Shop visibility: content **published** + product has **stripe_product_id** set + **available_for_purchase** = true. Optional: stock check at add-to-cart or checkout and decrement on payment.
- [ ] **8. Content list excludes products:** In the main admin Content list (and "New content" picker if desired), filter out content type `product` so editorial users only see posts, articles, snippets, etc. Products are managed only under Ecommerce.
- [ ] **9. Stripe config:** Store Stripe secret key and publishable key (env or tenant settings); webhook secret for verifying `checkout.session.completed`. Document Stripe dashboard setup and webhook endpoint. (Needed before Create Stripe Product and Checkout Session.)
- [ ] **10. Admin product UI (under Ecommerce):** Under Ecommerce → Products: list (content type Product only), create/edit product with full product form: content fields (title, slug, body, excerpt, featured_image_id, status, SEO) plus product section (price, currency, stripe_product_id [read-only after sync], sku, stock_quantity, gallery_id with gallery picker, taxable, shippable, **available_for_purchase**). "Create Stripe Product from CMS Product" button syncs Product only to Stripe (no Price). Create/update content row (type Product) and related `product` row.
- [ ] **11. Create Stripe Product from CMS routine:** API or server action: load content + product + featured_image + gallery; resolve image URLs; call Stripe **Products.create** only; save `stripe_product_id` to product row. Expose as "Create Stripe Product from CMS Product" (or "Sync to Stripe") button in product edit UI.
- [ ] **12. Eligibility check:** Shop/catalog and add-to-cart only include products where content is published, product.stripe_product_id is set, and product.available_for_purchase is true. Product detail shows "Not yet available for purchase" or hides add-to-cart when not eligible.
- [ ] **13. Cart session:** Table or server-side session storing items (content_id as product ref, qty, price snapshot). API: add to cart, update, get cart. Optional: link cart to contact/user when logged in.
- [ ] **14. Orders + order_items:** Orders table (customer_email, contact_id/user_id nullable, **status**, total, currency, stripe_checkout_session_id, created_at; **billing/shipping snapshot**; optional coupon_code/coupon_batch_id, discount_amount). Order items table (order_id, content_id for product, name snapshot, quantity, unit_price, line_total; optionally product shippable flag per line). Create order (pending) from cart at checkout.
- [ ] **15. Order address snapshot and CRM update:** At checkout, store billing (and shipping when collected) on the order. When customer is or becomes a known contact (email/contact_id), update CRM contact with new shipping (and billing if changed) from checkout so contact record stays current.
- [ ] **16. Order status and fulfillment (lightweight):** Order **status** values: e.g. `pending`, `paid`, `processing`, `completed`. Digital-only: once payment confirmed and customer receives access, treat as **completed**. Physical/mixed: set **processing** after payment; provide simple way in admin to mark **completed** (or **shipped**). No full warehouse/shipping module.
- [ ] **17. Payment-to-MAG flow (membership products):** When a customer pays for an order that includes a **membership product** (product linked to a MAG), grant them access. Optionally link product to MAG (e.g. `membership_id` on product); on Stripe webhook after marking order paid, for each membership order item: ensure member record, assign MAG, send access instructions. Core feature of the payment system.
- [ ] **18. Checkout flow:** Collect customer email and billing address (from CRM contact or guest). If cart has any **shippable** product, also collect shipping address (or "same as billing"). Create order + order_items from cart; apply coupon app-side (see Checkout coupon flow); create Stripe Checkout Session with **price_data** per line (calculated amounts); redirect to Stripe. Success/cancel return URLs.
- [ ] **19. Checkout coupon flow:** Checkout UI: optional "Apply code" field. API: validate code (membership → redemption; discount → look up batch/coupon_discounts). Apply discount to cart app-side; compute final amounts; store applied coupon_code and discount_amount on order. Build Stripe Checkout with these calculated amounts (price_data).
- [ ] **20. Stripe webhook + return:** On `checkout.session.completed`, mark order paid (set status to `paid`). If order has **no shippable** items, set status to `completed` and send access instructions; if **any shippable** item, set status to `processing`. Optional stock decrement. Return URL: show thank-you / order confirmation; clear cart.
- [ ] **21. Transactional email and template manager (breakout module):** **Email Template Storage Manager** for all transactional email. Templates with placeholders; use existing SMTP. Order confirmation required; digital delivery email (or thank-you page with link) for digital/virtual orders. Template area in admin (e.g. Settings or Ecommerce).
- [ ] **22. Abandoned / failed payment visibility:** Fallback so operators see abandoned/failed transactions: e.g. note in **customer activity stream**, status or tag on **CRM contact** ("Abandoned checkout" / "Payment incomplete"). Pending orders in list with status `pending`; optionally highlight or filter "needs attention."
- [ ] **23. Order history:** My orders page (list by user or email); order detail page. Admin: orders list and detail; filter by status; for orders in `processing`, allow staff to mark as `completed` (or `shipped`) when fulfilled.
- [ ] **24. Public routes and customer account pages:** Public shop routes (e.g. `/shop`, `/shop/[slug]`, `/shop/cart`, `/shop/checkout`, `/shop/success`). **Order history:** Logged-in: "My orders" under member area (e.g. `/members/orders`); order detail with items, status, totals, digital **access/download links**. **Guests:** order lookup by email + order number or secure link from confirmation email. Optional: account hub linking to Orders, Profile, saved addresses.
- [ ] **25. Digital delivery (customer-facing):** On order detail page and in order confirmation/digital-delivery email, show **access links** for digital/virtual items (join link, download URL, course access). Optional: "My downloads" or "Access your purchases" page.
- [ ] **26. Order metrics (admin dashboard and PWA):** Order metrics on admin dashboard (orders today, in processing, recent/revenue). Order metrics in PWA helper app. API or RPC for order counts by status (and optional date range).
- [ ] **27. Ecommerce nav and RLS:** Ecommerce sidebar nav and routes follow existing **role and gate system**. RLS on all new tables (product, orders, order_items, cart, coupon_discounts); tenant isolation; no card data stored in app (Stripe only; no PCI).
- [ ] **28. Stock (optional, simple):** When product has `stock_quantity` set, optionally validate at add-to-cart or checkout and block if out of stock; decrement on successful payment. Off by default for new products (null = no tracking).
- [ ] **29. Public pages:** Shop/catalog (list products), product page (single product, add to cart), cart page, checkout page (pre-redirect), success/confirmation, order history (and guest order lookup). Customer-facing pages covered by "Public routes and customer account pages" and "Digital delivery" above.

**Coupons (design):** Discount stored with the code/batch, not on product. App-side discounts only (no Stripe Coupons). Use type on batch: `membership` | `discount` | `other`. Discount fields: `discount_type`, `discount_value`, `min_purchase`, `scope`. Implemented in steps **5** (schema), **18–19** (checkout + coupon flow), **14** (orders record discount columns).

**Stripe (design):** 1:1 CMS product → Stripe Product only (price not pushed). Checkout uses **price_data** per line: `product: stripe_product_id`, `unit_amount` (after app-side discount), `currency`, `tax_behavior`. No Stripe Coupons. Stripe → QuickBooks many-to-few. Implemented in steps **9** (config), **11** (Create Stripe Product routine), **12** (eligibility), **18** (Checkout Session), **20** (webhook + return URL).

### Other / Backlog

---

## Paused / Later

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog).
- [ ] **Banners** - A programmable display block that can show html5 content on a schedule. Usually at top of home page.
- [ ] **Carousel shortcode item** Build a shortcofe that generates a carousel (pan slider) from objects like images or content
