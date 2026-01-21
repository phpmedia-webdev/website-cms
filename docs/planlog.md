# Plan Log

This document tracks planned work, implementation phases, and backlog items for the Website-CMS project. Items are organized by priority and development phase.

## Implementation Phases (Priority Order)

### Phase 0: Supabase Auth Integration

**Status**: Pending - Foundation for all other features

- [ ] Replace custom Auth API with Supabase Auth integration
  - [x] Update `src/lib/auth/` to use Supabase Auth instead of external API
  - [x] Remove `AUTH_API_URL` and `AUTH_API_KEY` environment variables (old api-client.ts deleted)
  - [x] Update `src/middleware.ts` to use Supabase Auth session validation
  - [x] Update `src/app/api/auth/login/route.ts` to use `supabase.auth.signInWithPassword()`
  - [x] Update `src/app/admin/login/page.tsx` to use Supabase Auth UI

- [ ] Implement multi-tenant auth with user metadata
  - [ ] Configure user metadata structure:
    - `user_metadata.type`: `superadmin | admin | member`
    - `user_metadata.role`: `superadmin | client_admin | editor | viewer | ...`
    - `user_metadata.tenant_id`: required for `admin` and `member` users (must match deployment schema)
    - `user_metadata.allowed_schemas`: optional allowlist for cross-tenant access (superadmin)
  - [ ] Update middleware rules:
    - Admin area (`/admin/*`): require authenticated `type in ["superadmin","admin"]`
    - Client admin: enforce `tenant_id === NEXT_PUBLIC_CLIENT_SCHEMA`
    - Superadmin: allow bypass via `type="superadmin"` and `role="superadmin"` (optionally validate allowlist)
    - Member area (`/members/*`): require authenticated `type="member"`
  - [x] Create `src/lib/auth/supabase-auth.ts` utilities:
    - `getCurrentUser()` - Get authenticated user with metadata
    - `getCurrentUserFromRequest()` - Get user from middleware (handles cookies)
    - `validateTenantAccess()` - Ensure user can access current schema
    - `hasRole()` - Check user role permissions
    - Helper functions: `isSuperadmin()`, `isClientAdmin()`, `isMember()`
  - [x] Update all admin routes to use Supabase Auth session (session.ts updated, admin layout/page use getSession)

- [x] Create user management utilities
  - [x] Create `src/lib/supabase/users.ts` utilities for user management
    - `createSuperadminUser()` - Create superadmin with cross-tenant access
    - `createClientAdminUser()` - Create client admin with tenant_id
    - `createMemberUser()` - Create member user (GPUM)
    - `updateUserMetadata()` - Update user metadata
    - `deleteUser()` - Delete user
    - `getUserById()` - Get user by ID
    - `listUsers()` - List users with pagination
    - `updateUserPassword()` - Update user password
  - [ ] Document user creation process:
    - Create **Superadmin** users (cross-tenant) for developer/team
    - Create **Client Admin** users (single-tenant) per deployment with `tenant_id`
    - Create **Member** users (GPUM) with `type="member"` and `tenant_id`
    - Clarify GPU = anonymous (no Auth record)

- [x] Superadmin system area (platform-only)
  - [x] Add protected route (recommended): `/admin/super`
  - [x] Create "Superadmin Settings" page for platform-wide utilities (cross-tenant):
    - Tenant/schema lookup (placeholder for future)
    - Archive/restore tooling shortcuts (placeholder for future phase)
    - Diagnostics (auth metadata viewer, current tenant context)
    - Integrations link (placeholder for next step)
  - [x] Ensure page is accessible only to `type="superadmin"` + `role="superadmin"` (middleware updated)
  - [x] Update Sidebar to show Superadmin link only for superadmins

