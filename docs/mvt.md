# MVT — Module Version Tracker

**Purpose:**

1. **Versions & status** — At-a-glance module versions for this fork.
2. **Code sitemap** — Where code lives so you can find or hand-tweak it quickly.
3. **Module boundaries** — Data/schema (tables, migrations, RPCs) and prerequisites when drop-and-replacing a module.
4. **Fork deployment & donor integration** — How this repo lines up with **CMS backend** (Supabase, env, admin) vs **client public design** ported from **donor reference** (`docs/donor-code/`). Use this to run **CMS-first** launches while design is finalized separately, then port UI into `src/app/(public)/` incrementally.

**Travels with:** This file lives in the repo; **every fork has its own copy**. Update when modules change **and** when deployment / porting / migration state changes. The **template** repo may keep placeholder rows; **client forks** fill in site-specific fields.

**Dashboard version (parsed for admin dashboard):**
**Last updated:** 2026-03-24
**App Version:** 1.0 Stable

---

## Fork deployment & donor integration

**Why:** `website-cms` is the **full base app** (public + admin + API). Public marketing pages are often built in **V0 / external Next** first — keep that output as **donor reference** under `docs/donor-code/` (not routed until ported). This section tracks **backend readiness**, **donor location**, and **porting progress** so operators and AI agents share one checklist.

**Recommended workflow**

| Phase | What |
|--------|------|
| **A — CMS trunk** | Deploy this app; configure env, tenant schema, run migrations (SQL Editor order); verify `/admin` and core backend. |
| **B — Design parallel** | Client / V0 site stays in **donor** tree or external repo; no requirement to merge until ready. |
| **C — Port** | Copy donor pages/components into `src/app/(public)/` and `src/components/public/` **route-by-route**; merge **one** root `layout` + **one** `middleware` with CMS; run `pnpm run build` after each slice. |
| **D — Media** | Move static `/public` assets into **Media Library**; update components to CMS URLs / shortcodes as documented below. |

**Do not** expect donor folders to run inside Next automatically — they are **reference** until code lives under `src/`.

### Site / deployment record

*Template repo:* use placeholders or “N/A — template”. **Client forks:** replace with real values. **No secrets** (no service role, DB password, JWT secret).

| Field | Value / notes |
|--------|----------------|
| Client / site label | |
| Primary domain | |
| Vercel project (name or link) | |
| Supabase project ref | Dashboard → Project Settings → Reference ID only |
| Tenant schema (`NEXT_PUBLIC_CLIENT_SCHEMA`) | |
| **Migrations applied through** | e.g. `194_...sql` (match SQL Editor run order) |
| Admin smoke (login → dashboard) | ☐ |
| **Donor design path** | e.g. `docs/donor-code/...` |
| Donor scope | home only / full site / key pages / components only |
| Media strategy | static `/public` / in progress / **media library** |
| Notes | |

**Detailed env + provisioning:** [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md)

### Public porting checklist (donor → live `src/`)

Check off as each slice is merged and builds green.

- [ ] Single **root** `layout` + **`middleware`** aligned with CMS (no duplicate app roots from donor).
- [ ] **Tailwind / globals** — one design token source; resolve donor vs CMS `globals.css` conflicts.
- [ ] **Homepage** `/`
- [ ] **Marketing / static routes** (list routes here as you port: e.g. `/about`, `/services`)
- [ ] **Dynamic / CMS routes** — `[slug]`, blog, forms, gallery, events (as needed)
- [ ] **Header / footer / nav** — wired to CMS or site metadata where applicable
- [ ] **Images** — critical paths moved to Media Library (or documented exceptions)

### Shared-critical paths (public + admin blast radius)

Any change here needs **extra review** and **public smoke** before production merge. See [sessionlog.md](./sessionlog.md) §5.

| Path | Why |
|------|-----|
| `middleware.ts` | Runs before most requests |
| `src/app/layout.tsx` (root) | Whole app shell |
| `src/app/(public)/layout.tsx` | Public shell |
| `src/lib/supabase/client.ts` and SSR/auth session helpers | All server data access |
| `src/lib/site-mode.ts` | Coming soon / standby / gating |
| `src/app/globals.css`, `tailwind.config.*` | Global styles |

