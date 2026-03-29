# Session Log

**Purpose:** **MVP open-items checklist** — what still blocks **fork-deploy-ready** delivery. **Completed** work lives in [planlog.md](./planlog.md) (phase checkboxes) and [changelog.md](./changelog.md).

**Workflow:** See **`.cursor/rules/sessions.mdc`**. When you close an item, **check it off in [planlog.md](./planlog.md)** (matching phase) and **remove it from here** (or add a planlog-only checkbox if it belongs there). Session end → [changelog](./changelog.md) with **Context for Next Session**; changelog may cite **planlog** + chat, not only this file.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Specs:** [prd.md](./prd.md), [prd-technical.md](./prd-technical.md) (especially **Phase 18C** — Directory & messaging).

### Manual SQL — you run scripts in Supabase

**Database changes are not applied when you pull code.** Copy files from `supabase/migrations/` into **Supabase Dashboard → SQL Editor** and **Run** (numeric filename order).

**Applied on primary Supabase (through 2026-03-26):** Migration queue is current through **`214`**, including **`197`** / **`198`** (All Tasks RPC presets + archived-project exclusion), **`200`** (project numbers), **`207`**–**`214`** (tasks **`contact_id`**, nullable **`project_id`**, standalone task FK/backfill, reminders + calendar visibility, Message Center / MAG **`214`**). **New forks or stale envs:** copy **`supabase/migrations/`** in **numeric filename order** and run any files not yet applied on that database.

---

## MVP completion — **open** items (sections 0–5)

Use order **0 → 5** where dependencies apply (e.g. task threads depend on Phase 18C).

### 0. Standalone tasks conversion