- [ ] Third-Party Integrations & Head Section Management
  - [ ] Create database schema for integrations:
    - Option A: Add `integrations` JSONB column to `settings` table
    - Option B: Create dedicated `integrations` table (name, enabled, config JSONB)
    - Store configuration for: Google Analytics, VisitorTracking.com, SimpleCommenter.com
  - [ ] Create integration utilities (`src/lib/supabase/integrations.ts`):
    - `getIntegrations()` - Load all integration settings
    - `updateIntegration()` - Update integration configuration (superadmin only)
    - `getIntegrationConfig()` - Get specific integration config
  - [ ] Create superadmin integrations UI:
    - Create `src/app/admin/super/integrations/page.tsx` (superadmin-only)
    - Create `src/components/superadmin/IntegrationsManager.tsx`:
      - Google Analytics: Input field for Measurement ID (e.g., `G-XXXXXXXXXX`)
      - VisitorTracking.com: Input field for Vendor UID
      - SimpleCommenter.com: Input field for Vendor UID
      - Enable/disable toggles for each integration
      - Save/Update functionality
      - Status indicators (configured vs. not configured)
      - Display current vendor UIDs/IDs
    - Ensure route requires superadmin role + `aal2` (2FA)
  - [ ] Implement script injection in root layout:
    - Update `src/app/layout.tsx` to load integration settings
    - Inject Google Analytics script (gtag.js) with Measurement ID
    - Inject VisitorTracking.com script with Vendor UID
    - Inject SimpleCommenter.com script with Vendor UID
    - Use Next.js `<Script>` component with appropriate loading strategies:
      - Google Analytics: `strategy="afterInteractive"`
      - VisitorTracking.com: `strategy="afterInteractive"`
      - SimpleCommenter.com: `strategy="lazyOnload"`
    - Scripts only load on public pages (not `/admin/*` routes)
  - [ ] Create API route for integration management:
    - Create `src/app/api/admin/integrations/route.ts` (GET, PUT - superadmin only)
    - Validate superadmin access and 2FA requirement
    - Handle integration configuration updates
  - [ ] Testing:
    - Test script injection on public pages
    - Verify scripts don't load in admin area
    - Test integration configuration UI
    - Verify vendor UIDs are correctly injected into scripts
    - Test enable/disable functionality
    - Verify superadmin-only access control

- [ ] Two-Factor Authentication (2FA/MFA) Implementation
  - [ ] Create MFA utilities (`src/lib/auth/mfa.ts`):
    - `enrollTOTP()` - Enroll TOTP factor (generate QR code)
    - `challengeMFA()` - Challenge enrolled factors
    - `verifyMFA()` - Verify MFA code
    - `getEnrolledFactors()` - List user's enrolled factors
    - `unenrollFactor()` - Remove enrolled factor
    - `getAAL()` - Get current Authenticator Assurance Level from session
    - `requiresAAL2()` - Check if route/role requires aal2
  - [ ] Update middleware (`src/middleware.ts`) for AAL enforcement:
    - Check `aal` claim in JWT token
    - Superadmin routes (`/admin/super/*`): Always require `aal2`
    - Client admin sensitive routes: Require `aal2` for `/admin/settings`, `/admin/members`, `/admin/memberships`, `/admin/settings/archive`, `/admin/settings/reset`
    - Redirect to `/admin/mfa/challenge` if `aal1` but `aal2` required
  - [ ] Create MFA enrollment flow:
    - Create `src/app/admin/mfa/enroll/page.tsx` (enrollment page)
    - Create `src/components/auth/MFAEnroll.tsx`:
      - Display QR code for TOTP enrollment
      - Show manual entry secret as fallback
      - Verify enrollment with test code
      - Handle enrollment success/error
    - Redirect superadmin/client admin to enrollment on first login (if no factors enrolled)
  - [ ] Create MFA challenge flow:
    - Create `src/app/admin/mfa/challenge/page.tsx` (challenge page)
    - Create `src/components/auth/MFAChallenge.tsx`:
      - List enrolled factors
      - Code input field
      - Verify code and upgrade session to `aal2`
      - Handle challenge success/error
      - Redirect to intended destination after successful verification
  - [ ] Update login flow (`src/app/admin/login/page.tsx`):
    - After successful password login, check role requirements
    - If superadmin: Check if factors enrolled, redirect to enrollment or challenge
    - If client admin: Check if factors enrolled, redirect to enrollment or challenge (for sensitive routes)
    - Store intended destination for post-MFA redirect
  - [ ] Create MFA management UI:
    - Create `src/app/admin/settings/security/page.tsx` (admin security settings)
    - Create `src/components/auth/MFAManagement.tsx`:
      - Display enrolled factors list
      - Enroll new TOTP factor button
      - Remove factor button (with safety checks)
      - Show enrollment dates
      - Prevent removing last factor if role requires 2FA
    - Create `src/app/members/account/security/page.tsx` (member security settings - optional 2FA)
  - [ ] Update API routes for AAL checks:
    - Update sensitive admin API routes to check `aal` claim
    - Require `aal2` for destructive operations (archive, reset, user management)
    - Return 403 if `aal1` but `aal2` required
  - [ ] Add RLS policies for AAL enforcement (if needed):
    - Check `aal` claim in JWT for sensitive database operations
    - Require `aal2` for superadmin operations
  - [ ] Handle edge cases:
    - Session refresh maintains `aal2` status
    - Prevent unenrollment of last factor for roles requiring 2FA
    - Recovery process documentation for lost authenticator access
    - Multiple factor enrollment support (up to 10 factors)
  - [ ] Testing:
    - Test enrollment flow for superadmin and client admin
    - Test challenge flow after login
    - Test middleware enforcement for protected routes
    - Test API route AAL checks
    - Test multiple factor enrollment
    - Test unenrollment safety checks