---

## Module surface tier (public vs admin)

Use this with the **At a glance** table. **Tier** = who a regression hurts first; some modules touch both surfaces.

| Module | Tier | Notes |
|--------|------|--------|
| **Public** | Public-critical | `src/app/(public)/`, `components/public/` — visitors |
| **Content** | Mixed | Public render + admin editor |
| **Media** | Shared-critical | Storage URLs on public pages + admin library |
| **Galleries** | Mixed | Public gallery pages + admin |
| **Events** | Mixed | Public calendar + admin |
| **Forms** | Mixed | Public submit + admin builder |
| **Shop / Ecommerce** | Mixed | Public cart/checkout + admin products/orders |
| **Members** | Mixed | `/members/*` GPUM + admin membership |
| **CRM** | Admin-only* | *GPUM-facing surfaces use APIs; primary UI is admin |
| **Projects / Tasks** | Admin-only | Admin PM; member GPUM scope per planlog |
| **Settings / Customizer** | Admin-only | Tenant configuration |
| **Superadmin** | Admin-only | Cross-tenant |
| **Auth / MFA** | Shared-critical | Login flows + admin session |
| **RAG Knowledge Export** | Admin-only | Admin dashboard + API; optional training flag on content |

---

## At a glance (module versions)

| Module       | Version | Status   |
|-------------|---------|----------|
| Content     | 1.0     | Stable   |
| CRM         | 1.0     | Stable   |
| Ecommerce   | 1.0     | Stable   |
| Media       | 1.0     | Stable   |
| Galleries   | 1.0     | Stable   |
| Events      | 1.0     | Stable   |
| Settings    | 1.0     | Stable   |
| Auth / MFA  | 1.0     | Stable   |
| Superadmin  | 1.0     | Stable   |
| Public      | 1.0     | Stable   |
| Projects / Tasks | 1.0 | Stable   |
| RAG Knowledge Export | 1.0 | Stable   |

---

## Code sitemap (where code lives)

Quick reference for locating code. Expand per-module sections below for that module’s folder structure.