**Status:** Implementation complete. Manual QA matrix deferred. See [changelog.md](./changelog.md) **2026-03-26 09:49 CT** and [planlog Phase 19](./planlog.md#phase-19-project-management-module) (standalone support tasks, **`POST /api/tasks`**, etc.).

### 1. Tasks & Projects (remaining)

- [ ] **GPUM (if in MVP):** Member-area **Projects**, **Tasks**, **Support tickets** per [planlog Phase 19](./planlog.md#phase-19-project-management-module) — or **defer** and document in planlog.
- [ ] **GPUM calendar — task due-date layer parity:** when member area calendar/dashboard work starts, add a GPUM-safe task due-date overlay (month/week/day/agenda) with hover details and click-through to allowed task detail routes only. Respect GPUM visibility rules (`contact_id` linkage, assignee/follower access, and future `client_visible` / `internal_only` policy) so internal-only tasks never leak.
- [ ] **Phase 19 items you still want before fork:** e.g. standalone support-task refinements, **`project_id` on invoices**, punch-style time UI — keep as [planlog](./planlog.md) checkboxes and work them here when in scope.
- [ ] **Project detail — Attachments tab:** Replace placeholder with file uploads or linked documents (schema/API TBD).
- [ ] **Task assignee roles (Customizer first):** Add Customizer scope for **task follower / assignee roles** (e.g. `task_assignee_role` or `task_follower_role`), seed **creator**, **responsible**, **follower** as **core** (non-deletable slugs; labels/order/colors editable like **`project_role`**). Wire **Settings → Tasks** (or equivalent) and **link role pickers** (add assignee, responsible, etc.) to that scope instead of hard-coded strings where applicable.
- [ ] **Creator auto-assign + Assignees card order:** On **create task** (e.g. from All Tasks list), **auto-insert** the logged-in admin as **`task_followers`** with **creator** role; **API/UI:** creator row **not removable**. **Assignees card** order: **Creator** (and other role-grouped assignees) **first** → **linked contact** (`tasks.contact_id`) → **remaining assignees** by role. Align detail and edit surfaces.

**Task edit page (UI polish)**

- [ ] **Time logs — assignee display:** Avatar + name in the time list should use **full name** (same priority as elsewhere for “legal” / display name), not **nickname/handle-only**.
- [ ] **Assigned resources card:** Remove the **Edit** button. Replace **“Remove bundle”** (and equivalent remove actions for **single** resource rows) with a **trash / garbage can** icon control only (consistent for bundles and singles).

**Time model alignment (Tasks/Projects) — assessment + Do Next**

- **Current behavior:** Migrations **201** / **202** are **applied** (records): `planned_time` on `tasks`/`projects` (with legacy `proposed_time` sync via **201** where still present); list/detail RPCs return **`planned_time`** (**202**). App + direct writes use **`planned_time`**. **Project detail planned total** = sum of task `planned_time` (Option A). **Logged time** = sum of `task_time_logs`; **project logged** = rollup of those entries.
- Open follow-up only: add new items here if any planned-time regressions are found in future QA.

### 2. Resources

No extra sessionlog lines — **Phase 21** in planlog. Optional: [picker MVP-if-time](./planlog.md#event-resource-picker--mvp-if-time-permits).

### 3. Messaging & notifications (MVP)

Goal: **Tenant admins** get reliable **notifications / activity**; **GPUMs** get **support-style messaging**. Timeline + threads; cut over from **`crm_notes`** where spec says so.

**Shipped (synced 2026-03-26):** Admin **Message Center** on **Dashboard** — `DashboardTabsClient` **Message Center** tab + `DashboardActivityStream` (thread-head rows ∪ timeline items, type filters, title search, deep links). **APIs:** `GET /api/admin/message-center`, unread count for tab, `PATCH` thread read. **MAG:** `allow_conversations` (CRM MAG detail), GPUM **messaging preferences** (member profile), post policy + support/task thread participant seeding. **DB:** migration **214** + Customizer `message_center_*` seeds. **Policy:** no new **`crm_notes`** for migrated kinds; task discussion on **`conversation_threads`**. Full detail: [changelog](./changelog.md) **2026-03-26 16:44 CT**, [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications), [plan-message-center-roadmap.md](./reference/plan-message-center-roadmap.md).

**Message Center — GUI / UX next steps (build from here)**

**GPUM Message Center MVP** — Product rules and v1.1 scope: [plan-gpum-message-center-mvp.md](./reference/plan-gpum-message-center-mvp.md). **Phases 0–3** are **shipped at functional v1** (2026-03-26–27): `gpum-message-center.ts`, `gpum-member-stream.ts`, `gpum-mag-eligibility.ts`, `GET /api/members/message-center`, **`MemberActivityStream`** on **`/members/messages`**. **MVP code — expedited status:** GPUM Phases **0–5** are **implemented** in code except **5.3** (manual QA matrix — you run it). **Phase 3.4** (sheet picker) **not needed:** **Join a conversation** → **Conversations** filter + stream rows + **Message the team** + **View all** replace a dedicated Support+MAG sheet ([plan-gpum-message-center-mvp.md](./reference/plan-gpum-message-center-mvp.md) **3.4** marked done). **Do next to “finish” messaging for fork prep:** (1) Run [qa-gpum-message-center-phase-53.md](./qa-gpum-message-center-phase-53.md) and check off **5.3** below + planlog when green. (2) Defer rabbit holes: announcement read metrics, admin chat vs feed redesign, bulk timeline triggers — track in planlog, not sessionlog blockers.

**Next focus (after QA):** [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications) cutover/docs or Phase 19/20 per priority — **COMMENT:GROUP** / MAG membership UI when prioritized ([planlog](./planlog.md) Phase 18C).

**GPUM pages — function, not template polish:** Implement **working flows and APIs** with plain, accessible UI (shared components ok). **Avoid** heavy visual/design work in this repo — **each tenant fork is bespoke**; forks own layout and styling.

#### GPUM Message Center MVP — execution checklist

**Phase 0 — Types and API contract**

- [x] **0.1** Normalized GPUM stream item type (discriminated union): `notification` | `announcement_feed` | `conversation_head` in `gpum-message-center.ts`.
- [x] **0.2** `GET /api/members/message-center` returns `items[]`, `streamItems[]`, `nextCursor`, `hasMore` — **`nextCursor` / `hasMore` still stubbed** (real cursor pagination = follow-up).
- [x] **0.3** **`getMemberActivity`** skips **`visibility === "admin_only"`** timeline rows; merged stream builds on that activity slice.

**Phase 1 — Server: merged “All” stream**

- [x] **1.1** `getMemberMessageCenterMergedStream`: notifications + announcement lines + **conversation_head** rollups (**support** + **MAG** threads via **`memberCanSeeMagGroupCommentHead`** — enrolled + **`allow_conversations`**, **`getOrCreateMagGroupThread`** when no row yet).
- [x] **1.2** Dedup policy: feed row + in-thread message for same announcement remains acceptable; document when tightening (Phase **5.1**).
- [x] **1.3** **All / Conversations / Notifications** applied server-side (`filterMemberStreamItems` + route).

**Phase 2 — MAG eligibility helper**

- [x] **2.1** **`memberCanSeeMagGroupCommentHead`** — stream listing: enrolled in MAG + tenant **`allow_conversations`**; **`memberCanSeeMagGroupThread`** remains for stricter scenarios if referenced elsewhere (`gpum-mag-eligibility.ts`).
- [x] **2.2** Stream uses **2.1**; **POST** **`mag_group`** uses **`assertCanPostThreadMessage`** — member path = **`members`** row + **`author_contact_id`** + enrollment (no separate profile opt-in; **2026-03-28**).

**Phase 3 — Client: `/members/messages`**

- [x] **3.1** Stream + filter + search + date presets (functional layout).
- [x] **3.2** Rows with `threadId` open **inline** transcript (`GET /api/conversation-threads/.../messages`); other rows list-only / order deep link.
- [x] **3.3** Transcript + **reply** composer; failures show read-only error state.
- [x] **3.4** **Done — no sheet:** Original plan called for a **sheet** listing Support + eligible MAGs. **Superseded** by **`MemberActivityStream`** flow: **Join a conversation** switches to **Conversations**; **conversation_head** rows + **Message the team** cover entry points; **View all** returns to mixed stream. A separate modal/sheet is **out of scope**.

**Phase 4 — Unread and light UX (not visual polish)**

- [x] **4.1** Unread for member threads (`thread_participants` + member-safe mark-read if missing); surface **`unread`** on `conversation_head` in UI.
- [x] **4.2** Empty states (gates, no messages).
- [x] **4.3** `/members` dashboard: link or short preview + “See all” (no full duplicate implementation).

**Phase 5 — Docs and QA**

- [x] **5.1** [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) — GPUM API subsection: `streamItems` kinds, query params, **`cursor` / `nextCursor`**, MAG read vs post, **`announcement_feed`** vs **`conversation_head`**.
- [x] **5.2** [planlog.md](./planlog.md) Phase 18C — GPUM pagination + wiring doc checkboxes updated.
- [ ] **5.3** Manual QA: run [qa-gpum-message-center-phase-53.md](./qa-gpum-message-center-phase-53.md) (support, MAG **Member conversations in MAG room**, profile opt-in, handle gate, filters, **Load more**); check off when done.

#### Next up (§3 — messaging / notifications)

**Priority next session:** **GPUM Phase 5.3** — run the QA matrix once; then remove or check off that line. **3.4** sheet picker **closed** (stream UX above).

**1. GPUM Phase 4 — unread, empty states, dashboard discovery**

**4.1–4.3 (shipped):** Member **`unread`** + mark-read, **`MemberActivityStream`** empty states, and **`MemberMessagesPreview`** on **`/members`** (up to 5 rows + **See all**); full stream remains on **`/members/messages`** only.

**2. GPUM Phase 5 — docs, QA (remaining: manual pass)**

The **wiring doc** now includes **§ GPUM merged stream API (implemented)** (kinds, query params, keyset **`cursor` / `nextCursor` / `hasMore`**, MAG read vs post, merge window). **Code:** stable newest-first sort, **`paginateMemberStreamItems`**, **`MemberActivityStream` Load more** (same filter/dates/limit as initial fetch). **Still do:** run the **manual QA matrix** in that doc (support, MAG gates, nickname, filters, **Load more**).

**3. Phase 3.4 — closed (no sheet)**

**Product decision:** A dedicated **sheet picker** is **not** required. **Join a conversation**, **Conversations** filter, **Message the team**, and **View all** on **`MemberActivityStream`** provide the intended entry and return paths.

**4. Broader messaging MVP (below this checklist)**

These items are **not** GPUM Message Center polish; they are **platform** work that the PRD treats as part of notifications/messaging maturity: **timeline triggers** (what events insert timeline rows—forms, orders, assignments, MAG changes—so behavior is predictable). **Event reminders** (cron + email/in-app/PWA per [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds)). **Blog / product comments** (thread storage, moderation, optional **admin Comments** hub). **Tasks hidden from clients** (`client_visible` / `internal_only`) so internal work and threads do not leak to GPUM lists. **`crm_notes` cutover** for forks: document that new kinds live on **timeline + threads**, keep legacy table only as long as needed, and avoid new feature work that depends on **`crm_notes`** for those kinds.

**5. Admin product direction — chat vs feed**

**Unified activity + thread row** (current admin dashboard model) optimizes **scanning** everything at once; **SMS-style chat** optimizes **one continuous support (or MAG) transcript** without hunting. This is a **product** decision ([changelog](./changelog.md) **2026-03-26 23:53 CT**): it affects layout, density, and whether staff default to **CRM contact + expanded thread** vs a **single inbox**. Engineering follow-ons depend on that choice—e.g. **expandable support row** or a **right-hand chat panel** so admins can read the full thread **without** relying on search or leaving the dashboard. Until decided, keep improving the **current** model (contact scope, labels, composer defaults) without a large redesign.

---

- [ ] **GPUM UX model (product):** **SMS-style chat** vs **unified feed + thread row** — optional follow-on; transcript UI in Phase 3 can align either way ([changelog](./changelog.md) **2026-03-26 23:53 CT**).

**Recently shipped (admin Message Center surface):** Unread row styling, bulk mark read / mark visible unread, **View all** + filter menu (`admin-filters.ts`), **`GET /api/admin/message-center`** + mark-read batch, **contact-scoped** stream on CRM **Message Center** tab (`DashboardActivityStream` in `ContactRecordLayout`) + **`/admin/dashboard/message-center?contact_id=`** deep link, full page + sidebar + dashboard tab **Open full page**; legacy **`/admin/message-center`** → **`308`**. **Contact + expanded thread UX:** header **Add note** on non-Messages filters vs **Add message or note** on Messages; composer opens **internal note** vs **message** by context; bottom **Message** CTA + message-only dialog in inline conversation mode; transcript **`enrichAuthors`**, scroll/ordering fixes, staff vs member labeling in thread rows.
- [ ] **Support — GPUM surfaces:** Clear **entry points** to support / ticket threads from member area (not only API).
- [ ] **Docs / spec:** Keep [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) + [prd-technical §18C](./prd-technical.md#phase-18c-directory-and-messaging) aligned as UI/API land.

**Still open (broader messaging MVP, non-GUI or later)**

- [ ] **Timeline triggers:** Minimal set (forms, orders, assign, MAG, …) — define and implement.
- [ ] **Event reminders — cron & multi-channel:** [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds)
- [ ] **Blog comments:** Verify threads + moderation paths ([wiring doc](./reference/messages-and-notifications-wiring.md))
- [ ] **Product comments** + **approval workflow** (posts + products)
- [ ] **Admin — Comments management** (e.g. `/admin/content/comments`)
- [ ] **Tasks — hide from client (design + implement):** **`client_visible`** / **`internal_only`** on `tasks`; threads + GPUM lists respect flag.
- [ ] **Cutover + backfill** from **`crm_notes`**; runtime paths already off **`crm_notes`** for migrated kinds; keep DB table temporarily; document in [prd-technical](./prd-technical.md)
- [ ] **Fork migration note:** Treat **`crm_notes`** as **legacy** for new forks; remove from required runtime path after backfill.

#### Personal capture inbox webhook (planned)

**Not coded until prioritized.** External apps (e.g. **voice capture → transcription**) send a **`POST`** with a **JSON** body into the CMS. Each **tenant team user** can have a **dedicated webhook** so payloads land in a **personal inbox**: rows are visible **only to that recipient**, not to other tenant users—like a private capture queue, not a shared thread or contact timeline.

**Rollout:** **Tenant admins first** (each may enable an endpoint + secret). **Tenant admin** decides whether **non-admin roles** (editor, viewer, etc.) may **enable their own** webhook—default **off** until the tenant opts in.

**Recipient workflow:** Open the item from **Message Center** (same mental model as the rest of the messages area); **decide what to do** (e.g. create **task**, add **staff note** / timeline row, link to **contact**—exact actions TBD when building); then mark **processed**, **archived**, **complete** (or a small **status** set) so the inbox stays triage-friendly.

**Implementation steps (for when this moves up the backlog):**

1. **Schema:** Tenant table for **inbox rows** (`recipient_user_id`, preview/body, `raw_payload` jsonb, `status`, timestamps). Separate **token → recipient** mapping (opaque URL segment, **hashed** secret at rest; rotate/revoke). RLS / service-role rules aligned with “only recipient reads.”
2. **`POST` route:** Public webhook handler (compare **Anychat** / **Stripe** patterns under `src/app/api/webhooks/`); validate payload size/shape; **rate limit**; insert only for resolved user. Scoped to **staff** surface unless product later extends to GPUM.
3. **Settings UI:** Per eligible user—**enable**, **copy URL**, **regenerate secret**; respect **admin-only** vs **role toggle** for non-admins.
4. **Message Center:** Merge **capture rows** into the admin stream (new `source` or filter, e.g. **Capture** / **Inbox**) with **`forUserId === recipient`** enforced on every row.
5. **Inbox UI:** Row + detail; actions to **task** / **note** / etc.; **status** transitions.
6. **Ship checklist:** Migration file + **Manual SQL** note, **MVT**, wiring blurb in [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md).

**Plan checkbox:** [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications) — **Personal capture inbox (webhook)**.

**Plan detail:** [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications).

### 4. Auth — shared identity UX (forks)

- [ ] **Cold pages:** `/login`, `/register`, forgot-password — copy per [prd.md](./prd.md#shared-identity-ux-forks)
- [ ] **Transactional email:** Signup/welcome, reset — PHP-Auth wording; no tenant directory in email
- [ ] **Signed-in help:** `/members/account`, Security, admin profile
- [ ] **Profile labels:** Global vs **this site only**

**Plan detail:** [planlog Phase 00](./planlog.md#phase-00-supabase-auth-integration).

### 5. Pre-fork: review, security, finalization

**Align [mvt.md](./mvt.md)** with fork-ready template (deployment, module tier, shared-critical paths, donor workflow).

- [ ] Fork deployment section accurate
- [ ] Module surface tier table matches repo
- [ ] Shared-critical paths table current
- [ ] Code sitemap / per-module sections current
- [ ] Donor workflow documented in MVT
- [ ] Public vs admin boundary audit (`(public)` must not import admin-only code)
- [ ] Shared-critical inventory + pre-merge guardrails
- [ ] Route/API ownership documented
- [ ] Build / release policy (green `pnpm run build` before production)
- [ ] Public uptime smoke suite per tenant
- [ ] Fork checklist + [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md)

**Security, review, ops**

- [ ] Code review pass (auth, CRM, tasks, messaging APIs, RLS)
- [ ] Security: validation, RLS vs API, secrets, boundaries
- [ ] Performance spot-check — [planlog — Performance & Caching](./planlog.md#performance--caching-load-times)
- [ ] Fork checklist: env, migrations order, superadmin, smoke

**Plan detail:** [Code Review](./planlog.md#code-review-security--modular-alignment) & **Performance & Caching**.

---

## Accounting (planned module — SSOT → export → QuickBooks)

**Goal:** **Website-cms is SSOT** for money in/out, open invoices, payments, expenses, mileage, and **credits/refunds**. **Stripe** handles merchant processing and card PII; **sync Stripe into the app** (not the other way for ledger truth). **QuickBooks:** **CSV export first**, then **one-way API sync** (per-transaction or batch) as a later goal. Scope is **accountant-ready** data (P&amp;L, detail, tax lines)—**not** full bank reconcile or double-entry in v1.

**Principles**
- **One canonical income model** — explicit rule for `orders` / subscription cycles / manual payments so nothing is double-counted; document in `prd-technical` when locked.
- **Your document numbers** — `order_number` / `invoice_number` / receipt numbers from existing generators; assign at defined lifecycle points; webhook handlers **idempotent** (key to Stripe `invoice.id`, `checkout.session.id`, `payment_intent.id`, `refund.id`, etc.).
- **Invoices = A/R** (planned / future or staged revenue; **open balance**; **multiple payments** allowed). **Sales receipts = closed money-in** (nothing left to collect in the books sense): store checkout paid in full, payment links, subscription **period** treated as satisfied when fully paid, **field / offline payment in** with **no** open invoice—aligns with **WooCommerce-style** “order tracks product; QuickBooks gets a **sales receipt** when cash is in hand.” **Stripe Billing** still uses Stripe **Invoice** objects; the app maps Stripe events to **invoice** vs **sales receipt** by whether **open A/R** remains—Stripe vocabulary ≠ app export document type.
- **Credits / refunds** — **Credit memo** (or QBO-equivalent negative document) is **explicit** for refunds and revenue reversals; not implied by “payment in” alone. Links to original **invoice** or **sales receipt**, optional **Stripe `refund.id`**; **Accounting** owns the book document; **Sales / Orders** may show refund **status** for ops only.
- **Invoice ↔ Stripe (tax collection path):** When the app **issues** an A/R invoice that should use **Stripe Tax**, **create a corresponding Stripe Invoice** (or equivalent Stripe object) so tax is calculated there; keep it **open** until paid. Expose a **Stripe-hosted payment URL / payment link** on the customer-facing invoice document so pay-online is one click. **Idempotent** creation (retries must not duplicate Stripe invoices).
- **Mixed payments:** Customers may pay **via Stripe** (link/card) **and/or outside Stripe** (cash, Venmo, Zelle, check, etc.). The app must record **multiple partial payments** against the same open invoice and keep **ledger balance** authoritative; document how **Stripe invoice status** stays aligned when payments are recorded only in-app (e.g. manual payment rows, Stripe mark-paid, or credit/adjustment policy)—**lock with CPA/ops** before build.
- **Sales tax:** Stripe Tax (or chosen engine) authoritative for **Stripe-collected** amounts on those invoices. **Ingest** tax breakdown from Stripe (webhooks/API) into the app for reporting. Maintain a **sales tax register** in the app (by period / jurisdiction as needed) to support **monthly filing and remittance reporting**; CSV/QBO export must carry **tax lines explicitly** when QuickBooks tax calculation is bypassed so the CPA does not re-key. CPA to confirm mapping.
- **Stripe payouts:** Match **orders/payments** to **payout** via balance transactions for **deposit ↔ QBO** reconciliation (clearing account pattern optional).
- **Projects:** `project_id` optional on expenses (including mileage); **not required**. **Labor rate / margin** rollups: keep planlog item (`projects.labor_rate_per_hour` or equivalent) aligned with accounting when built.
- **Tenant RLS**, feature gating, admin APIs only unless noted.

### Stripe ↔ app document alignment (process)

| App document | Meaning | Typical Stripe linkage | Notes |
|----------------|---------|------------------------|--------|
| **Sales receipt** | **Closed**; full money-in now; no open A/R. | Paid **Checkout Session** + **PaymentIntent**; or paid-in-full episode; optional manual row (no Stripe). | Store sales, payment links, field cash when **not** applying to an invoice. |
| **Invoice** | **Open A/R**; future/planned collection; **partials** OK. | **Stripe Invoice** (draft/open) + hosted pay / payment link; webhooks keep tax and balance in sync. | Stripe still calls it “Invoice”; app tracks **ledger balance** and applications. |
| **Credit memo** (credits/refunds) | Reverses or reduces amount owed / revenue vs prior doc. | **`refund.id`** and related charge/payment objects when applicable. | **Generate** from **Credits and Refunds**; export to QBO per CPA mapping (Credit Memo vs Refund Receipt). |

**Orders** — **Commerce** record for fulfillment (cart → paid → shipped). **Accounting** document attaches when money is recognized: **receipt** when paid-in-full with no receivable left; **invoice** when there is staged A/R or installment logic.

### Document types (webapp + export)

| Concept | Use |
|---------|-----|
| **Invoice** | Open balance; multiple payments; partials—**must exist** before tracking partial application. For Stripe Tax path, linked **Stripe Invoice** + **payment link**; see mixed-payments principle above. |
| **Sales receipt** | **Closed** immediate money-in: storefront / payment link / subscription period closed as receipt (per CPA), **field payment in** without invoice. |
| **Credit memo** | Refunds and adjustments; ties to originating **invoice** or **sales receipt**; supports partial refunds; **Credits and Refunds** admin page. |
| **Order** | Store catalog / checkout (existing); tie to Stripe; feed same SSOT; generates or links **receipt** or **invoice** per rules above. |
| **Subscription** | Stripe subscription + paid cycles; map each **paid** period to app row(s) + export line(s) (**sales receipt** vs **invoice** per CPA for that billing shape). |

**Payment in (field / PWA):** Pick **open invoice** → record **payment** (partial allowed). **No invoice** → create **quick sales receipt**. If operator marks **partial** without an invoice to attach → **block** with guidance to create/select invoice first. **Payment method** values should come from a **tenant pick list** (see below), not only free text.

### Admin navigation — **Ecommerce** (locked)

Top-level sidebar label stays **Ecommerce** (most flows are electronic). One expandable section with **two non-clickable group labels** (same interaction level as today—no third-level nav): **Sales** | **Accounting**.

**Sales** (money-in / storefront; routes remain under `/admin/ecommerce/` unless a new path is introduced for receipts only—implementers may add `/admin/ecommerce/sales-receipts` or equivalent):

| Label | Route (target) |
|-------|----------------|
| Products | `/admin/ecommerce/products` |
| Orders | `/admin/ecommerce/orders` |
| Invoices | `/admin/ecommerce/invoices` |
| Sales receipts | `/admin/ecommerce/sales-receipts` *(new when built)* |
| Subscriptions | `/admin/ecommerce/subscriptions` |

### Ecommerce — product customer-facing status (Customizer)

**Today:** The **`product`** table does **not** pull a status from the Customizer. Merchandising uses **`stock_quantity`** (integer, nullable) and **`available_for_purchase`** (boolean) in `ProductDetailsForm` / `product` row — there is **no** slug-backed **Available / Backordered / In Production / Out of stock** dimension yet.

**Planned (wire with Products + GPUM notifications):**

- [ ] Add a **Customizer** scope (e.g. `product_fulfillment_status` or `product_customer_status`) seeded with **core** slugs (non-deletable, labels/order/colors editable like other Customizer staples): **`available`**, **`backordered`**, **`in_production`**, **`out_of_stock`** — map to display strings **Available**, **Backordered**, **In Production**, **Out of Stock** (or tenant-defined labels).
- [ ] **Migration + `product` column** (e.g. `product_status_slug` or aligned name) referencing that scope; admin **product** edit UI: **select from Customizer** (no ad hoc free text for those four).
- [ ] **Storefront + member/order surfaces** show the resolved label; when status changes, optional **GPUM / purchaser notification** (see [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) § GPUM → Ecommerce & orders — *Ordered product / fulfillment status*).

**Note:** The codebase may already expose **`/admin/ecommerce/transactions`** (shop/Stripe-oriented activity). That is **not** the same as **Accounting → Transactions** (merged **ledger** register: payments in + expenses). If both appear in nav, use **distinct labels** (e.g. **Store transactions** vs **Ledger** or **Accounting transactions**).

**Accounting** (books, tax, exports, reference data):

| Label | Route |
|-------|--------|
| Overview | `/admin/accounting` |
| Expenses | `/admin/accounting/expenses` |
| Transactions | `/admin/accounting/transactions` *(merged register: payments in, expenses, filters)* |
| Sales tax | `/admin/accounting/sales-tax` |
| Credits and Refunds | `/admin/accounting/credits-and-refunds` *(credit memos / refunds; document generation)* |
| Reports | `/admin/accounting/reports` |
| Setup | `/admin/accounting/setup` *(chart of accounts, expense types, payment types, mileage rate, accounting prefs)* |

**Feature gating:** Existing ecommerce slugs (`ecommerce`, `products`, `orders`, `invoices`, `subscriptions`, etc.) + **`accounting`** for Accounting group items; show **Ecommerce** section when **any** child feature is enabled (mirror CRM/Ecommerce composite visibility pattern in `Sidebar.tsx` / `sidebar-config.ts`).

**Implementation steps (nav):** Add `accountingSubNav` (and optional `salesSubNav` reorder) in `sidebar-config.ts`; `SIDEBAR_ACCOUNTING_OPEN` + `isAccounting` paths; register **`accounting`** in feature registry / tenant gates; implement **group headings** “Sales” / “Accounting” inside the existing Ecommerce accordion (or split arrays rendered with labels).

### Field capture (PWA → web app)

- **Access:** **Feature registry + role**; **v1: admins only** (expand roles later).
- **Expenses (single conceptual model):** Treat **mileage as a type of expense** (not a parallel top-level module). On entry, operator indicates **mileage** vs **standard expense**. **Standard:** amount, date, payee, memo; **category / type** from a **predefined expense-type pick list** (tenant-configurable table or Customizer scope); **receipt photo** optional (Storage); **`project_id` optional** (recommended for job costing).
- **Mileage (within expenses):** **Point-to-point** (personal vehicles—**no odometer chain**). Fields: date, **from** address, **to** address, **miles (user-entered)**, business purpose; **amount = miles × rate** (tenant-config rate, e.g. IRS mileage updated annually). Optional later: map API **suggested** miles, user always confirms/edits.
- **Pick lists (data):** Tenant-scoped tables (or Customizer) for **expense types** and **payment types** / methods used on **Payment in** and exports—stable codes for QBO CSV and reporting.
- **Payment in:** Amount, date, method from **payment-type pick list**, memo; invoice pick list **or** auto sales receipt (see above).

### QuickBooks sync phases

1. **CSV export** — Invoices, invoice payments, **sales receipts**, **credit memos / refunds**, expenses (including mileage lines), **sales tax lines**; stable **category/customer codes**; columns include `cms_*_id`, Stripe ids, `synced_at` / batch id; **do not** re-export same row without idempotency rules.
2. **API sync** — OAuth app; create Customer / Invoice / Payment / SalesReceipt / **CreditMemo** (or QBO-equivalent) / Expense; store `qbo_*_id`; same external ids for dedupe.

### Open checklist (Accounting)

**Strategy & schema**
- [ ] Lock **SSOT strategy** (orders + subscription paid events + field payments; single write path per Stripe object id; **mixed Stripe + external payments** + Stripe invoice alignment rules; **receipt vs invoice** classification rules; **refund → credit memo** linkage).
- [ ] Migration(s): accounting tables (names TBD)—e.g. **invoices** (A/R, `stripe_invoice_id` or equivalent), **invoice_payments** (source = stripe | manual, partials), **sales_tax_lines** or normalized tax snapshots (from Stripe + manual if ever needed), **sales_receipts**, **credit_memos** (or **credits_refunds**; link to source invoice/receipt, `stripe_refund_id`, partial amounts, reason), **expenses** (rows or subtype for **mileage** fields), **expense_types** / **payment_types** pick lists, links to `orders` / `projects`; **Manual SQL** — run new files from `supabase/migrations/` in Supabase SQL Editor; call out in chat + sessionlog when added.
- [ ] **Sales tax register** — period/jurisdiction views fed by **ingested Stripe Tax** data; export columns for filing; **tax / line mapping** doc for QBO CSV (separate tax line, `NON`-style taxable flags per CPA).

**Stripe ↔ app**
- [ ] **Create Stripe Invoice** (or aligned API flow) when app invoice is finalized for tax collection; store link/URL for customer payment; idempotent upsert by Stripe invoice id.
- [ ] Webhook + idempotent upsert: checkout, Stripe **invoice** events (paid, updated, voided as needed), **tax amounts / line items**, subscriptions, **refunds** (`refund.*` / charge reversal as needed), fees as needed for net = bank story.
- [ ] Payout / balance-transaction linkage for reconciliation views (optional v1.1).

**App & PWA**
- [ ] Server lib + API routes (tenant-scoped); field endpoints for PWA.
- [ ] Admin **Ecommerce** sidebar: **Sales** + **Accounting** groups per **Admin navigation (locked)** above; pages **Sales receipts** (`/admin/ecommerce/sales-receipts`), **Credits and Refunds** (`/admin/accounting/credits-and-refunds`), and full **`/admin/accounting/*`** tree; merged register on **Transactions**; **CSV export** from **Reports** (and per-entity as needed).
- [ ] PWA: **unified expense entry** (standard + mileage) / **Payment in** (feature-gated); minimal forms aligned with receipt/invoice rules.
- [ ] Feature slug **`accounting`** + composite **Ecommerce** visibility; project detail **optional** summary widget later.

**Later**
- [ ] QBO API sync (replace or supplement CSV); Intuit MCP useful for dev only, not production sync.
- [ ] Optional: `projects.labor_rate_per_hour` (or existing plan) for margin; CSV import for bank/card expenses (planlog Phase 22).

**Plan detail:** [planlog Phase 22](./planlog.md#phase-22-accounting-module); extend `prd.md` / `prd-technical.md` when schema is fixed.

---

## Post-MVP

All **future** work: [planlog.md](./planlog.md) — Phase **20**, **21** follow-on, **22**, analytics, shortcodes, RAG, etc.

---

## Reference

| Topic | Where |
|--------|--------|
| Directory & messaging spec | [prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging) |
| Messages vs notifications wiring | [reference/messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) |
| GPUM Message Center MVP (steps) | [reference/plan-gpum-message-center-mvp.md](./reference/plan-gpum-message-center-mvp.md) + **§3 checklist** above |
| Tasks Customizer / slugs | Migration **187**; [changelog](./changelog.md) |
| Resources schema | Migration **183**; [planlog Phase 21](./planlog.md#phase-21-asset--resource-management) |
| Event exclusive-resource conflicts | [reference/event-resource-conflicts.md](./reference/event-resource-conflicts.md) |
| Resource time attribution | [reference/resource-time-attribution.md](./reference/resource-time-attribution.md) |
| Public vs admin module map | [mvt.md](./mvt.md) |
| Tenant fork setup | [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md) |
| **Accounting** (SSOT, Stripe ingest, CSV→QBO, PWA field capture) | This file — **§ Accounting (planned module)** |