- [ ] SMS/Phone-Based 2FA (Planned for Future)
  - [ ] Research SMS provider options (Twilio, MessageBird, Vonage, Textlocal)
  - [ ] Document SMS provider setup requirements
  - [ ] Plan SMS enrollment flow (similar to TOTP)
  - [ ] Plan SMS challenge flow
  - [ ] Note: Requires external SMS provider account and credentials
  - [ ] Note: Per-message costs apply (handled by provider)
  - [ ] Status: Deferred to future release (TOTP is primary method)

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
  - [ ] Set up `layout/`, `sections/`, `blocks/`, `content/`, `media/`
  - [ ] Create `src/components/site/` directory structure
  - [ ] Set up `site/pages/`, `site/config/`, `site/overrides/`, `site/experiments/`
  - [ ] Create base component structure with TypeScript interfaces

- [ ] Standby launch mode (Coming Soon)
  - [ ] Add env gate for public site mode (e.g., `NEXT_PUBLIC_SITE_MODE=coming_soon|live`)
  - [ ] Create `/coming-soon` route/page (public)
  - [ ] Gate public routes to `/coming-soon` when enabled (allow `/admin/*` and `/api/*`)
  - [ ] Add `noindex`/`nofollow` behavior for coming-soon mode (SEO safety)
  - [ ] Document Vercel env var setup for client deployments

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

- [ ] Build event calendar (public)
  - [ ] Create `src/app/(public)/events/page.tsx` (day/week/month/agenda views)
  - [ ] Implement event details modal on click
  - [ ] Add basic filters (date range navigation; optional "upcoming" quick view)

- [ ] Enhance homepage
  - [ ] Update `src/app/(public)/page.tsx` to use component composition
  - [ ] Create `src/components/site/pages/HomePage.tsx` (page composition using reusable sections, content from database)

- [ ] Enhance public layout
  - [ ] Update `src/app/(public)/layout.tsx` to use Header and Footer components
  - [ ] Apply design system variables
  - [ ] Add SEO metadata handling

### Phase 4B: Event Calendar (CMS + API + Subscriptions)

**Status**: Pending - Core feature, pairs with Phase 4 public calendar UI

- [ ] Create events schema
  - [ ] Add `events` table (title, description, start/end, all-day, location, status/published)
  - [ ] Add indexes for date range queries
  - [ ] Add optional fields to support future sync (e.g., `external_source`, `external_id`, `last_synced_at`)

- [ ] Build admin UI for events
  - [ ] Create `src/app/admin/events/page.tsx` (list/search)
  - [ ] Create `src/app/admin/events/new/page.tsx` (create)
  - [ ] Create `src/app/admin/events/[id]/page.tsx` (edit)
  - [ ] Create `src/components/events/EventEditor.tsx` (shared editor form)

- [ ] Add events API endpoints
  - [ ] Create `src/app/api/events/route.ts` (GET list + POST create)
  - [ ] Create `src/app/api/events/[id]/route.ts` (GET + PUT + DELETE)
  - [ ] Support date range filtering for list endpoint

- [ ] Add calendar subscription (ICS)
  - [ ] Create `GET /api/events/ics` endpoint returning `text/calendar`
  - [ ] Ensure ICS feed includes correct time zones and all-day handling

- [ ] Sync/import (defer detailed design; keep hooks ready)
  - [ ] Define a minimal “import format” for API-based event updates
  - [ ] Plan one-way sync/import from external calendars (e.g., Google/Outlook) as a follow-on task

### Phase 5: Membership Platform

**Status**: Pending - Core feature for protected content, depends on Phase 0 & 4