```
src/
├── app/
│   ├── (public)/              # Public site
│   │   ├── [slug]/            # Dynamic pages
│   │   ├── blog/              # Blog list + [slug]
│   │   ├── coming-soon/
│   │   ├── events/            # Public calendar
│   │   ├── forms/[slug]/      # Public form submit
│   │   ├── gallery/[slug]/    # Gallery page
│   │   ├── login/
│   │   ├── members/           # Member dashboard, profile, account, Apply code, orders, subscriptions
│   │   ├── shop/              # Catalog, [slug] product, cart, checkout, success, order-lookup
│   │   └── page.tsx           # Homepage
│   ├── admin/                 # Admin UI
│   │   ├── content/           # Content (unified list, new, [id]/edit)
│   │   ├── crm/               # Contacts, forms, lists, marketing, memberships, code-generator, omnichat
│   │   ├── ecommerce/         # Products (list, new, [id]/edit), Orders (list, [id], import), Subscriptions
│   │   ├── dashboard/
│   │   ├── events/            # Calendar, [id]/edit, resources
│   │   ├── forms/             # Form list, [id], submissions
│   │   ├── galleries/         # List, [id], new
│   │   ├── media/
│   │   ├── projects/          # projects list (`ProjectsListClient` + `ProjectListTable` — toolbar aligned with All Tasks; column widths/order; progress segments), **detail** (`[id]/ProjectDetailClient.tsx` — donor-style overview: stats, utilization, task progress, team; breadcrumb Activities/Projects; **Tabs** Tasks · Events · Transactions · Attachments placeholder; Share/More disabled), **All tasks** (`tasks/AllTasksListClient.tsx` — §1.1 Custom filters modal; §1.2 sort + Project group headers; §1.3 presets + **197/198** RPC; SSR matches **All Active**; master reset → recap), task new/detail/edit (bento: Resources → TaskResourcesSection); task_number TASK-YYYY-NNNNN (193+194)
│   │   ├── settings/          # general, style, colors, fonts, content-types, content-fields, taxonomy, crm, customizer (tabs: CRM, Events, Tasks, Projects, Resources, Content), events/EventsSettingsClient, security, profile, users
│   │   ├── super/             # Tenant sites, tenant users, roles, code-library, integrations
│   │   ├── support/
│   │   ├── login/, mfa/       # Auth
│   │   └── posts/, pages/     # Legacy redirects to content
│   └── api/                   # API routes
│       ├── admin/             # code-snippets, color-palettes, tenant-sites, tenant-users, roles, profile, membership-codes, settings
│       ├── auth/
│       ├── rag/               # knowledge (GET ?part=N) — RAG Knowledge Export
│       ├── crm/               # contacts, custom-fields, forms, lists, mags, memberships, export, bulk-*, taxonomy/bulk
│       ├── events/             # route, [id], participants, resources (+ **usage** analytics), **bundles** (+ [id], [id]/items), public, ics, check-conflicts
│       ├── forms/[formId]/submit/
│       ├── ecommerce/         # products ([id]/sync-stripe, [id]/link-stripe), orders, orders/[id], orders/metrics, subscriptions, stripe-drift, stripe-drift/import, stripe-drift/bulk-import, stripe-drift/update, stripe-sync-customers, stripe-sync-orders, woo-sync, woo-sync/csv, import-orders, export/orders, export/formats
│       ├── galleries/         # route, [id], items, mags, public, styles
│       ├── media/             # [id], mags, membership-ids
│       ├── members/           # orders, orders/[id], subscriptions, subscriptions/portal, redeem-code
│       ├── shop/              # cart, cart/count, cart/items, products, products/[slug], checkout, checkout/validate-code, order-lookup, download
│       ├── posts/
│       ├── settings/           # team, site-mode, snippets, crm (contact-statuses, note-types), calendar, site-metadata
│       ├── tasks/              # **GET /** admin bundle (`get_tasks_dynamic` — **197** archived projects; **198** `exclude_status_slugs` + `due_before` for All Tasks presets), [id] (GET/PUT/DELETE), [id]/followers, [id]/time-logs, [id]/notes, **[id]/resources** (GET/POST/DELETE — task_resources)
│       └── webhooks/          # stripe (checkout, subscription, invoice)
├── components/
│   ├── admin/                 # AdminLayoutWrapper, FeatureGuard
│   ├── auth/                  # MFAChallenge, MFAEnroll, MFAManagement
│   ├── content/                # ContentEditModal, ContentEditorForm
│   ├── crm/                    # SetCrmFieldsDialog, ContactsListClient, dialogs, AddToList, RemoveFromList, TaxonomyBulk, ConfirmTrash, Export, etc.
│   ├── ecommerce/              # ProductDetailsForm (admin product form)
│   ├── dashboard/             # Sidebar, StatsCard
│   ├── design-system/         # DesignSystemProvider
│   ├── editor/                 # RichTextEditor, RichTextDisplay, GalleryPickerModal, ContentWithGalleries
│   ├── events/                 # EventsCalendar, EventFormClient, EventsFilterBar, EventParticipantsResourcesTab, resource-manager (ResourceManagerClient, ResourceUsageAnalyticsTab, …)
│   ├── forms/                  # FormEditor, FormSubmissionsTable
│   ├── galleries/              # GalleryEditor, GalleryMediaPicker, DisplayStyleModal
│   ├── media/                  # MediaLibrary, ImageList, ImageUpload, ImagePreviewModal, MediaFilterBar, TaxonomyMultiSelect, etc.
│   ├── public/                 # GalleryEmbed, GalleryGrid, GalleryRenderer, GalleryPreviewModal, PublicHeaderAuth, PublicContentRenderer, ComingSoonSnippetView, blocks/, sections/
│   ├── settings/               # ColorsSettings, PaletteLibrary, FontsSettings, DesignSystemSettings, TaxonomySettings, ContentTypesBoard, ContentFieldsBoard, ProfileSettingsContent, SettingsUsersContent, etc.
│   ├── superadmin/             # IntegrationsManager, RolesManager, TenantFeaturesManager, TenantSiteModeCard, ViewAsCard, EditTenantAssignmentModal, RelatedTenantUsersClient
│   ├── tasks/                  # TaskBentoPanelTitle, TaskResourcesSection (picker: calendar-schedulable OR task-schedulable; modal UX), TaskTermSelectItems
│   ├── taxonomy/               # TaxonomyAssignment, TaxonomyAssignmentForContent, TermBadge (rounded-md chip, truncates in tables)
│   ├── site/                   # Experiments (README)
│   └── ui/                     # shadcn primitives (button, card, dialog, input, select, etc.)
├── lib/
│   ├── admin/                  # route-features.ts, view-as.ts
│   ├── api/                    # middleware, rate-limit
│   ├── auth/                   # supabase-auth, resolve-role, mfa, session, password-policy, content-access, gallery-access
│   ├── automations/            # on-member-signup
│   ├── mags/                   # code-generator, content-protection
│   ├── media/                  # image-optimizer, storage
│   ├── shop/                   # cart, cart-cookie, orders, order-address, order-download-links, order-email, coupon, payment-to-mag, viewer (products), stripe-drift, stripe-customers-sync, stripe-orders-sync, woo-commerce-sync, import-orders-csv, export-orders, subscriptions, subscription-email, download-token
│   ├── shortcodes/             # gallery.ts
│   ├── tasks/                  # customizer-task-terms, merge-task-customizer-colors, **task-resources-api** (client fetch helpers for /api/tasks/[id]/resources)
│   ├── resources/              # **resource-usage-analytics** (dynamic event + task usage estimates for admin)
│   ├── supabase/               # client, content, crm, crm-taxonomy, events, galleries, galleries-server, media, settings, color-palettes, taxonomy, code-snippets, tenant-sites, tenant-users, feature-registry, profiles, members, licenses, migrations, schema, users, integrations, projects
│   ├── design-system.ts
│   ├── site-mode.ts
│   ├── recurrence.ts
│   ├── recurrenceForm.ts
│   ├── crm-export.ts
│   ├── rag.ts                 # RAG assembly, token estimate, segment split (Knowledge Export)
│   └── donor/                  # README (paste snippet code for AI)
└── types/                      # Shared types
```

