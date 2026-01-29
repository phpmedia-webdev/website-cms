# Technical Reference - Website CMS

This document contains all technical implementation details, patterns, and solutions discovered during development. This is a living document that grows as we discover new solutions.

**For product requirements and business logic, see [prd.md](./prd.md).**

---

## Table of Contents

1. [Database Architecture & Schema Management](#1-database-architecture--schema-management)
2. [Database Schema Reference](#2-database-schema-reference)
3. [Client Setup Process](#3-client-setup-process)
4. [Development Patterns & Solutions](#4-development-patterns--solutions)  
   - [Taxonomy Integration for New Content Types](#taxonomy-integration-for-new-content-types)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Authentication & Security](#6-authentication--security)
7. [Testing & Troubleshooting](#7-testing--troubleshooting)

---

## 1. Database Architecture & Schema Management

### Multi-Schema Strategy

Each client deployment uses a dedicated Supabase schema (e.g., `client_abc123`) for complete data isolation. All tables, RPC functions, and storage buckets are scoped to the client schema.

**Key Points:**
- Schema name stored in `NEXT_PUBLIC_CLIENT_SCHEMA` environment variable
- Tables must be schema-qualified: `website_cms_template_dev.table_name`
- Storage buckets follow pattern: `client-{schema-name}`
- RPC functions are in `public` schema but query custom schemas

### Schema Setup

**Exposing Custom Schema to PostgREST:**

1. **Dashboard Configuration:**
   - Go to Supabase Dashboard → Settings → API → Exposed Schemas
   - Add your custom schema name (e.g., `website_cms_template_dev`)
   - Save changes

2. **Grant Permissions:**
   - Run migration: `supabase/migrations/004_expose_schema_permissions.sql`
   - Grants USAGE on schema to `anon` and `authenticated`
   - Grants SELECT/INSERT/UPDATE/DELETE on all tables
   - Sets default privileges for future tables

3. **Refresh PostgREST Cache:**
   - Run: `NOTIFY pgrst, 'reload schema';`
   - Or restart Supabase project

**Important:** When schema is exposed, PostgREST searches all exposed schemas. Use just table name (e.g., `"settings"`) in queries - do NOT use `schema.table` format.

### Adding New Tables to Custom Schema

**The Problem:** PostgREST cannot find tables in custom schemas even if exposed, due to schema caching. This affects any table added after initial setup.

**The Solution:** Use RPC functions in `public` schema that query your custom schema. This bypasses PostgREST's schema search entirely.

**Complete Checklist:**

**Step 1: Create Table Migration**
- File: `supabase/migrations/XXX_create_your_table.sql`
- Table created with schema-qualified name: `website_cms_template_dev.your_table`
- Permissions granted: `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO anon, authenticated;`
- Indexes and triggers created as needed

**Step 2: Enable RLS**
- File: `supabase/migrations/XXX_enable_rls_your_table.sql`
- RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Policy for `authenticated` users (full access)
- Policy for `anon` users (if needed, adjust USING clause)
- All policies use schema-qualified table name

**Step 3: Create RPC Functions (CRITICAL)**
- File: `supabase/migrations/XXX_create_your_table_rpc.sql`
- Functions created in `public` schema (not custom schema)
- Functions use `SECURITY DEFINER`
- Functions use `SET search_path = public, website_cms_template_dev` ⚠️ **CRITICAL: public must be FIRST** (prevents injection AND recursion)
- Functions query custom schema table: `FROM website_cms_template_dev.your_table`
- Return type matches table columns exactly
- Execute permissions granted:
  - Public data: `GRANT EXECUTE ... TO anon, authenticated;`
  - Sensitive data: `GRANT EXECUTE ... TO authenticated;` (NOT anon)

**Functions to create:**
- `get_all_your_tables()` - Returns all records
- `get_your_table_by_id(UUID)` - Returns single record
- Additional functions as needed (filtered, search, etc.)

**Step 4: Update TypeScript Code**
- File: `src/lib/supabase/your-table.ts`
- Read operations use `.rpc()` not `.from()`
- Write operations try `.from()` first
- If `.from()` fails with "table not found", create RPC functions for writes
- Error handling includes detailed logging
- Types match table structure

**Step 5: Verify Setup**
- Schema is exposed in Dashboard
- Table exists: `SELECT * FROM website_cms_template_dev.your_table LIMIT 1;`
- RPC functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_%your_table%';`
- RPC functions work: `SELECT * FROM public.get_all_your_tables();`

**Why This Works:**
1. RPC functions are in `public` schema → PostgREST always finds them
2. Functions use `SET search_path` → PostgreSQL searches custom schema
3. `SECURITY DEFINER` → Function runs with elevated privileges
4. Bypasses PostgREST schema search → No more "table not found" errors

**Security Notes:**
- RLS policies still apply (evaluated for caller, not function owner)
- `SET search_path` prevents search path injection
- Typed parameters prevent SQL injection
- Execute permissions granted only to necessary roles

**Examples:** `settings` table, `color_palettes` table, `media` table all use this pattern.

**Troubleshooting:**
- "Could not find the table 'public.your_table'" → Verify using RPC functions, check RPC functions exist, verify schema exposed
- "Could not find the function 'public.get_your_table'" → Run RPC migration again, check function exists in public schema
- RPC Function Returns Empty Array → Check RLS policies, test function SQL directly

---

## 2. Database Schema Reference

### Core Content Tables

**Content Model (Unified Single-Table Storage)**

All text-based content types (posts, pages, snippets, quotes, articles, custom) share one table. This replaces separate `posts` and `pages` tables.

**Content Table:**
- `id`, `content_type_id` (FK → `content_types`), `title`, `slug`, `body` (Tiptap JSONB), `excerpt`, `featured_image_id`
- Metadata: `status` (placeholder/draft/published/archived), `published_at`, `author_id`
- Access control: `access_level`, `required_mag_id`, `visibility_mode`, `restricted_message`
- `custom_fields` (JSONB): type-specific field values keyed by field `key` from `content_type_fields`
- Optional: `section_restrictions` (JSONB) for page-level section access
- Indexes: `content_type_id`, `slug`, `status`, `published_at`; unique `(content_type_id, slug)` per type if needed

**Content Types Table:**
- `id`, `slug` (unique, e.g. `post`, `page`, `snippet`, `quote`, `article`, `portfolio`, `properties`), `label`, `description`, `is_core` (boolean), `display_order`
- Core types are seeded; custom types added via Settings → Content Types.

**Content Type Fields Table:**
- `id`, `content_type_id` (FK → `content_types`), `key`, `label`, `type`, `config` (JSONB), `display_order`
- Each field applies to **one** content type. Values stored in `content.custom_fields[key]`.
- Managed via Settings → Content Fields.

**Taxonomy:** Use `taxonomy_relationships` with `content_type` = `content_types.slug` and `content_id` = `content.id` for content rows. Media and galleries continue to use `content_type` `'media'` / `'gallery'` and their own table IDs.

**Migration note:** Existing `posts` data will be migrated into `content` with appropriate `content_type_id`. No separate `pages` table; pages live in `content`.

**Media Table:**
- Metadata: name, slug, description, alt_text
- Original file: original_filename, original_format, original_size_bytes, original_width, original_height, mime_type
- Status: placeholder/published/archived
- Related: `media_variants` table stores optimized variants (thumbnail, small, medium, large)

**Media Variants Table:**
- Links to media via `media_id` (CASCADE delete)
- Variant types: original, thumbnail, small, medium, large
- Storage: url, storage_path, format (webp for variants), width, height, size_bytes
- Unique constraint: one variant type per media

**Galleries Table:**
- Content: name, slug, description
- Access Control: access_level, required_mag_id, visibility_mode, restricted_message
- Related: `gallery_items` table for gallery images

**Events Table (calendar dual purpose):**
- **Public events:** Published events (e.g. webinars) shown with full details on the public calendar and ICS feed.
- **Scheduling/booking backend:** Private meetings use the same calendar; full details only in admin; public API exposes only time blocks as unavailable (no title/details). Free-busy and booking flows respect both public events and private meetings.
- Event details: title, description, start_date, end_date, location
- Recurrence: recurrence_pattern (JSONB), timezone
- Access Control: access_level, required_mag_id; visibility (e.g. public vs private) determines what is exposed to the public calendar

### Taxonomy Tables

**Categories Table:**
- Hierarchical: parent_id (self-referencing), name, slug, description
- Section-scoped: section_id (optional, for filtering)
- Order: display_order

**Tags Table:**
- Flat structure: name, slug, description
- Section-scoped: section_id (optional, for filtering)

**Section Taxonomy Config:**
- Links sections to taxonomy usage
- Configures which sections use categories/tags

### Membership & Access Control

**MAGs (Membership Access Groups) Table:**
- Fields: code (unique shortcode), name, slug, description, tier (hierarchical access)
- Ecommerce: ecommerce_tag, auto_assign_on_payment
- Default message for restricted content

**Members Table:**
- Extends auth.users via `id` reference
- Fields: email, display_name, status (active/inactive/suspended)
- CASCADE delete with auth.users

**User MAGs Table:**
- Junction table: member_id → mag_id
- Optional expiration: expires_at
- Assignment tracking: assigned_via (manual/webhook/api)

### CRM Tables

**Contacts Table:**
- Basic info: email, first_name, last_name, phone, company
- Status: status (lead/contact/customer), tags (array), notes
- DND: do_not_contact flag
- Custom fields: custom_fields (JSONB)

**Companies Table:**
- Company info: name, website, industry, size
- Related: contacts linked via company_id

**Consents Table:**
- Consent tracking: contact_id, consent_type, granted_at, withdrawn_at
- GDPR compliance: records consent history

**Form Submissions Table:**
- Submission data: form_id, contact_id, data (JSONB), submitted_at
- Status: status (new/processed/archived)

### Settings & Configuration

**Settings Table:**
- Key-value store: key (unique), value (JSONB)
- Namespaced keys: `design_system.theme`, `design_system.colors`, `site.name`, etc.
- Accessed via RPC functions: `get_setting(key)`, `get_settings(keys[])`

**Color Palettes Table:**
- Palette data: name, description, colors (JSONB - 15 colors), tags
- Types: is_predefined (global presets) or custom (per-tenant)
- Used by design system for color selection

**Integrations Table:**
- Third-party integrations: name (google_analytics, visitor_tracking, simple_commenter)
- Configuration: enabled flag, config (JSONB) for vendor-specific settings

**SimpleCommenter (simple_commenter) — development/client feedback tool:**
- **Purpose:** Clients add pinpoint annotations and comments on the site during development or staging so developers can implement changes accurately. **Not** a blog or article comment system.
- **Config:** `domain` (e.g. staging or project domain). Script: `https://simplecommenter.com/js/comments.min.js?domain={domain}`.
- **When to enable:** Dev/staging only. **Disable in production.**
- **Script injection:** Public layout loads the script when `simple_commenter` is enabled and `config.domain` is set. Uses `strategy="lazyOnload"`.
- **Blog comments:** A separate feature (native or third-party) if ever needed. SimpleCommenter is unrelated.

### Archive & Lifecycle

**Archived Projects Table (public schema):**
- Registry: schema_name, client_name, archived_at, notes
- Tracks archived client schemas for restoration

### Component Library (Superadmin)

**Component Library Table:**
- Component metadata: name, library_entry_id, file_path, import_path
- Categorization: category, theme, location (public/site/ui)
- Documentation: description, props_schema, usage_examples, dependencies
- Visual: screenshot_url, wireframe_url, preview_images
- Development: development_status, is_linked_to_file, assigned_to

---

## 3. Client Setup Process

### Automated Setup (Recommended)

**Command:**
```bash
pnpm setup-client <schema-name>
```

**What it does:**
- Creates the schema
- Runs all migrations (with schema name replacement)
- Grants permissions
- Creates RPC functions
- Inserts default settings
- Enables RLS and policies
- Creates storage bucket
- Refreshes PostgREST cache

**After running script:**
1. Expose schema in Supabase Dashboard (Settings → API → Exposed Schemas)
2. Set environment variables
3. Create superadmin user
4. Deploy application

**Note:** Script uses `exec_sql` RPC which may not be available in all Supabase projects. If script fails, use manual steps below or `docs/archived/zzz-CLIENT_SETUP_CHECKLIST.md`.

### Manual Setup Steps

**Step 1: Create Client Schema**
- Run: `CREATE SCHEMA IF NOT EXISTS client_acme_corp;`
- Schema names must use underscores, not hyphens

**Step 2: Run Migrations**
Migrations `000`–`022` are in `supabase/migrations/archive/`. Current migrations (`023`+) include taxonomy, media, and storage.

**Option A – Use setup script (recommended):** `pnpm setup-client <schema-name>` runs 026, 027, 038 (media + RPC) and creates the storage bucket. It does not run archived or taxonomy migrations.

**Option B – Manual:** Run migrations in order. For template-like setup:
- Archived (if needed): from `archive/` — 000, 004, 008, 009, 010, 011, etc.
- Current: 023–025 (taxonomy), 026–027 (media tables + RLS), 038 (media RPCs — consolidates 028, 031, 034, 036, 037), 039 (storage bucket policies).

Replace `website_cms_template_dev` with your client schema name in all migrations.

**Step 3: Expose Schema**
- Dashboard → Settings → API → Exposed Schemas
- Add client schema name
- Run: `NOTIFY pgrst, 'reload schema';`

**Step 4: Create Storage Bucket**
- Dashboard → Storage
- Create bucket: `client-{schema_name}`
- Set to Public (if needed)
- **IMPORTANT:** Configure RLS policies — run `039_setup_storage_bucket_policies.sql` (edit `bucket_name` if needed) or use Dashboard (see Storage Bucket Policies section below)

**Step 5: Configure Environment Variables**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLIENT_SCHEMA=client_acme_corp`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_NAME`

**Step 6: Create Superadmin User**
- Dashboard → Authentication → Users
- Update user metadata with `type: 'superadmin'`, `role: 'superadmin'`, `tenant_id: 'client_acme_corp'`

**Step 7: Deploy Application**
- Push code to repository
- Deploy to Vercel (or platform)
- Set environment variables
- Verify deployment

**Step 8: Verify Setup**
- Test authentication
- Test design system loading
- Test database access

**Step 9: Post-Setup Configuration**
- Configure design system (fonts, colors)
- Configure third-party integrations
- Set up 2FA

### Schema Name Replacement

When setting up new client, replace `website_cms_template_dev` with client schema name in:
- All migration files (table references, GRANT statements, SET search_path, FROM clauses)
- Environment variable `NEXT_PUBLIC_CLIENT_SCHEMA`

**Pro Tip:** Use editor's "Find and Replace" to replace all instances at once.

---

## 4. Development Patterns & Solutions

### PostgREST Schema Search Issue

**Problem:** PostgREST cannot find tables in custom schemas even when exposed.

**Solution:** Use RPC functions in `public` schema. This is the standard pattern for all new tables.

**When to use:**
- Any table added after initial schema setup
- Tables that PostgREST doesn't recognize

**When direct access works:**
- Tables created during initial schema setup (before PostgREST caches schema)
- Tables that PostgREST recognized when schema was first exposed

### RPC Function Pattern

**Standard Structure:**
- Function in `public` schema
- `SECURITY DEFINER` with `SET search_path = public, {client_schema}` ⚠️ **CRITICAL: public must be FIRST**
- Query custom schema table
- Typed parameters (no dynamic SQL)
- Appropriate execute permissions

**⚠️ CRITICAL: Search Path Ordering**

**ALWAYS put `public` FIRST in `search_path` to prevent infinite recursion:**

```sql
-- ✅ CORRECT (prevents recursion):
SET search_path = public, website_cms_template_dev

-- ❌ WRONG (causes infinite recursion):
SET search_path = website_cms_template_dev, public
```

**Why This Matters:**
- If custom schema is first, PostgreSQL resolves function calls to the custom schema function
- Custom schema wrapper functions call `public.get_function()`
- This creates infinite recursion: `public` → `custom` → `public` → `custom` → ...
- Result: Stack depth limit exceeded error
- **Fix:** Always put `public` first so PostgreSQL finds the public function before the custom wrapper

**⚠️ Cost Overrun Prevention**

Infinite recursion can cause severe cost and performance issues:

**Impact:**
- **CPU Usage Spikes**: PostgreSQL repeatedly executes functions, consuming massive compute resources
- **Memory Consumption**: Stack frames accumulate, exhausting database memory
- **Connection Exhaustion**: Queries hang indefinitely, blocking other operations
- **Service Degradation**: Can affect other clients in shared Supabase projects
- **Billing Impact**: Higher compute usage can trigger scaling or overage charges on Supabase Pro/Team plans

**Prevention Strategies:**

1. **Database-Level Safeguards:**
   ```sql
   -- Set statement timeout to prevent runaway queries (30-60 seconds recommended)
   ALTER DATABASE your_database SET statement_timeout = '30s';
   
   -- Limit function call depth (PostgreSQL 14+)
   ALTER DATABASE your_database SET max_stack_depth = '2MB';
   ```

2. **Function Testing Before Deployment:**
   - Always test RPC functions in isolation before deploying
   - Verify function resolution works correctly
   - Test with actual data to catch recursion early

3. **Code Review Checklist:**
   - [ ] `search_path` has `public` first
   - [ ] Function tested in isolation
   - [ ] No circular function dependencies
   - [ ] Proper error handling
   - [ ] Permissions granted correctly
   - [ ] Schema-qualified table names in queries
   - [ ] Statement timeout configured

4. **Monitoring:**
   - Set up alerts for high CPU usage on database
   - Monitor for long-running queries (> 5 seconds)
   - Watch for connection pool exhaustion
   - Track unusual error rates

**Emergency Response:**
- If recursion detected: Immediately drop problematic functions to stop the loop
- Use `DROP FUNCTION IF EXISTS ... CASCADE;` to break recursion
- See migration `037_emergency_fix_recursion.sql` for example emergency fix pattern

**Media RPC consolidation:** Migration `038_fix_all_media_rpc_functions.sql` consolidates and supersedes 028, 031, 034, 036, 037 for media. Use 038 for new setups; it applies the correct `search_path` and defines `get_media_with_variants`, `get_media_by_id`, `search_media`, `get_media_stats`, etc.

**Common Functions:**
- `get_all_{table}()` - List all records
- `get_{table}_by_id(UUID)` - Get single record
- `search_{table}(TEXT)` - Search/filter records
- `create_{table}(...)` - Insert (if `.from()` doesn't work)
- `update_{table}(UUID, ...)` - Update (if `.from()` doesn't work)

### Write Operations

**Try Direct Access First:**
- Use `.from()` for INSERT/UPDATE/DELETE
- If it works, no RPC function needed

**If Direct Access Fails:**
- Create RPC functions for write operations
- Same pattern as read functions
- Grant execute to `authenticated` only (not `anon`)

### Migration File Naming

Use sequential numbering:
- `XXX_create_{table}.sql`
- `XXX_enable_rls_{table}.sql`
- `XXX_create_{table}_rpc.sql` (CRITICAL)

**Note:** RPC migration can come after other migrations, but must be run before using table in code.

### Taxonomy Integration for New Content Types

When creating **any** new content type (e.g. properties, products, custom storage entities), **always** use the existing taxonomy system for categories and tags. **Do not** build a separate tags/categories system. (A past implementation built a separate taxonomy for the Media Library; that was corrected by wiring media to the site-wide taxonomy.)

**Steps:**
1. **Define a section** in Settings → Taxonomy → Sections (e.g. `property`, `product`) for the new content type.
2. **Use `taxonomy_relationships`** to link content to terms: `content_type` = your type (e.g. `'property'`), `content_id` = record ID, `term_id` = taxonomy term UUID. Ensure `content_type` is allowed in the table check constraint; add a migration if needed. For rows in the unified **content** table, use `content_type` = `content_types.slug` and `content_id` = `content.id`.
3. **Use taxonomy helpers** in `src/lib/supabase/taxonomy.ts`: e.g. `getTermsForSection`, `getTermsForMediaSection`-style helpers, and `getTaxonomyForMedia` / `setTaxonomyForMedia`-style helpers for your entity.
4. **Reuse UI:** `TaxonomyAssignment`, `TaxonomyMultiSelect`, and section-scoped term fetching for assignment and filtering in admin and public UIs.

**Reference:** `src/lib/supabase/taxonomy.ts`, `src/types/taxonomy.ts`, `/admin/settings/taxonomy`. See also [prd.md – Taxonomy System](./prd.md#taxonomy-system) and **Single Source of Truth – No Separate Taxonomy**.

---

## 5. API Endpoints Reference

### Public Content API

**Content Endpoints:**
- `GET /api/pages` - List published pages (pagination, search)
- `GET /api/pages/[id]` - Get single page by ID or slug (includes homepage)
- `GET /api/posts` - List published posts (pagination, search)
- `GET /api/posts/[id]` - Get single post by ID or slug
- `GET /api/galleries` - List all galleries
- `GET /api/galleries/[id]` - Get gallery with items by ID or slug
- `GET /api/media/[id]` - Get media item details
- **Events (calendar dual purpose: public events + scheduling/booking backend):**
- `GET /api/events` - List events (supports date range filtering; public events only, or unavailable blocks for private meetings as configured)
- `GET /api/events/[id]` - Get event by ID (or slug)
- `GET /api/events/ics` - iCalendar (ICS) subscription feed

**Form Submission:**
- `POST /api/forms/[formId]/submit` - Submit form data (creates/updates CRM contact, processes consents, handles duplicate detection)

**Cookie Consent:**
- `POST /api/cookies/consent` - Submit cookie consent preferences
- `GET /api/cookies/consent` - Get current cookie consent preferences
- `PUT /api/cookies/consent` - Update cookie consent preferences
- `GET /api/cookies/policy` - Get cookie policy content (public)

### Authenticated Admin API

**Event Management (calendar dual purpose: public events + private meetings/booking):**
- `POST /api/events` - Create event (public event or private meeting)
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### MAG & Ecommerce Integration API

**MAG Management:**
- `GET /api/mags` - List all MAGs (public or API key auth)
- `GET /api/mags/[id]` - Get MAG details
- `POST /api/mags/[id]/assign` - Assign MAG to user (API key required, body: `{ "email": "user@example.com" }`)
- `POST /api/mags/[id]/remove` - Remove MAG from user (API key required)
- `GET /api/members/[email]` - Get member details and MAG assignments (API key required)
- `POST /api/members/verify` - Verify member has specific MAG (API key required)

**Payment Webhook:**
- `POST /api/webhooks/payment` - Receive payment notifications (validates signature, matches ecommerce_tag, auto-assigns MAG if enabled)
- `POST /api/webhooks/payment/[provider]` - Provider-specific endpoints (stripe, shopify, woocommerce)

### CRM API

**Contact Management:**
- `GET /api/crm/contacts` - List contacts (filtering by status, tags, MAGs, DND)
- `GET /api/crm/contacts/[id]` - Get contact details (includes tags, MAGs, consents, custom fields)
- `PUT /api/crm/contacts/[id]` - Update contact (notes, tags, MAGs, status, DND)
- `POST /api/crm/contacts/[id]/push` - Manually push contact to external CRM
- `POST /api/crm/contacts/[id]/unsubscribe` - Unsubscribe (sets DND, records consent withdrawal)
- `DELETE /api/crm/contacts/[id]` - Delete contact

**Tags & MAGs (External Integration):**
- `POST /api/crm/contacts/[id]/tags` - Add/remove tags (admin or API key, body: `{ tags: ['tag1', 'tag2'] }`)
- `POST /api/crm/contacts/[id]/mags` - Assign/remove MAGs (admin or API key, body: `{ mag_ids: ['uuid1', 'uuid2'] }`)
- `POST /api/crm/contacts/[email]/tags` - Add tags by email (API key auth)
- `POST /api/crm/contacts/[email]/mags` - Assign MAGs by email (API key auth)

**Consent & DND:**
- `GET /api/crm/contacts/[id]/consents` - Get consent history
- `POST /api/crm/contacts/[id]/consents` - Record consent
- `POST /api/crm/contacts/[id]/consents/withdraw` - Withdraw consent (sets DND)
- `PUT /api/crm/contacts/[id]/dnd-status` - Update DND status (admin)

**API Authentication:**
- API Key Authentication: External systems use API keys (stored in database)
- Webhook Security: Signature verification, IP allowlist (optional), idempotency handling
- Rate Limiting: 100 requests/minute for public, configurable for API keys

**All API Endpoints Include:**
- Rate limiting
- Response caching headers (where appropriate)
- JSON responses
- Consistent error format

---

## 6. Authentication & Security

### Authentication System

**Supabase Auth Integration:**
- Native authentication via Supabase Auth
- Email/password primary method
- OAuth providers optional (Google, GitHub, etc.)
- JWT-based sessions with automatic refresh
- Role-based access via user metadata

### User Types & Roles

**Superadmin:**
- `user_metadata.type = "superadmin"`, `role = "superadmin"`
- Cross-client access (all schemas)
- Requires 2FA (aal2) for all superadmin routes
- Access: `/admin/super/*`

**Client Admin:**
- `user_metadata.type = "admin"`, `role = "client_admin" | "editor" | "viewer"`
- Single-client scope (their schema only)
- Requires `tenant_id` matching `NEXT_PUBLIC_CLIENT_SCHEMA`
- 2FA required for sensitive operations (settings, members, archive)
- Access: `/admin/*`

**Member Users (GPUM):**
- `user_metadata.type = "member"`
- Public site + protected content access
- Authenticate at `/login` or `/register`
- Profile in `members` table
- Optional 2FA enrollment

### Multi-Client Authentication

**User Metadata Structure:**
- `tenant_id`: Client schema name (required for admins and members)
- `type`: `superadmin | admin | member`
- `role`: Admin authorization role (superadmin, client_admin, editor, viewer, etc.)
- `allowed_schemas`: Optional array for cross-client access (superadmins)

**Schema Association:**
- User's `tenant_id` matched with `NEXT_PUBLIC_CLIENT_SCHEMA`
- Middleware validates session and client association
- Database queries automatically scoped to correct schema

**Superadmin Bypass:**
- If `type = "superadmin"` and `role = "superadmin"`, can bypass `tenant_id` match
- Optional `allowed_schemas: ["*"]` or concrete allowlist

### Two-Factor Authentication (2FA/MFA)

**MFA Methods:**
- **TOTP (Primary)**: Time-based one-time password via authenticator apps (Google Authenticator, Authy, etc.)
- **SMS/Phone (Planned)**: SMS verification via external provider (Twilio, MessageBird, etc.)

**Authenticator Assurance Levels (AAL):**
- `aal1`: Password/social login only (no 2FA)
- `aal2`: Password + successful 2FA verification

**2FA Requirements:**
- **Superadmin**: Always required (aal2) for all superadmin routes
- **Client Admin**: Required (aal2) for sensitive operations (settings, members, archive)
- **Member**: Optional (can enable in account settings)

**MFA Enrollment Flow:**
1. First login → Redirect to `/admin/mfa/enroll`
2. Scan QR code with authenticator app
3. Verify enrollment with code
4. Session upgraded to aal2

**MFA Challenge Flow:**
1. After password login (aal1 achieved)
2. If route requires aal2 → Redirect to `/admin/mfa/challenge`
3. Enter code from authenticator
4. Session upgraded to aal2
5. Access granted

**Multiple Factors:**
- Users can enroll up to 10 TOTP factors
- Useful for backup/recovery
- All factors shown during challenge

**Middleware Enforcement:**
- Superadmin routes: Always require aal2
- Client admin sensitive routes: Require aal2 (settings, members, mags, archive)
- Check `aal` claim in JWT token

**Dev Mode Bypass:**
- Set `NEXT_PUBLIC_DEV_BYPASS_2FA=true` in `.env.local`
- Authentication still required, only 2FA bypassed
- Only works in development mode

### Route Protection

**Next.js Middleware:**
- Validates Supabase Auth sessions
- Protects all `/admin/*` routes (except `/admin/login`)
- JWT tokens validated on each request
- Automatic token refresh via Supabase

**Protected Routes:**
- All `/admin/*` routes require authentication
- Superadmin routes require aal2
- Client admin sensitive routes require aal2

### Security Best Practices

**RLS (Row Level Security):**
- Enabled on all tables
- Policies for `authenticated` and `anon` roles
- Schema-qualified table names in policies
- Sensitive tables can check `aal` claim in JWT

**RPC Function Security:**
- `SECURITY DEFINER` with explicit `SET search_path = public, {client_schema}` (prevents injection AND recursion)
- ⚠️ **CRITICAL:** Always put `public` first in `search_path` to prevent infinite recursion
- Typed parameters (no dynamic SQL)
- Execute permissions granted only to necessary roles
- Sensitive data: Only grant to `authenticated` (not `anon`)

**API Security:**
- API key authentication for external integrations
- Webhook signature verification
- Rate limiting (100 req/min public, configurable for API keys)
- Idempotency handling for webhooks

**Storage Bucket Policies:**

Storage buckets require RLS policies on `storage.objects` to allow file uploads, updates, deletes, and reads. Without these policies, uploads will fail with "new row violates row-level security policy" errors.

**Key Facts:**
- `storage.objects.bucket_id` is **TEXT** (bucket name), not UUID
- Policies must be created on `storage.objects` table (not on buckets table)
- Use `EXECUTE format()` with `%L` to inline bucket name as literal in policies
- PostgreSQL does NOT support `CREATE POLICY IF NOT EXISTS` - use `DROP POLICY IF EXISTS` then `CREATE POLICY`

**Required Policies:**
1. **INSERT** (uploads) - Allow `authenticated` users to upload files
2. **UPDATE** - Allow `authenticated` users to update files
3. **DELETE** - Allow `authenticated` users to delete files
4. **SELECT** (reads) - Allow `public` (or `anon`/`authenticated`) to read files

**Migration Pattern:**
See `supabase/migrations/039_setup_storage_bucket_policies.sql` for the complete pattern. Key structure:

```sql
DO $$
DECLARE
  bucket_name TEXT := 'client-website_cms_template_dev';
BEGIN
  -- Verify bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = bucket_name) THEN
    RAISE EXCEPTION 'Bucket % does not exist.', bucket_name;
  END IF;

  -- Use EXECUTE format() to inline bucket name as literal
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  EXECUTE format(
    'CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
    bucket_name
  );
  -- ... repeat for UPDATE, DELETE, SELECT
END $$;
```

**Why `EXECUTE format()`?**
- Variables in `CREATE POLICY` are resolved against the table being policied (`storage.objects`)
- PostgreSQL looks for a column named `bucket_name` in `storage.objects` (doesn't exist)
- `EXECUTE format()` with `%L` inlines the value as a SQL literal string
- Result: `bucket_id = 'client-website_cms_template_dev'` (literal comparison)

**Common Errors:**
- `invalid input syntax for type uuid: "bucket-name"` → Using UUID instead of bucket name (text)
- `column "bucket_name" does not exist` → Variable used directly in CREATE POLICY (use EXECUTE format)
- `syntax error at or near "NOT"` → Using `CREATE POLICY IF NOT EXISTS` (not supported)

**Dashboard Alternative:**
If SQL migration doesn't work, configure policies via Dashboard:
1. Go to Supabase Dashboard → Storage
2. Click on your bucket
3. Go to "Policies" tab
4. Add policies for INSERT, UPDATE, DELETE, SELECT operations
5. Use `bucket_id = 'your-bucket-name'` in policy expressions

---

## 7. Testing & Troubleshooting

### 2FA Testing

**Prerequisites:**
- Dev server running
- Authenticator app installed (Google Authenticator, Authy, etc.)
- User account with proper metadata

**Test Scenarios:**
1. **MFA Enrollment Flow:** Navigate to `/admin/mfa/enroll`, scan QR code, verify code
2. **MFA Challenge Flow:** Log out, log back in, complete challenge for protected routes
3. **MFA Management UI:** View/enroll/remove factors at `/admin/settings/security`
4. **Middleware Protection:** Verify superadmin routes require 2FA challenge
5. **Login Flow Integration:** Test first-time enrollment and existing factors

**Troubleshooting:**
- "No enrollment data returned" → Check Supabase MFA settings
- "Invalid verification code" → Check device time sync, try fresh code
- "Failed to create challenge" → Verify factor is verified
- Redirect loop → Check `NEXT_PUBLIC_DEV_BYPASS_2FA` setting

**Dev Mode Bypass:**
- Add `NEXT_PUBLIC_DEV_BYPASS_2FA=true` to `.env.local`
- Restart dev server
- Authentication still required, only 2FA bypassed

### Setup Script Testing

**Test Schema:** Use temporary name like `test_client_setup`

**Verification Steps:**
1. Verify schema creation (Dashboard → Table Editor)
2. Verify RPC functions (test `get_settings()` query)
3. Verify default settings (check settings table)
4. Verify storage bucket (Dashboard → Storage)
5. Expose schema manually (Dashboard → Settings → API)
6. Test design system loading (check CSS variables)
7. Test authentication (login with test user)

**Troubleshooting:**
- "RPC exec_sql not available" → Use manual setup steps (Step 2 option B) or `docs/archived/zzz-CLIENT_SETUP_CHECKLIST.md`
- "Schema already exists" → Use different test schema name
- "Missing environment variables" → Check `.env.local`
- "Permission denied" → Verify service role key
- Design system not loading → Check schema exposed, RPC functions exist, settings table has data

### Common Issues & Fixes

**Cursor Terminal EPERM Error:**
- **Problem:** `Error: spawn EPERM` when running `pnpm run dev` in Cursor terminal
- **Cause:** Antivirus (ESET, Windows Defender) blocking child process spawning
- **Solution:** Add project folder, Node.js, and Cursor to antivirus exclusions
- **Workaround:** Run `pnpm run dev` manually in PowerShell

**Schema Not Found Errors:**
- Verify schema is exposed in Dashboard
- Run: `NOTIFY pgrst, 'reload schema';`
- Check permissions were granted

**Settings Not Loading:**
- Verify RPC functions exist
- Check settings table has data
- Verify schema name in environment variables matches actual schema

**Authentication Issues:**
- Verify user metadata is set correctly
- Check middleware is allowing routes
- Verify Supabase keys are correct

---

## Quick Reference

### File Structure
```
supabase/migrations/
  ├── XXX_create_{table}.sql          (Step 1)
  ├── XXX_enable_rls_{table}.sql      (Step 2)
  └── XXX_create_{table}_rpc.sql      (Step 3) ⚠️ CRITICAL

src/lib/supabase/
  └── {table}.ts                      (Step 4)

src/types/
  └── {table}.ts                      (Type definitions)
```

### The Golden Rule

**For any new table added after initial schema setup:**
1. Create table with permissions
2. Enable RLS with policies
3. **Create RPC functions in `public` schema** (CRITICAL)
4. Use RPC functions in TypeScript (`.rpc()` not `.from()`)
5. Test write operations with `.from()` first, create RPC if needed

**This will save you hours of debugging!**

---

*This document is maintained as a living reference. Add new patterns and solutions as they are discovered.*