- [ ] Create membership database schema (simplified)
  - [ ] Create migration `supabase/migrations/002_membership_schema.sql`:
    - `membership_groups` table (name, slug, description, tier, ecommerce_tag, auto_assign_on_payment)
    - `members` table (references auth.users, email, display_name, status)
    - `user_memberships` junction table (member_id, membership_group_id, expires_at, assigned_via)
    - Note: No payment transaction tracking - all payment details stay in ecommerce platform
  - [ ] Add `access_level` and `required_membership_group_id` columns to `posts` table
  - [ ] Add `access_level` and `required_membership_group_id` columns to `galleries` table
  - [ ] Add indexes for performance (ecommerce_tag for webhook lookups, member_id)

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

- [ ] Admin UI for membership management (Easy CRM interface)
  - [ ] Create `src/app/admin/memberships/page.tsx` (list all membership groups)
  - [ ] Create `src/app/admin/memberships/new/page.tsx` (create new group)
  - [ ] Create `src/app/admin/memberships/[id]/page.tsx` (edit group)
  - [ ] Create `src/components/memberships/MembershipGroupEditor.tsx`:
    - Simple ecommerce tag field (text input for tag reference)
    - Auto-assign toggle checkbox
    - Clear instructions for setting up ecommerce integration
  - [ ] Create `src/app/admin/members/page.tsx` (CRM view - easy membership management):
    - List all members with their current memberships
    - Simple assign/remove buttons for each membership group
    - Member status management (active, inactive, suspended)
    - Set expiration dates
    - Bulk operations (assign multiple members to group)
    - Search and filter functionality
  - [ ] Create `src/app/admin/members/[id]/page.tsx` (member detail page):
    - View member profile and all memberships
    - One-click assign/remove memberships
    - Update member status
    - Set expiration dates per membership
    - View member activity (form submissions linked by email)
  - [ ] Create `src/components/memberships/MemberManagement.tsx` (easy-to-use interface)
  - [ ] Create `src/components/memberships/MemberList.tsx` (table view with actions)
  - [ ] Create `src/components/memberships/MembershipAssignment.tsx` (simple assign/remove component)
  - [ ] Create `src/app/admin/api-keys/page.tsx` (API key management for webhook endpoints)
  - [ ] Create `src/components/api/ApiKeyManager.tsx` (simple API key generation/management)

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
  - [ ] Create `src/app/api/memberships/[id]/assign/route.ts` (POST - API key auth for ecommerce)
  - [ ] Create `src/app/api/memberships/[id]/remove/route.ts` (POST - API key auth)
  - [ ] Create `src/app/api/members/route.ts` (GET list - admin only)
  - [ ] Create `src/app/api/members/[id]/route.ts` (GET details - admin only)
  - [ ] Create `src/app/api/members/[id]/memberships/route.ts` (POST assign, DELETE remove - admin only)
  - [ ] Create `src/app/api/members/[email]/route.ts` (GET member by email - API key auth)
  - [ ] Create `src/app/api/members/verify/route.ts` (POST verify membership - API key auth)
  - [ ] Create `src/app/api/member/profile/route.ts` (GET current member profile)
  - [ ] Update existing content API routes to respect access_level:
    - Update `src/app/api/posts/[id]/route.ts` to check membership
    - Update `src/app/api/galleries/[id]/route.ts` to check membership

- [ ] Ecommerce Integration API (simple tag-based system)
  - [ ] Create API key management system:
    - Create `api_keys` table (key_hash, name, rate_limit, created_at, expires_at)
    - Create `src/lib/api/api-keys.ts` utilities (validate, rate limiting)
    - Create API key generation endpoint (admin only): `POST /api/admin/api-keys`
  - [ ] Create payment webhook endpoints (simple tag matching):
    - Create `src/app/api/webhooks/payment/route.ts` (generic webhook handler)
    - Create `src/app/api/webhooks/payment/stripe/route.ts` (Stripe-specific handler)
    - Create `src/app/api/webhooks/payment/shopify/route.ts` (Shopify-specific handler)
    - Create `src/app/api/webhooks/payment/woocommerce/route.ts` (WooCommerce-specific handler)
    - Implement webhook signature verification per provider
    - Create `src/lib/webhooks/payment-processor.ts`:
      - `extractTagAndEmail()` - Extract tag and email from webhook payload (provider-specific)
      - `findMembershipByTag()` - Lookup membership group by `ecommerce_tag`
      - `assignMembershipOnPayment()` - Auto-assign membership if enabled
      - `handleWebhookError()` - Error handling and logging
  - [ ] Implement simple payment-to-membership flow:
    - Create `src/lib/memberships/payment-integration.ts`:
      - `findMembershipByTag()` - Lookup membership group by ecommerce_tag
      - `assignMembership()` - Simple assignment (no payment data)
      - `createOrUpdateMember()` - Create member profile if doesn't exist
      - `preventDuplicateAssignment()` - Idempotency check (email + tag combination)
    - Handle duplicate webhook prevention (idempotency based on email+tag)
    - Simple error handling and logging