---

## Per-module detail

When you drop a new version of a module, replace the listed code paths and run the listed migrations; ensure prerequisites are met.

---

### Content

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/content/          # ContentPageClient, new, [id]/edit
  src/app/admin/posts/            # Legacy redirects to content?type=post
  src/app/admin/pages/            # Legacy redirects to content?type=page
  src/app/(public)/blog/          # Blog list, [slug]
  src/app/api/posts/              # GET list, [id]
  src/components/content/        # ContentEditModal, ContentEditorForm
  src/components/editor/          # RichTextEditor, RichTextDisplay, GalleryPickerModal, ContentWithGalleries
  src/components/public/content/  # PublicContentRenderer
  src/lib/supabase/content.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** content, content_types, content_type_fields, taxonomy_relationships; pages/posts may be views or content type. See migrations in `supabase/migrations/` and `supabase/migrations/archive/` (content-related).
  - **RPCs:** Schema-aware content reads as used by app.
- **Prerequisites:** Settings (content types, content fields); Auth (admin routes); Taxonomy (categories/tags).

---

### CRM

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/crm/             # contacts, forms, lists, marketing, memberships, code-generator, omnichat
  src/app/api/crm/               # contacts (CRUD, bulk-status, bulk-delete, bulk-restore, custom-fields/bulk, export, lists, taxonomy/bulk), custom-fields, forms, lists, mags, memberships, purge-trash; contacts/[id]/notifications-timeline (Phase 18C)
  src/app/api/conversation-threads/   # POST; [threadId]/messages GET|POST (Phase 18C)
  src/app/api/forms/[formId]/submit/
  src/components/crm/            # SetCrmFieldsDialog, ContactsListClient, ContactDetailClient, ContactNotificationsTimelineSection, ContactNotesSection, dialogs, etc.
  src/components/forms/          # FormEditor, FormSubmissionsTable
  src/lib/supabase/crm.ts
  src/lib/supabase/contact-notifications-timeline.ts
  src/lib/supabase/conversation-threads.ts
  src/lib/supabase/blog-comment-messages.ts   # blog comments → thread_messages (not crm_notes)
  src/lib/supabase/crm-taxonomy.ts
  src/lib/crm-export.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** crm_contacts, crm_contact_custom_fields, crm_custom_fields, crm_notes, crm_contact_mags, crm_marketing_lists, crm_contact_marketing_lists, forms, form_fields, form_submissions; taxonomy_relationships for content_type crm_contact. crm_notes supports note_type = 'message' with recipient_contact_id (null = support), parent_note_id (threading).
  - **Phase 18C:** Tables **190–191**; **192** (one blog thread per content); libs **`contact-notifications-timeline.ts`**, **`conversation-threads.ts`**, **`blog-comment-messages.ts`**; routes **notifications-timeline** + **conversation-threads** + **`/api/blog/comments`** (see prd-technical §18C, [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md)). Merged GPUM stream + UI still planned.
  - **Migrations (key):** 102 (crm_contacts.deleted_at, get_contacts_dynamic/get_contact_by_id_dynamic); 139 (crm_notes recipient_contact_id, parent_note_id; get_contact_notes_dynamic return cols). **190–192** notifications timeline + threads + blog thread unique. Plus archive migrations for CRM/forms schema.
  - **RPCs (public):** get_contacts_dynamic(schema_name), get_contact_by_id_dynamic(schema_name, contact_id); get_crm_custom_fields_dynamic (or equivalent).
