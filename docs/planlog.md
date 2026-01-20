# Plan Log

This document tracks planned work, implementation phases, and backlog items for the Headless CMS project. Items are organized by priority and development phase.

## Implementation Phases (Priority Order)

### Phase 0: Supabase Auth Integration

**Status**: Pending - Foundation for all other features

- [ ] Replace custom Auth API with Supabase Auth integration
  - [ ] Update `src/lib/auth/` to use Supabase Auth instead of external API
  - [ ] Remove `AUTH_API_URL` and `AUTH_API_KEY` environment variables
  - [ ] Update `src/middleware.ts` to use Supabase Auth session validation
  - [ ] Update `src/app/api/auth/login/route.ts` to use `supabase.auth.signInWithPassword()`
  - [ ] Update `src/app/admin/login/page.tsx` to use Supabase Auth UI

- [ ] Implement multi-tenant auth with user metadata
  - [ ] Configure user metadata structure: `user_metadata.tenant_id` and `user_metadata.role`
  - [ ] Update middleware to validate user's tenant_id matches `NEXT_PUBLIC_CLIENT_SCHEMA`
  - [ ] Create `src/lib/auth/supabase-auth.ts` utilities:
    - `getCurrentUser()` - Get authenticated user with metadata
    - `validateTenantAccess()` - Ensure user can access current schema
    - `hasRole()` - Check user role permissions
  - [ ] Update all admin routes to use Supabase Auth session

- [ ] Create user management utilities
  - [ ] Create `src/lib/supabase/users.ts` utilities for user management
  - [ ] Document user creation process with tenant association

### Phase 1: Foundation & Infrastructure Enhancements

**Status**: Pending - Required for design system and components

- [ ] Enhance settings table schema
  - [ ] Update migration to include design system structure in settings table
  - [ ] Add default design system values (fonts, colors)
  - [ ] Create settings utility functions in `src/lib/supabase/settings.ts`

- [ ] Design system core implementation
  - [ ] Create `src/lib/design-system.ts` utility for loading/applying design system
  - [ ] Create `src/components/design-system/DesignSystemProvider.tsx` to inject CSS variables
  - [ ] Update `src/app/layout.tsx` to load design system settings and apply CSS variables
  - [ ] Create TypeScript types for design system settings

- [ ] Create public component directory structure
  - [ ] Create `src/components/public/` directory structure
  - [ ] Set up `sections/` for reusable page sections
  - [ ] Set up `pages/` for full page-level components
  - [ ] Set up `layout/` for layout components (Header, Footer, Navigation)
  - [ ] Create base component structure with TypeScript interfaces

### Phase 2: Design System Admin UI

**Status**: Pending - Depends on Phase 1

- [ ] Enhance settings page with design system section
  - [ ] Update `src/app/admin/settings/page.tsx` with design system section
  - [ ] Create `src/components/settings/DesignSystemSettings.tsx`:
    - Font selection UI (Google Fonts integration)
    - Color palette picker UI
    - Real-time preview component
    - Save/update functionality
  - [ ] Create API route `src/app/api/admin/settings/route.ts` for updating settings

- [ ] Implement admin dark theme
  - [ ] Update admin layout (`src/app/admin/layout.tsx`) to use dark theme
  - [ ] Create admin-specific CSS variables that use design system colors in dark mode
  - [ ] Ensure admin uses same fonts but different color application

- [ ] CSS variable integration
  - [ ] Update `src/app/globals.css` with design system CSS variables
  - [ ] Create utility functions to apply design system values
  - [ ] Ensure variables are applied to both public and admin (different themes)

### Phase 3: Component Library - Sections

**Status**: Pending - Depends on Phase 1 & 2

- [ ] Build base section components
  - [ ] Create `src/components/public/sections/Hero.tsx` (title, subtitle, image, CTA)
  - [ ] Create `src/components/public/sections/TextBlock.tsx` (rich text, alignment, spacing)
  - [ ] Create `src/components/public/sections/ImageBlock.tsx` (image with caption, alt text)
  - [ ] Create `src/components/public/sections/GalleryBlock.tsx` (embedded gallery display)
  - [ ] Create `src/components/public/sections/FormBlock.tsx` (embedded form with submission handling)
  - [ ] All components use design system CSS variables

- [ ] Build layout components
  - [ ] Create `src/components/public/layout/Header.tsx` (navigation, logo, responsive menu)
  - [ ] Create `src/components/public/layout/Footer.tsx` (footer content, admin link, copyright)
  - [ ] Create `src/components/public/layout/Navigation.tsx` (dynamic nav from settings, active states)

### Phase 4: Public-Facing Pages

**Status**: Pending - Depends on Phase 3