- [ ] Member authentication middleware
  - [ ] Update `src/middleware.ts` to handle member routes (`/members/*`)
  - [ ] Add member session validation (separate from admin)
  - [ ] Implement protected content route checks

- [ ] Dashboard integration (CRM view)
  - [ ] Add membership statistics to admin dashboard
  - [ ] Show recent member registrations
  - [ ] Display membership group counts
  - [ ] Quick access to member management (`/admin/members`)
  - [ ] Link form submissions to member profiles (when email matches)
  - [ ] Unified customer view (form submissions + memberships)
  - [ ] Simple interface for client admins to manage memberships easily

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

### Phase 9: Storage Bucket Management & Image Optimization

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

- [ ] Image optimization system (Media Library enhancement)
  - [ ] Create `src/lib/media/image-optimization.ts`:
    - `generateImageVariants()` - Generate thumbnail, small, medium, large variants
    - `uploadImageVariants()` - Upload variants to Supabase Storage
    - `getImageUrl()` - Helper to get optimized image URL (CDN or local)
    - Standard sizes: Thumbnail (150×150), Small (400px), Medium (800px), Large (1200px)
    - WebP format conversion for variants (with fallback)
    - Path structure: `/media/{id}/original.{ext}`, `/media/{id}/large.webp`, etc.
  - [ ] Update media database schema:
    - Add columns for variant paths (thumbnail_path, small_path, medium_path, large_path)
    - Add metadata columns (width, height, format, file_size)
    - Store original path and all variant paths
  - [ ] Update `src/components/media/MediaUpload.tsx`:
    - Trigger image optimization on upload
    - Show upload progress for original + variants
    - Store variant metadata in database
  - [ ] Update `src/components/media/MediaLibrary.tsx`:
    - Display variant options when selecting images
    - Show image size information
    - Allow selection of specific variant for use
  - [ ] Create image optimization API route:
    - `POST /api/media/[id]/optimize` - Re-optimize existing image (admin only)
    - Handle optimization errors gracefully (fallback to original)
  - [ ] Add developer guidance utilities:
    - Create `src/lib/images/getImageUrl.ts` helper:
      - Automatically determines CDN vs local based on path
      - Supports size parameter (thumb, small, medium, large, original)
      - Returns optimized URL for CDN images
      - Returns local path for static assets
    - Document usage in component development guidelines
  - [ ] Update content components to use optimized images:
    - Update `PostEditor` to use optimized featured images
    - Update `GalleryEditor` to use optimized gallery images
    - Update public-facing components to use appropriate sizes

### Phase 10: API Enhancements

**Status**: Pending - Enhancements to existing APIs

- [ ] Enhance public API routes
  - [ ] Improve error handling in existing API routes
  - [ ] Add SEO metadata to post responses
  - [ ] Add pagination to gallery API
  - [ ] Add search/filter to posts API
  - [ ] Ensure all protected content endpoints check membership access

- [ ] Add form submission email notifications (Nodemailer/SMTP)
  - [ ] Add `nodemailer` dependency to the template
  - [ ] Document required env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
  - [ ] Create server-only mailer utility (e.g., `src/lib/email/mailer.ts`)
  - [ ] Update `POST /api/forms/[formId]/submit` to send email when `forms.settings.notifications.email` is set
  - [ ] Ensure failures do not break form submission (log and continue)
  - [ ] Add basic manual test plan for local + Vercel environments

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

### Phase 12: AI Chatbot with RAG (Retrieval-Augmented Generation)

**Status**: Planned - Future enhancement after core CMS features complete

**Goal**: Build custom AI chatbot that uses CMS content as knowledge base via RAG architecture.