- **Prerequisites:** Auth; Settings (CRM contact statuses, note types); Taxonomy; optional Membership (MAGs for contact assignment).

---

### Ecommerce

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/ecommerce/           # Products (list, new, [id]/edit), Orders (list, [id], import), Subscriptions
  src/app/(public)/shop/              # Catalog, [slug] product, cart, checkout, success, order-lookup
  src/app/(public)/members/orders/   # Member order list, [id] detail
  src/app/(public)/members/subscriptions/  # Member subscriptions list + Stripe Portal link
  src/app/api/ecommerce/             # products ([id]/sync-stripe, [id]/link-stripe), orders, orders/[id], orders/metrics, subscriptions, stripe-drift (import, bulk-import, update), stripe-sync-customers, stripe-sync-orders, woo-sync, woo-sync/csv, import-orders, export/orders, export/formats
  src/app/api/shop/                  # cart, cart/count, cart/items, products, products/[slug], checkout, checkout/validate-code, order-lookup, download
  src/app/api/members/orders/         # GET list, GET [id] (member orders)
  src/app/api/members/subscriptions/ # GET list, POST portal (Stripe Customer Portal)
  src/app/api/webhooks/stripe/       # checkout.session.completed, subscription.*, invoice.paid / invoice.payment_failed
  src/components/ecommerce/         # ProductDetailsForm
  src/lib/shop/                      # cart, cart-cookie, orders, order-address, order-download-links, order-email, coupon, payment-to-mag, viewer (products), stripe-drift, stripe-customers-sync, stripe-orders-sync, woo-commerce-sync, import-orders-csv, export-orders, subscriptions, subscription-email, download-token
  ```
- **Data / schema:**
  - **Tables (client schema):** Product = content (type product) + `product` table (content_id, price, currency, stripe_product_id, stripe_price_id, taxable, shippable, downloadable, digital_delivery_links, grant_mag_id, is_recurring, billing_interval, etc.). `cart_sessions`, `cart_items`; `orders` (customer_email, contact_id, user_id, status, total, currency, stripe_checkout_session_id, stripe_invoice_id, woocommerce_order_id, billing_snapshot, shipping_snapshot, coupon_code, coupon_batch_id, discount_amount); `order_items` (order_id, content_id, name_snapshot, quantity, unit_price, line_total, shippable, downloadable); `subscriptions` (stripe_subscription_id, stripe_customer_id, contact_id, user_id, product/content_id, status, current_period_end). Coupons reuse `membership_code_batches` (purpose discount) and `membership_codes`.
  - **Migrations (key):** 131 (cart_sessions, cart_items), 132 (orders, order_items), 133 (product grant_mag_id), 136 (product downloadable, digital_delivery_links; order_items downloadable), 137 (product is_recurring, billing_interval, stripe_price_id), 138 (subscriptions table, orders.stripe_invoice_id), 140 (orders.woocommerce_order_id). **194:** `number_sequences.sequence_year` — invoice/order `INV-YYYY-NNNNN` counter resets Jan 1 UTC. Archive **142** (`number_sequences`, `get_next_invoice_order_number`). Content type “product” and product table in earlier migrations (see archive/126, 128 if applicable).
  - **RPCs:** No Ecommerce-specific public RPCs; app uses Supabase client with schema (getClientSchema()) for orders, order_items, product, cart, subscriptions.
- **Prerequisites:** Content (product content type); Auth (checkout requires sign-in; admin routes gated); CRM (contact_id on orders; getContactByEmail, getContactById for address/export); Settings (Stripe env keys, webhook secret). Optional: Membership (MAGs for product visibility, grant_mag_id for membership products); coupon batches with purpose discount.

---

### Media

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/media/           # Media library page
  src/app/api/media/             # [id], mags, membership-ids
  src/components/media/          # MediaLibrary, ImageList, ImageUpload, ImagePreviewModal, MediaFilterBar, TaxonomyMultiSelect, etc.
  src/lib/supabase/media.ts
  src/lib/media/                 # image-optimizer, storage
  ```