- [ ] Build blog pages
  - [ ] Create `src/app/(public)/blog/page.tsx` (list published posts, pagination, search/filter)
  - [ ] Create `src/app/(public)/blog/[slug]/page.tsx` (single post, rich content, related posts, SEO)

- [ ] Build gallery pages
  - [ ] Create `src/app/(public)/gallery/page.tsx` (list all galleries, gallery grid)
  - [ ] Create `src/app/(public)/gallery/[slug]/page.tsx` (single gallery, image grid, lightbox)

- [ ] Enhance homepage
  - [ ] Update `src/app/(public)/page.tsx` to use component composition
  - [ ] Create `src/components/public/pages/HomePage.tsx` (composable sections, content from database)

- [ ] Enhance public layout
  - [ ] Update `src/app/(public)/layout.tsx` to use Header and Footer components
  - [ ] Apply design system variables
  - [ ] Add SEO metadata handling

### Phase 5: Membership Platform

**Status**: Pending - Core feature for protected content, depends on Phase 0 & 4

- [ ] Create membership database schema
  - [ ] Create migration `supabase/migrations/002_membership_schema.sql`:
    - `membership_groups` table (name, slug, description, tier)
    - `members` table (references auth.users, email, display_name, status)
    - `user_memberships` junction table (member_id, membership_group_id, expires_at)
  - [ ] Add `access_level` and `required_membership_group_id` columns to `posts` table
  - [ ] Add `access_level` and `required_membership_group_id` columns to `galleries` table
  - [ ] Add indexes for performance

- [ ] Build membership utilities
  - [ ] Create `src/lib/supabase/memberships.ts`:
    - `getMembershipGroups()` - List all membership groups
    - `getMemberMemberships()` - Get member's active memberships
    - `checkContentAccess()` - Verify member has access to content
    - `assignMembership()` - Assign member to group
    - `removeMembership()` - Remove member from group
  - [ ] Create `src/lib/auth/member-auth.ts`:
    - `getMemberUser()` - Get authenticated member with profile
    - `validateMemberAccess()` - Verify member authentication
    - `hasMembership()` - Check if member has specific membership

- [ ] Member authentication flow
  - [ ] Create `src/app/(public)/login/page.tsx` (member login/registration)
  - [ ] Create `src/app/(public)/register/page.tsx` (or combine with login)
  - [ ] Create API route `src/app/api/auth/member/login/route.ts` (Supabase Auth for members)
  - [ ] Create API route `src/app/api/auth/member/register/route.ts` (member registration with user_metadata.type = "member")
  - [ ] Update middleware to handle member authentication (separate from admin)

- [ ] Member routes and pages
  - [ ] Create `src/app/(public)/members/page.tsx` (member dashboard - protected)
  - [ ] Create `src/app/(public)/members/profile/page.tsx` (member profile page)
  - [ ] Create `src/app/(public)/members/account/page.tsx` (account settings)
  - [ ] Create `src/components/memberships/MemberDashboard.tsx`
  - [ ] Create `src/components/memberships/MemberProfile.tsx`

- [ ] Content protection implementation
  - [ ] Update `src/app/(public)/blog/[slug]/page.tsx` to check access_level
  - [ ] Update `src/app/(public)/gallery/[slug]/page.tsx` to check access_level
  - [ ] Create `src/components/public/ProtectedContent.tsx` wrapper component
  - [ ] Create middleware/utility for checking content access before rendering
  - [ ] Implement redirect to `/login` for unauthenticated access attempts
  - [ ] Add teaser/preview content for non-members

- [ ] Admin UI for membership management
  - [ ] Create `src/app/admin/memberships/page.tsx` (list all membership groups)
  - [ ] Create `src/app/admin/memberships/new/page.tsx` (create new group)
  - [ ] Create `src/app/admin/memberships/[id]/page.tsx` (edit group)
  - [ ] Create `src/components/memberships/MembershipGroupEditor.tsx`
  - [ ] Create `src/app/admin/members/page.tsx` (list all members)
  - [ ] Create `src/app/admin/members/[id]/page.tsx` (view member details, manage memberships)
  - [ ] Create `src/components/memberships/MemberManagement.tsx`
  - [ ] Create `src/components/memberships/MemberList.tsx`

- [ ] Content editor integration
  - [ ] Update `src/components/posts/PostEditor.tsx`:
    - Add access level dropdown (public, members, group)
    - Add membership group selector (when access_level = "group")
  - [ ] Update `src/components/galleries/GalleryEditor.tsx`:
    - Add access level dropdown
    - Add membership group selector
  - [ ] Add preview mode to see member view