- [ ] Set up vector database infrastructure
  - [ ] Enable Supabase PGVector extension in database
  - [ ] Create `content_embeddings` table with vector column
  - [ ] Create vector similarity indexes (ivfflat)
  - [ ] Create `chat_conversations` and `chat_messages` tables
  - [ ] Set up embedding generation pipeline (choose model: OpenAI, Anthropic, or open-source)

- [ ] Content indexing system
  - [ ] Create `src/lib/ai/content-indexer.ts`:
    - `indexContent()` - Generate embeddings for content piece
    - `reindexContent()` - Update embeddings when content changes
    - `chunkContent()` - Split large content into manageable chunks
    - `generateEmbedding()` - Call embedding API/model
    - `storeEmbedding()` - Save to vector database
  - [ ] Create content indexing hooks:
    - Auto-index on post/page/gallery/event creation/update
    - Batch indexing for existing content
    - Re-indexing utilities for admin
  - [ ] Create admin UI for indexing management:
    - `src/app/admin/settings/chatbot/indexing/page.tsx`
    - View indexed content status
    - Trigger manual re-indexing
    - View embedding statistics

- [ ] RAG retrieval system
  - [ ] Create `src/lib/ai/rag.ts`:
    - `queryEmbedding()` - Convert user query to embedding
    - `searchSimilarContent()` - Vector similarity search using PGVector
    - `retrieveContext()` - Get top-k relevant content chunks
    - `formatContext()` - Prepare context for LLM
  - [ ] Implement vector similarity search:
    - Use Supabase PGVector cosine similarity
    - Return top-k most relevant content chunks
    - Filter by content access level (public vs. member-only)

- [ ] LLM integration
  - [ ] Create `src/lib/ai/llm.ts`:
    - `generateResponse()` - Call LLM API with context + query
    - Support multiple providers (OpenAI, Anthropic, local)
    - Handle streaming responses (optional)
    - Error handling and retry logic
  - [ ] Configure LLM provider:
    - Set up API keys/authentication
    - Configure system prompts
    - Set response parameters (temperature, max tokens, etc.)
  - [ ] Create admin UI for LLM configuration:
    - `src/app/admin/settings/chatbot/config/page.tsx`
    - Select LLM provider
    - Configure system prompts
    - Set response style/tone

- [ ] Chat widget component
  - [ ] Create `src/components/public/chatbot/ChatWidget.tsx`:
    - Chat interface UI (messages, input, send button)
    - Conversation history display
    - Typing indicators
    - Responsive design matching design system
  - [ ] Create `src/components/public/chatbot/ChatMessage.tsx`:
    - Message bubble component
    - User vs. assistant styling
    - Timestamp display
  - [ ] Integrate chat widget into public layout:
    - Add to `src/app/(public)/layout.tsx`
    - Toggle show/hide functionality
    - Session management

- [ ] Chat API endpoints
  - [ ] Create `src/app/api/chat/route.ts`:
    - `POST /api/chat` - Send user message, get AI response
    - Handle conversation session
    - Call RAG retrieval + LLM generation
    - Store conversation history
  - [ ] Create `src/app/api/chat/conversations/route.ts`:
    - `GET /api/chat/conversations` - Get conversation history (if logged in)
  - [ ] Implement conversation management:
    - Session-based conversations (anonymous users)
    - Member-linked conversations (logged-in users)
    - Conversation persistence

- [ ] Membership-aware responses
  - [ ] Update RAG retrieval to check content access levels
  - [ ] Filter protected content based on user membership
  - [ ] Include membership context in LLM prompts
  - [ ] Handle redirects for protected content references
  - [ ] Test with different membership tiers

- [ ] Admin chatbot management UI
  - [ ] Create `src/app/admin/settings/chatbot/page.tsx`:
    - Enable/disable chatbot toggle
    - View conversation analytics
    - Link conversations to member profiles
    - Export conversations
  - [ ] Create `src/components/admin/ChatbotAnalytics.tsx`:
    - Popular queries
    - Conversation metrics
    - User engagement stats
  - [ ] Create conversation viewer:
    - View individual conversations
    - Link to member profiles
    - Moderate conversations (if needed)

- [ ] CRM integration
  - [ ] Link chat conversations to member profiles (by email/session)
  - [ ] Add chat history to CRM view (`/admin/members/[id]`)
  - [ ] Track chatbot engagement in member profiles
  - [ ] Export chat data for analysis