- **Data / schema:**
  - **Tables (client schema):** media, media_variants; storage bucket per client. MAG assignment (e.g. media_mags or junction).
  - **Migrations:** 094 (media_mags if present); plus archive for media table/schema.
- **Prerequisites:** Auth; Settings; Taxonomy; Storage bucket created for client schema.

---

### Galleries

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/galleries/       # List, [id], new
  src/app/(public)/gallery/[slug]/
  src/app/api/galleries/         # route, [id], items, mags, public, styles
  src/components/galleries/      # GalleryEditor, GalleryMediaPicker, DisplayStyleModal
  src/components/public/media/   # GalleryEmbed, GalleryGrid, GalleryRenderer, GalleryPreviewModal, GalleryPageClient, GallerySlider, GalleryMasonry
  src/lib/supabase/galleries.ts
  src/lib/supabase/galleries-server.ts
  src/lib/shortcodes/gallery.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** galleries, gallery_items; MAG assignment for galleries; taxonomy if used.
  - **Migrations:** See archive and active migrations for galleries.
- **Prerequisites:** Media module; Auth; optional Membership (MAG protection).

---

### Events

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/events/          # EventsPageClient, EventFormClient, new, [id]/edit, resources
  src/app/(public)/events/      # Public calendar, PublicCalendarPageClient
  src/app/api/events/            # route, [id], participants, resources, public, ics, check-conflicts, assignments
  src/app/api/directory/         # GET — unified CRM + team picker (Phase 18C)
  src/components/events/        # EventsCalendar, AgendaWithDescription, EventFormClient, EventsFilterBar, EventParticipantsResourcesTab, ResourceAssignmentsRollupList, resource-manager (ResourceManagerClient, ResourcesRegistryTab, BundlesTab)
  src/lib/supabase/events.ts
  src/lib/supabase/directory.ts  # searchDirectoryEntries → get_directory_search_dynamic
  src/lib/supabase/participants-resources.ts
  src/lib/events/resource-picker-groups.ts   # Bundles/Resources AutoSuggest groups + Customizer type labels
  src/lib/recurrence.ts
  src/lib/recurrenceForm.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** events, event_exceptions, event_participants, event_resources (incl. **`bundle_instance_id`** after **195**), task_resources, resource_bundles, resource_bundle_items, participants, resources (or equivalent).
  - **Migrations:** 095–101 (events tables, RPCs, cover_image, link_url, participants/resources RPCs, resource_types); **183** (resource schedulability + asset fields); **195** (`task_resources`, bundles, `bundle_instance_id` on event/task assignments, RPC updates — run in SQL Editor); **196** (`get_resources_dynamic` + optional **`picker_context`** aligned with **`?context=calendar|task`** — run in SQL Editor).
  - **RPCs (public):** get_events_dynamic, **get_resources_dynamic(schema_name, picker_context)** (NULL = registry; calendar \| task = picker filter — **196**), get_participants_dynamic, get_event_participants_dynamic, **get_event_resources_dynamic** / **get_events_resources_bulk** (return **`bundle_instance_id`** after **195**), get_events_participants_bulk; **get_task_resources_dynamic**, **get_resource_bundles_dynamic**, **get_resource_bundle_items_dynamic** (**195**); **get_directory_search_dynamic** (**188** + **189**).