- [ ] API routes for memberships
  - [ ] Create `src/app/api/memberships/route.ts` (GET list, POST create - admin only)
  - [ ] Create `src/app/api/memberships/[id]/route.ts` (GET, PUT, DELETE - admin only)
  - [ ] Create `src/app/api/members/route.ts` (GET list - admin only)
  - [ ] Create `src/app/api/members/[id]/route.ts` (GET details - admin only)
  - [ ] Create `src/app/api/members/[id]/memberships/route.ts` (POST assign, DELETE remove - admin only)
  - [ ] Create `src/app/api/member/profile/route.ts` (GET current member profile)
  - [ ] Update existing content API routes to respect access_level:
    - Update `src/app/api/posts/[id]/route.ts` to check membership
    - Update `src/app/api/galleries/[id]/route.ts` to check membership

- [ ] Member authentication middleware
  - [ ] Update `src/middleware.ts` to handle member routes (`/members/*`)
  - [ ] Add member session validation (separate from admin)
  - [ ] Implement protected content route checks

- [ ] Dashboard integration
  - [ ] Add membership statistics to admin dashboard
  - [ ] Show recent member registrations
  - [ ] Display membership group counts

### Phase 6: Archive & Restore System

**Status**: Pending - Can run parallel with other phases

- [ ] Create archive registry table
  - [ ] Create migration `supabase/migrations/002_archive_registry.sql`
  - [ ] Create `public.archived_projects` table in public schema
  - [ ] Add indexes and constraints

- [ ] Build archive utilities
  - [ ] Create `src/lib/supabase/archive.ts`:
    - `archiveProject()` - Rename schema and bucket, create registry entry
    - `restoreProject()` - Restore schema and bucket, update registry
    - `listArchivedProjects()` - Query archived projects
  - [ ] Use Supabase service role for schema operations

- [ ] Build archive admin UI
  - [ ] Create `src/app/admin/settings/archive/page.tsx`:
    - List archived projects
    - Archive current project form
    - Restore project interface
    - Archive metadata display

- [ ] Create archive API routes
  - [ ] Create `src/app/api/admin/archive/route.ts` (POST to archive, GET to list)
  - [ ] Create `src/app/api/admin/archive/[id]/restore/route.ts` (POST to restore)

### Phase 7: Reset to Template System

**Status**: Pending - Can run parallel with other phases

- [ ] Build reset utilities
  - [ ] Create `src/lib/supabase/reset.ts`:
    - `resetContent()` - Clear posts, galleries, forms, submissions
    - `resetDesignSystem()` - Restore default design system values
    - `resetMedia()` - Optionally clear media library
    - `fullReset()` - Complete factory reset

- [ ] Build reset admin UI
  - [ ] Create `src/app/admin/settings/reset/page.tsx`:
    - Reset options selection
    - Confirmation dialogs (multiple confirmations)
    - Progress indication
    - Safety warnings

- [ ] Create reset API route
  - [ ] Create `src/app/api/admin/reset/route.ts` (POST with validation and confirmation)

### Phase 8: CLI Tools

**Status**: Pending - Useful for deployment/setup

- [ ] Create setup script
  - [ ] Create `scripts/setup-new-client.ts`:
    - Interactive CLI for new client setup
    - Schema creation
    - Migration execution
    - Storage bucket creation
    - Environment variable validation
  - [ ] Add `pnpm run setup` script to `package.json`

- [ ] Create reset script
  - [ ] Create `scripts/reset-content.ts` (CLI for resetting content, partial/full options)
  - [ ] Add `pnpm run reset` script to `package.json`

- [ ] Create archive script
  - [ ] Create `scripts/archive-project.ts` (CLI for archiving project, backup options)
  - [ ] Add `pnpm run archive` script to `package.json`

### Phase 9: Storage Bucket Management

**Status**: Pending - Part of infrastructure

- [ ] Build storage utilities
  - [ ] Create `src/lib/supabase/storage.ts`:
    - `createClientBucket()` - Create client-specific bucket
    - `renameBucket()` - Rename bucket for archiving
    - Bucket configuration (public/private, policies)

- [ ] Integrate bucket setup
  - [ ] Integrate bucket creation into schema setup
  - [ ] Update migration utilities to include bucket creation
  - [ ] Add bucket validation checks

### Phase 10: API Enhancements

**Status**: Pending - Enhancements to existing APIs

- [ ] Enhance public API routes
  - [ ] Improve error handling in existing API routes
  - [ ] Add SEO metadata to post responses
  - [ ] Add pagination to gallery API
  - [ ] Add search/filter to posts API
  - [ ] Ensure all protected content endpoints check membership access

- [ ] Create API documentation
  - [ ] Create `docs/api.md` with comprehensive API documentation
  - [ ] Document all endpoints, request/response formats
  - [ ] Include authentication requirements (admin vs member)
  - [ ] Document membership access requirements
  - [ ] Add rate limiting documentation

### Phase 11: Polish & Testing

**Status**: Pending - Final phase before release

