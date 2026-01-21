# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For planned work and backlog items, see [planlog.md](./planlog.md).

## [Unreleased]

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