- **API behavior:** `POST /api/events` assigns the authenticated creator to the new event as a `team_member` participant (`ensureParticipant` + `assignParticipantToEvent` in `route.ts`); assignment failure does not fail the create.
- **Resources (MVP plan):** Registry + `event_resources`; **`task_resources`** + **`GET/POST/PUT/DELETE /api/tasks/[id]/resources`** (enriched list; **PUT** replaces assignments on task save); admin hub **`/admin/events/resources`** (tabs: Resources, Bundles, **Analytics**); **`GET /api/events/resources`** / **`GET /api/events/bundles`** — optional **`?context=calendar|task`** for picker rows (**183** + archive/retired); **`POST /api/events/check-conflicts`** — optional **`resource_ids`**; **`getResourceConflicts`** (**exclusive** `resources` vs overlapping events); **`GET /api/events/resources/usage`** + **`resource-usage-analytics.ts`** — see [resource-time-attribution.md](./reference/resource-time-attribution.md); **Activities → Resources** sidebar tooltip (`sidebar-config` **`description`**). Picker UX — [sessionlog.md](./sessionlog.md) § **2**. **Calendar hover:** admin + public — native **`title`** on events (month/week/day/agenda); admin includes **Resources:** line via **`GET /api/events/assignments`** **`resourceNamesByEvent`** + `calendar-event-hover.ts`.
- **Prerequisites:** Auth; Settings (calendar resource types in customizer); CRM (for participant type crm_contact).

---

### Settings

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/settings/        # general, style, colors, fonts, content-types, content-fields, taxonomy, crm, customizer, security, profile, users
  src/app/api/admin/color-palettes/
  src/app/api/settings/          # team, site-mode, snippets, crm (contact-statuses, note-types), calendar (resource-types), site-metadata
  src/components/settings/       # ColorsSettings, PaletteLibrary, FontsSettings, DesignSystemSettings, TaxonomySettings, ContentTypesBoard, ContentFieldsBoard, CrmSettingsClient, CalendarSettingsClient, ProfileSettingsContent, SettingsUsersContent, etc.
  src/lib/supabase/settings.ts
  src/lib/supabase/color-palettes.ts
  src/lib/supabase/taxonomy.ts
  src/lib/design-system.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** settings (key/value); color_palettes (in client schema per current design); taxonomy_terms, taxonomy_sections, taxonomy_relationships; content_types, content_type_fields.
  - **Public RPCs:** get_color_palettes, get_predefined_color_palettes, get_custom_color_palettes, get_color_palette_by_id, create_color_palette, update_color_palette, delete_color_palette (reference client schema via search_path or param).
  - **Migrations:** Archive (color_palettes, taxonomy, settings); active as needed.
- **Prerequisites:** Auth. Settings is foundational for Content, CRM, Events (design system, taxonomy, CRM statuses, calendar config).

---