- [ ] Testing and optimization
  - [ ] Test RAG retrieval accuracy
  - [ ] Test LLM response quality
  - [ ] Test membership-aware filtering
  - [ ] Optimize vector search performance
  - [ ] Test conversation persistence
  - [ ] Load testing for chat widget
  - [ ] Monitor LLM API costs

- [ ] Documentation
  - [ ] Document RAG architecture
  - [ ] Document content indexing process
  - [ ] Document LLM provider setup
  - [ ] Document chatbot configuration
  - [ ] Document API endpoints

## Architecture Notes

### Authentication
- Using Supabase Auth with user metadata for multi-tenant access
- **Admin users**: `user_metadata: { tenant_id: "client_abc123", role: "admin|editor|viewer", type: "admin" }`
- **Member users**: `user_metadata: { tenant_id: "client_abc123", type: "member" }`
- Middleware validates tenant_id matches `NEXT_PUBLIC_CLIENT_SCHEMA`
- Dual authentication system: Admin (CMS) and Member (protected content)

### Two-Factor Authentication (2FA/MFA)
- **Primary Method**: TOTP (Time-Based One-Time Password) via authenticator apps
  - No external provider setup required
  - Works out-of-the-box with Supabase Auth
  - Required for superadmin (always) and client admin (sensitive operations)
- **Authenticator Assurance Levels (AAL)**: 
  - `aal1` = Password only
  - `aal2` = Password + 2FA verified
  - JWT `aal` claim checked in middleware and API routes
- **Enforcement**: 
  - Superadmin routes always require `aal2`
  - Client admin sensitive routes require `aal2`
  - Middleware redirects to `/admin/mfa/challenge` if `aal1` but `aal2` required
- **Enrollment Flow**: 
  - Superadmin/client admin prompted on first login
  - QR code display for TOTP enrollment
  - Multiple factors supported (up to 10) for backup/recovery
- **Planned**: SMS/Phone-based 2FA (requires external SMS provider - Twilio, MessageBird, etc.)
  - Deferred to future release
  - Will require SMS provider account and credentials configuration

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

### Membership Platform & CRM Integration
- Membership groups stored in client schema (membership_groups table)
- Members extend Supabase auth.users with profile in members table
- Many-to-many relationship: members can belong to multiple groups
- Content protection via access_level (public, members, group)
- Separate member authentication flow from admin authentication
- **CRM System**: Unified system for managing form submissions and memberships
  - Form submissions and memberships managed in same CRM interface
  - Link form submissions to member profiles (email matching)
  - Track customer journey from form submission to membership conversion
  - **Easy Admin Management**: Client admins can easily log in and manage memberships
    - Simple assign/remove interface
    - Member status management
    - Bulk operations
- **Simple Ecommerce Integration**: Tag-based reference system
  - Simple `ecommerce_tag` field in membership groups (no duplicate payment data)
  - Payment webhook endpoints match tag and assign membership
  - All payment details remain in ecommerce platform (not duplicated)
  - API key authentication for webhook endpoints
  - Simple payment-to-membership automatic flow

### Archive/Restore
- Schema renaming (fast, no data migration)
- Registry table in `public` schema for cross-schema queries
- Storage buckets renamed (not moved) for quick restore

### Image Storage & Optimization
- **Hybrid approach**: Local assets (`public/`) for static/brand assets, CDN (Supabase Storage) for user-uploaded content
- **Image optimization**: Automatic variant generation (thumbnail, small, medium, large) on upload
- **Storage paths**: Organized variant structure (`/media/{id}/original.{ext}`, `/media/{id}/large.webp`, etc.)
- **Developer decision framework**: Source (user-uploaded vs static), size, and critical path determine storage location
- **Helper utilities**: `getImageUrl()` automatically determines CDN vs local and returns optimized URLs
- **Standard sizes**: Thumbnail (150×150), Small (400px), Medium (800px), Large (1200px)
- **Format**: WebP for variants with fallback to original format

## Future Enhancements

- SEO tools and sitemap generation
- Analytics integration
- Email notifications for form submissions (Nodemailer/SMTP)
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
- **AI Chatbot with RAG:**
  - Custom AI chatbot using CMS content as knowledge base
  - RAG architecture with Supabase PGVector
  - Content indexing for posts, pages, galleries, events
  - Chat widget for public pages
  - Membership-aware responses
  - CRM integration for conversation history
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