- [ ] Error handling improvements
  - [ ] Add comprehensive error boundaries
  - [ ] Improve error messages throughout app
  - [ ] Add user-friendly error pages (404, 500)
  - [ ] Handle membership access denied errors gracefully

- [ ] Loading states
  - [ ] Enhance loading states across admin UI
  - [ ] Add skeleton loaders for public pages
  - [ ] Implement optimistic UI updates where appropriate
  - [ ] Add loading states for membership checks

- [ ] Type safety
  - [ ] Generate database types from schema (including membership tables)
  - [ ] Improve TypeScript coverage
  - [ ] Add strict type checking
  - [ ] Add types for membership utilities

- [ ] Testing
  - [ ] Add unit tests for utilities (archive, reset, design system, memberships)
  - [ ] Add integration tests for API routes (including protected content)
  - [ ] Test component library components
  - [ ] Test membership access control flows

## Completed Phases (From Previous Implementation)

### Phase 1: Foundation ✅
- [x] Initialized Next.js 15 project with TypeScript
- [x] Set up Tailwind CSS and shadcn/ui
- [x] Configured Supabase client with schema switching
- [x] Created authentication middleware
- [x] Set up project structure

### Phase 2: Database & Schema Management ✅
- [x] Created Supabase migration system
- [x] Implemented schema creation utility

### Phase 3: Core Admin UI ✅
- [x] Dashboard layout with navigation
- [x] Media library (upload, list, manage)
- [x] Blog posts CRUD with rich text editor
- [x] Basic settings page

### Phase 4: Advanced Content Types ✅
- [x] Gallery management
- [x] Form builder
- [x] Form submissions CRM view

### Phase 5: REST API ✅
- [x] Implemented all API endpoints
- [x] Added rate limiting
- [x] Added response caching

### Phase 6: Polish & Deployment ✅
- [x] Error handling and validation
- [x] Loading states and UX improvements
- [x] Deployment configuration
- [x] Documentation

## Architecture Notes

### Authentication
- Using Supabase Auth with user metadata for multi-tenant access
- **Admin users**: `user_metadata: { tenant_id: "client_abc123", role: "admin|editor|viewer", type: "admin" }`
- **Member users**: `user_metadata: { tenant_id: "client_abc123", type: "member" }`
- Middleware validates tenant_id matches `NEXT_PUBLIC_CLIENT_SCHEMA`
- Dual authentication system: Admin (CMS) and Member (protected content)

### Multi-Tenant Security
- Each deployment scoped to single schema via environment variable
- Schema isolation enforced at application and user metadata levels
- Users can only access data from their designated schema

### Design System
- CSS variables injected at root level
- Admin uses same variables with dark theme application
- Settings stored in database, applied via CSS custom properties

### Component Library
- Reusable components in `src/components/public/`
- Components accept props and consume design system variables
- Developer-centric approach (no visual page builder)

### Membership Platform
- Membership groups stored in client schema (membership_groups table)
- Members extend Supabase auth.users with profile in members table
- Many-to-many relationship: members can belong to multiple groups
- Content protection via access_level (public, members, group)
- Separate member authentication flow from admin authentication

### Archive/Restore
- Schema renaming (fast, no data migration)
- Registry table in `public` schema for cross-schema queries
- Storage buckets renamed (not moved) for quick restore

## Future Enhancements

- SEO tools and sitemap generation
- Analytics integration
- Email notifications for form submissions
- Content scheduling
- Multi-language support
- User roles and permissions refinement (additional admin roles)
- **Membership Platform Enhancements:**
  - Payment integration for paid memberships
  - Subscription management and renewals
  - Member activity tracking and analytics
  - Automated membership expiration reminders
  - Member referral system
  - Member directory with privacy controls
- Advanced design system controls (spacing, border radius, shadows)
- Design system presets/templates for quick setup
- Component library documentation site
- Component versioning and changelog
- Automated backup scheduling for archives

## Technical Debt

- [ ] Review and optimize database queries
- [ ] Add comprehensive error boundaries
- [ ] Improve TypeScript type coverage
- [ ] Add unit tests for critical components
- [ ] Add integration tests for API endpoints
- [ ] Improve error messages and user feedback
- [ ] Optimize image uploads and processing
- [ ] Add comprehensive logging

## Notes

- **IMPORTANT**: Items are NEVER deleted from this document - they remain and are simply checked off (`- [ ]` → `- [x]`) when completed
- This provides a complete history of what was planned and what was completed
- Check off items as they are completed (keep them in the document)
- Add summary entries to `changelog.md` for completed work, but keep detailed task history here
- Follow phase dependencies (don't start Phase 2 before Phase 1 is complete)
- Refer to `docs/prd.md` for detailed architecture and specifications
- Review and update regularly during development sessions
