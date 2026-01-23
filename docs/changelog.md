# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For planned work and backlog items, see [planlog.md](./planlog.md).

## [Unreleased]

### 2026-01-22 18:30 CT - Color Palette Layout, Planlog Update, .cursor Duplicate Cleanup
- **Context for Next Session:** Color palette UI uses 3×5 grid (Alternate 1 in row 2, Alternates 2–6 in row 3). Labels match schema (Alternate 1–6). Planlog includes "Color palette schema evolution (consider)" for `color01`–`color15` + user-defined labels. Docs live only in `docs/`; `.cursor/` holds only `rules/`. Ready to test palette features, continue Phase 02/05, or explore color01–color15 when desired.
- Color palette layout (ColorsSettings)
  - Reorganized to **3 rows × 5 columns** to fix unbalanced 5-column grid (core 9 = 5+4, alternates 6 = 5+1)
  - Row 1: Primary, Secondary, Accent, Background, Background Alt
  - Row 2: Foreground, Foreground Muted, Border, Link, Alternate 1
  - Row 3: Alternate 2–6
  - Single "Brand & theme colors (15)" section; merged former Core/Alternate blocks
- Reverted label renames (no Hover / Alternate 1–5)
  - Kept schema keys as `alternate1`–`alternate6`; display labels stay "Alternate 1"–"Alternate 6"
  - Avoids label/schema mismatch (e.g. "Alternate 1" ↔ `alternate2`)
- Planlog: added "Color palette schema evolution (consider)" to Session Continuation
  - Future option: `color01`–`color15` fixed keys + user-defined labels; store labels separately; migration from current keys
  - Enables flexible naming (e.g. Hover, Success) without schema changes
- Removed duplicate docs from `.cursor/` root (accidental copy/paste)
  - Compared 14 `.md` files in `.cursor/` vs `docs/`; 13 identical, `planlog.md` differed (docs newer, has color-palette step)
  - Deleted all 14 duplicates from `.cursor/`; `docs/` is sole source of truth for project docs
  - Retained `.cursor/rules/` (coding.mdc, MCP.md, structure.mdc)
- **Files Changed:**
  - Updated: `src/components/settings/ColorsSettings.tsx` (3×5 grid, single palette section, label revert)
  - Updated: `docs/planlog.md` (color01–color15 step in Session Continuation)
  - Deleted: 14 duplicates from `.cursor/` root (`ADDING_NEW_TABLES_CHECKLIST.md`, `ADDING_NEW_TABLES.md`, `ARCHITECTURE_DECISION_SCHEMAS.md`, `changelog.md`, `CLIENT_SETUP_CHECKLIST.md`, `MFA_SETUP.md`, `planlog.md`, `prd.md`, `SECURITY_RPC_FUNCTIONS.md`, `SESSION_SUMMARY.md`, `STATUS.md`, `SUPABASE_SCHEMA_SETUP.md`, `TESTING_2FA.md`, `TESTING_SETUP_SCRIPT.md`)
- **Next Steps:** Test palette features; Phase 02 (admin dark theme) or Phase 05 (Media Library); consider color01–color15 when ready

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
  - Status tracking (planned → in progress → complete)
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
  - Duplicate detection logic (perfect match → update, partial match → flag for review)
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
- Updated PRD to standardize template → client fork workflow and promotion process back to the template via PRs
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