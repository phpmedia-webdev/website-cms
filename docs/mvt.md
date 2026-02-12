# MVT — Module Version Tracker

**Purpose:** (1) At-a-glance module versions and status for this fork. (2) High-level folder structure and code sitemap so you can quickly locate code (e.g. for hand tweaks). (3) Per-module boundaries, data/schema (tables, migrations, RPCs), and prerequisites — so when you drop-and-replace a module you know what code to replace and what to run or depend on.

**Travels with:** This file lives in the repo; every fork has its own copy. Update when you add, rename, or significantly change a module.

**Last updated:** 2026-02-11

---

## At a glance (module versions)

| Module       | Version | Status   |
|-------------|---------|----------|
| Content     | 1.0     | Stable   |
| CRM         | 1.0     | Stable   |
| Media       | 1.0     | Stable   |
| Galleries   | 1.0     | Stable   |
| Events      | 1.0     | Stable   |
| Settings    | 1.0     | Stable   |
| Auth / MFA  | 1.0     | Stable   |
| Superadmin  | 1.0     | Stable   |
| Public      | 1.0     | Stable   |
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
│   │   ├── members/           # Member dashboard, profile, account, Apply code
│   │   └── page.tsx           # Homepage
│   ├── admin/                 # Admin UI
│   │   ├── content/           # Content (unified list, new, [id]/edit)
│   │   ├── crm/               # Contacts, forms, lists, marketing, memberships, code-generator, omnichat
│   │   ├── dashboard/
│   │   ├── events/            # Calendar, [id]/edit, resources
│   │   ├── forms/             # Form list, [id], submissions
│   │   ├── galleries/         # List, [id], new
│   │   ├── media/
│   │   ├── settings/          # general, style, colors, fonts, content-types, content-fields, taxonomy, crm, customizer, security, profile, users
│   │   ├── super/             # Tenant sites, tenant users, roles, code-library, integrations
│   │   ├── support/
│   │   ├── login/, mfa/       # Auth
│   │   └── posts/, pages/     # Legacy redirects to content
│   └── api/                   # API routes
│       ├── admin/             # code-snippets, color-palettes, tenant-sites, tenant-users, roles, profile, membership-codes, settings
│       ├── auth/
│       ├── rag/               # knowledge (GET ?part=N) — RAG Knowledge Export
│       ├── crm/               # contacts, custom-fields, forms, lists, mags, memberships, export, bulk-*, taxonomy/bulk
│       ├── events/             # route, [id], participants, resources, public, ics, check-conflicts
│       ├── forms/[formId]/submit/
│       ├── galleries/         # route, [id], items, mags, public, styles
│       ├── media/             # [id], mags, membership-ids
│       ├── members/redeem-code/
│       ├── posts/
│       ├── settings/           # team, site-mode, snippets, crm (contact-statuses, note-types), calendar, site-metadata
│       └── webhooks/
├── components/
│   ├── admin/                 # AdminLayoutWrapper, FeatureGuard
│   ├── auth/                  # MFAChallenge, MFAEnroll, MFAManagement
│   ├── content/                # ContentEditModal, ContentEditorForm
│   ├── crm/                    # SetCrmFieldsDialog, ContactsListClient, dialogs, AddToList, RemoveFromList, TaxonomyBulk, ConfirmTrash, Export, etc.
│   ├── dashboard/             # Sidebar, StatsCard
│   ├── design-system/         # DesignSystemProvider
│   ├── editor/                 # RichTextEditor, RichTextDisplay, GalleryPickerModal, ContentWithGalleries
│   ├── events/                 # EventsCalendar, EventFormClient, EventsFilterBar, EventParticipantsResourcesTab, ResourcesListClient
│   ├── forms/                  # FormEditor, FormSubmissionsTable
│   ├── galleries/              # GalleryEditor, GalleryMediaPicker, DisplayStyleModal
│   ├── media/                  # MediaLibrary, ImageList, ImageUpload, ImagePreviewModal, MediaFilterBar, TaxonomyMultiSelect, etc.
│   ├── public/                 # GalleryEmbed, GalleryGrid, GalleryRenderer, GalleryPreviewModal, PublicHeaderAuth, PublicContentRenderer, ComingSoonSnippetView, blocks/, sections/
│   ├── settings/               # ColorsSettings, PaletteLibrary, FontsSettings, DesignSystemSettings, TaxonomySettings, ContentTypesBoard, ContentFieldsBoard, ProfileSettingsContent, SettingsUsersContent, etc.
│   ├── superadmin/             # IntegrationsManager, RolesManager, TenantFeaturesManager, TenantSiteModeCard, ViewAsCard, EditTenantAssignmentModal, RelatedTenantUsersClient
│   ├── taxonomy/               # TaxonomyAssignment, TaxonomyAssignmentForContent
│   ├── site/                   # Experiments (README)
│   └── ui/                     # shadcn primitives (button, card, dialog, input, select, etc.)
├── lib/
│   ├── admin/                  # route-features.ts, view-as.ts
│   ├── api/                    # middleware, rate-limit
│   ├── auth/                   # supabase-auth, resolve-role, mfa, session, password-policy, content-access, gallery-access
│   ├── automations/            # on-member-signup
│   ├── mags/                   # code-generator, content-protection
│   ├── media/                  # image-optimizer, storage
│   ├── shortcodes/             # gallery.ts
│   ├── supabase/               # client, content, crm, crm-taxonomy, events, galleries, galleries-server, media, settings, color-palettes, taxonomy, code-snippets, tenant-sites, tenant-users, feature-registry, profiles, members, licenses, migrations, schema, users, integrations
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
  src/app/api/crm/               # contacts (CRUD, bulk-status, bulk-delete, bulk-restore, custom-fields/bulk, export, lists, taxonomy/bulk), custom-fields, forms, lists, mags, memberships, purge-trash
  src/app/api/forms/[formId]/submit/
  src/components/crm/            # SetCrmFieldsDialog, ContactsListClient, ContactDetailClient, dialogs, etc.
  src/components/forms/          # FormEditor, FormSubmissionsTable
  src/lib/supabase/crm.ts
  src/lib/supabase/crm-taxonomy.ts
  src/lib/crm-export.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** crm_contacts, crm_contact_custom_fields, crm_custom_fields, crm_notes, crm_contact_mags, crm_marketing_lists, crm_contact_marketing_lists, forms, form_fields, form_submissions; taxonomy_relationships for content_type crm_contact.
  - **Migrations (key):** 102 (crm_contacts.deleted_at, get_contacts_dynamic/get_contact_by_id_dynamic). Plus archive migrations for CRM/forms schema.
  - **RPCs (public):** get_contacts_dynamic(schema_name), get_contact_by_id_dynamic(schema_name, contact_id); get_crm_custom_fields_dynamic (or equivalent).
- **Prerequisites:** Auth; Settings (CRM contact statuses, note types); Taxonomy; optional Membership (MAGs for contact assignment).

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
  src/components/events/        # EventsCalendar, EventFormClient, EventsFilterBar, EventParticipantsResourcesTab, ResourcesListClient
  src/lib/supabase/events.ts
  src/lib/supabase/participants-resources.ts
  src/lib/recurrence.ts
  src/lib/recurrenceForm.ts
  ```
- **Data / schema:**
  - **Tables (client schema):** events, event_exceptions, event_participants, event_resources, participants, resources (or equivalent).
  - **Migrations:** 095–101 (events tables, RPCs, cover_image, link_url, participants/resources RPCs, resource_types).
  - **RPCs (public):** get_events_dynamic, get_resources_dynamic, get_participants_dynamic, get_event_participants_dynamic, get_event_resources_dynamic, get_events_participants_bulk, get_events_resources_bulk (see 100).
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