### Auth / MFA

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/login/           # Login, forgot, reset-password
  src/app/admin/mfa/            # challenge, enroll
  src/app/(public)/login/
  src/app/auth/callback/        # Auth callback page
  src/app/api/auth/             # callback, login
  src/components/auth/          # MFAChallenge, MFAEnroll, MFAManagement
  src/lib/auth/                 # supabase-auth, resolve-role, mfa, session, password-policy, content-access, gallery-access
  src/lib/supabase/client.ts
  middleware.ts                 # Auth/session handling
  ```
- **Data / schema:**
  - **Supabase Auth:** auth.users, sessions (managed by Supabase). No client-schema auth tables required for basic auth.
  - **Public tables:** tenant_sites, tenant_users, tenant_user_assignments, feature_registry, tenant_features (for resolve-role and effective features).
  - **Migrations:** 091 (RLS public tables); 081–086 (feature_registry, tenant tables).
- **Prerequisites:** Supabase project with Auth enabled. MFA uses TOTP (AAL2).
- **Product spec (forks):** Tiered login/register/email copy and enumeration-safe messaging — [prd.md — Shared identity UX (forks)](./prd.md#shared-identity-ux-forks); tasks in [planlog.md](./planlog.md) Phase 00.

---

### Superadmin

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/admin/super/           # Dashboard, tenant-sites, tenant-users, roles, code-library, integrations
  src/app/api/admin/             # code-snippets, tenant-sites, tenant-users, roles, profile, membership-codes, settings (design-system), integrations
  src/components/superadmin/     # IntegrationsManager, RolesManager, TenantFeaturesManager, TenantSiteModeCard, ViewAsCard, EditTenantAssignmentModal, RelatedTenantUsersClient
  src/lib/supabase/code-snippets.ts
  src/lib/supabase/tenant-sites.ts
  src/lib/supabase/tenant-users.ts
  src/lib/supabase/feature-registry.ts
  src/lib/supabase/integrations.ts
  src/lib/site-mode.ts
  ```
- **Data / schema:**
  - **Public tables:** tenant_sites, tenant_users, tenant_user_assignments, feature_registry, tenant_features, admin_roles, code_snippets (public.code_snippets).
  - **Migrations:** 080 (code_snippets if in archive); 081–093 (feature_registry, tenant_sites, tenant_users, tenant_features, RLS, tenant_sites columns).
- **Prerequisites:** Auth (superadmin role and 2FA). Superadmin-only routes.

---

### RAG Knowledge Export

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/api/rag/              # knowledge route (GET ?part=N)
  src/app/admin/dashboard/      # Dashboard page — RAG metric widget + multi-URL info box
  src/lib/rag.ts                 # Assembly (fetch content, Tiptap→text, segment by token limit), token/size helpers
  ```
- **Data / schema:**
  - **Content table (client schema):** Add column `use_for_agent_training` boolean DEFAULT false. No separate RAG “page” tables; segments are computed at request time.
  - **Migrations:** New migration in client schema: `ALTER TABLE content ADD COLUMN use_for_agent_training boolean DEFAULT false;` (and any RPC updates if content is read via RPC).
- **Packing (design):** When implementing article-based packing: keep whole articles in one URL; **FAQ content type must never be split between URLs** (each FAQ doc is one atomic segment).
- **Prerequisites:** Content module (content table, content types, Tiptap body). Uses existing content read paths; RAG endpoint may need schema-aware content fetch (same as admin content list filtered by flag).

---

### Public

- **Version:** 1.0
- **Folder structure (where to find / replace code):**
  ```
  src/app/(public)/              # layout, page (home), [slug], blog, gallery/[slug], events, forms/[slug], login, members, coming-soon
  src/components/public/         # Gallery*, PublicHeaderAuth, PublicHeaderMembersNav, PublicContentRenderer, ComingSoonSnippetView, layout/, sections/, blocks/
  src/lib/site-mode.ts           # Coming soon / standby
  ```
- **Data / schema:** No dedicated Public-only tables. Uses Content, Galleries, Events, Settings (site metadata, design system), Auth (members), CRM (forms submit).
- **Prerequisites:** Content, Galleries, Events, Settings, Auth (for member routes). Public layout and design tokens from Settings.

---

## Shared / cross-cutting

- **Paths:** `src/components/ui/` (shadcn), `src/components/admin/` (AdminLayoutWrapper, FeatureGuard), `src/components/dashboard/` (Sidebar), `middleware.ts`, `src/lib/api/`, `src/types/`. Keep shared code minimal and stable.
- When updating a module, avoid changing shared code unless the change is required for that module; prefer module-local changes.
- **Donor code:** `docs/donor-code/` — reference snapshots for AI / human porting; not part of the runtime app until merged into `src/`. See **Fork deployment & donor integration** above.
- **Pre-fork / MVP alignment:** [sessionlog.md](./sessionlog.md) §5 — keep this MVT section accurate as the template approaches fork-ready MVP.
