# Plan Log

This document tracks planned work, implementation phases, and backlog items for the Website-CMS project. Items are organized by priority and development phase.

## Implementation Phases (Priority Order)

### Phase 0: Supabase Auth Integration

**Status**: In Progress - Core authentication working, design system foundation complete, setup automation ready for testing

**NEXT STEP**: Test Automated Client Setup Script (see below)

- [x] Replace custom Auth API with Supabase Auth integration
  - [x] Update `src/lib/auth/` to use Supabase Auth instead of external API
  - [x] Remove `AUTH_API_URL` and `AUTH_API_KEY` environment variables (old api-client.ts deleted)
  - [x] Update `src/middleware.ts` to use Supabase Auth session validation
  - [x] Update `src/app/api/auth/login/route.ts` to use `supabase.auth.signInWithPassword()`
  - [x] Update `src/app/admin/login/page.tsx` to use Supabase Auth UI

- [x] Implement multi-tenant auth with user metadata
  - [x] Configure user metadata structure:
    - `user_metadata.type`: `superadmin | admin | member`
    - `user_metadata.role`: `superadmin | client_admin | editor | viewer | ...`
    - `user_metadata.tenant_id`: required for `admin` and `member` users (must match deployment schema)
    - `user_metadata.allowed_schemas`: optional allowlist for cross-tenant access (superadmin)
  - [x] Update middleware rules:
    - Admin area (`/admin/*`): require authenticated `type in ["superadmin","admin"]`
    - Client admin: enforce `tenant_id === NEXT_PUBLIC_CLIENT_SCHEMA`
    - Superadmin: allow bypass via `type="superadmin"` and `role="superadmin"` (optionally validate allowlist)
    - Member area (`/members/*`): require authenticated `type="member"` (ready for future implementation)
  - [x] Create `src/lib/auth/supabase-auth.ts` utilities:
    - `getCurrentUser()` - Get authenticated user with metadata
    - `getCurrentUserFromRequest()` - Get user from middleware (handles cookies via @supabase/ssr)
    - `validateTenantAccess()` - Ensure user can access current schema
    - `hasRole()` - Check user role permissions
    - Helper functions: `isSuperadmin()`, `isClientAdmin()`, `isMember()`
  - [x] Update all admin routes to use Supabase Auth session (session.ts updated, admin layout/page use getSession)
  - [x] Implement logout functionality in Sidebar component

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

- [ ] Test Automated Client Setup Script
  - [ ] Test `pnpm setup-client <test-schema-name>` script with a test schema (e.g., `test_client_setup`)
  - [ ] Verify script creates schema successfully
  - [ ] Verify script runs all migrations correctly (schema name replacement works)
  - [ ] Verify script creates RPC functions
  - [ ] Verify script inserts default settings
  - [ ] Verify script enables RLS and policies
  - [ ] Verify script creates storage bucket
  - [ ] Manually expose test schema in Supabase Dashboard (Settings → API → Exposed Schemas)
  - [ ] Verify design system loads from database (no errors)
  - [ ] Test authentication with test schema
  - [ ] Document any issues or improvements needed for the script
  - [ ] Clean up test schema after testing (optional: keep for reference)

- [ ] Template Subdomain Deployment Setup
  - [ ] Set up Vercel project for template repository
  - [ ] Configure subdomain (e.g., `template.yourdomain.com` or `dev.yourdomain.com`)
  - [ ] Create test schema in Supabase (e.g., `template_dev`) using automated script
  - [ ] Expose schema in Supabase Dashboard (Settings → API → Exposed Schemas)
  - [ ] Configure Vercel environment variables:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `NEXT_PUBLIC_CLIENT_SCHEMA=template_dev`
    - `NEXT_PUBLIC_APP_URL=https://template.yourdomain.com`
  - [ ] Create superadmin user in Supabase Auth with proper metadata
  - [ ] Test authentication flow on deployed subdomain
  - [ ] Verify middleware and route protection work correctly
  - [ ] Document deployment process for future client setups
  - [ ] Set up automatic deployments (Vercel auto-deploy on push to main)

- [x] Third-Party Integrations & Head Section Management
  - [x] Create database schema for integrations:
    - Created dedicated `integrations` table (Option B) with name, enabled, config JSONB
    - Migration file: `supabase/migrations/002_integrations_schema.sql`
    - Default entries for: Google Analytics, VisitorTracking.com, SimpleCommenter.com
  - [x] Create integration utilities (`src/lib/supabase/integrations.ts`):
    - `getIntegrations()` - Load all integration settings
    - `updateIntegration()` - Update integration configuration (superadmin only)
    - `getIntegrationConfig()` - Get specific integration config
    - `getIntegrationsMap()` - Get integrations as keyed object
    - `isIntegrationActive()` - Check if integration is enabled and configured
  - [x] Create superadmin integrations UI:
    - Created `src/app/admin/super/integrations/page.tsx` (superadmin-only)
    - Created `src/components/superadmin/IntegrationsManager.tsx`:
      - Google Analytics: Input field for Measurement ID (e.g., `G-XXXXXXXXXX`)
      - VisitorTracking.com: Input field for Vendor UID
      - SimpleCommenter.com: Input field for Vendor UID
      - Enable/disable checkboxes for each integration
      - Save/Update functionality with loading states
      - Status indicators (configured vs. not configured) with icons
      - Display current vendor UIDs/IDs
    - Route requires superadmin role (2FA check added as TODO for when 2FA is implemented)
  - [x] Implement script injection in public layout:
    - Updated `src/app/(public)/layout.tsx` to load integration settings
    - Inject Google Analytics script (gtag.js) with Measurement ID
    - Inject VisitorTracking.com script with Vendor UID
    - Inject SimpleCommenter.com script with Vendor UID
    - Use Next.js `<Script>` component with appropriate loading strategies:
      - Google Analytics: `strategy="afterInteractive"`
      - VisitorTracking.com: `strategy="afterInteractive"`
      - SimpleCommenter.com: `strategy="lazyOnload"`
    - Scripts only load on public pages (in `(public)/layout.tsx`, not in admin routes)
  - [x] Create API route for integration management:
    - Created `src/app/api/admin/integrations/route.ts` (GET, PUT - superadmin only)
    - Validates superadmin access
    - Validates integration names and config formats
    - Handles integration configuration updates
    - 2FA requirement added as TODO for when 2FA is implemented
  - [ ] Testing:
    - Test script injection on public pages
    - Verify scripts don't load in admin area
    - Test integration configuration UI
    - Verify vendor UIDs are correctly injected into scripts
    - Test enable/disable functionality
    - Verify superadmin-only access control

- [x] Two-Factor Authentication (2FA/MFA) Implementation
  - [x] Create MFA utilities (`src/lib/auth/mfa.ts`):
    - `enrollTOTP()` - Enroll TOTP factor (generate QR code)
    - `challengeMFA()` - Challenge enrolled factors
    - `verifyMFA()` - Verify MFA code
    - `getEnrolledFactors()` - List user's enrolled factors
    - `unenrollFactor()` - Remove enrolled factor
    - `getAAL()` - Get current Authenticator Assurance Level from session
    - `requiresAAL2()` - Check if route/role requires aal2
    - `isDevModeBypassEnabled()` - Check if dev mode bypasses 2FA (development only)
  - [x] Add dev mode 2FA bypass:
    - Created `isDevModeBypassEnabled()` function that checks `NEXT_PUBLIC_DEV_BYPASS_2FA=true` in development only
    - Updated `requiresAAL2()` to return false when dev bypass is enabled
    - Updated middleware to skip 2FA checks when dev bypass is enabled
    - **Note**: Authentication is still required - only 2FA is bypassed in dev mode
    - **Environment Variable**: Set `NEXT_PUBLIC_DEV_BYPASS_2FA=true` in `.env.local` for development
  - [x] Update middleware (`src/middleware.ts`) for AAL enforcement:
    - [x] Check `aal` claim in JWT token (via `requiresAAL2()` and `getAAL()` functions)
    - [x] Superadmin routes (`/admin/super/*`): Always require `aal2` (enforced in middleware)
    - [x] Client admin sensitive routes: Require `aal2` for `/admin/settings`, `/admin/members`, `/admin/memberships`, `/admin/settings/archive`, `/admin/settings/reset` (enforced via `requiresAAL2()`)
    - [x] Redirect to `/admin/mfa/challenge` if `aal1` but `aal2` required (middleware logic implemented)
    - [x] Dev mode bypass integrated (skips AAL2 check when `NEXT_PUBLIC_DEV_BYPASS_2FA=true`)
  - [x] Create MFA enrollment flow:
    - [x] Create `src/app/admin/mfa/enroll/page.tsx` (enrollment page)
    - [x] Create `src/components/auth/MFAEnroll.tsx`:
      - Display QR code for TOTP enrollment
      - Show manual entry secret as fallback
      - Verify enrollment with test code
      - Handle enrollment success/error
    - [x] Redirect superadmin/client admin to enrollment on first login (if no factors enrolled)
  - [x] Create MFA challenge flow:
    - [x] Create `src/app/admin/mfa/challenge/page.tsx` (challenge page)
    - [x] Create `src/components/auth/MFAChallenge.tsx`:
      - List enrolled factors
      - Code input field
      - Verify code and upgrade session to `aal2`
      - Handle challenge success/error
      - Redirect to intended destination after successful verification
  - [x] Update login flow (`src/app/admin/login/page.tsx`):
    - [x] After successful password login, check role requirements
    - [x] If superadmin: Check if factors enrolled, redirect to enrollment or challenge
    - [x] If client admin: Check if factors enrolled, redirect to enrollment or challenge (for sensitive routes)
    - [x] Store intended destination for post-MFA redirect
  - [x] Create MFA management UI:
    - [x] Create `src/app/admin/settings/security/page.tsx` (admin security settings)
    - [x] Create `src/components/auth/MFAManagement.tsx`:
      - Display enrolled factors list
      - Enroll new TOTP factor button
      - Remove factor button (with safety checks)
      - Show enrollment dates
      - Prevent removing last factor if role requires 2FA
    - [ ] Create `src/app/members/account/security/page.tsx` (member security settings - optional 2FA) - Deferred to Phase 5 (Membership Platform)
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

- [x] Enhance settings table schema
  - [x] Update migration to include design system structure in settings table
    - Created `supabase/migrations/003_design_system_settings.sql` with default design system values
  - [x] Add default design system values (fonts, colors)
    - Default theme: "default"
    - Default fonts: Inter (primary and secondary) from Google Fonts
    - Default color palette: Modern blue/purple theme with full color set
    - Site metadata defaults (name, description)
  - [x] Create settings utility functions in `src/lib/supabase/settings.ts`
    - `getSetting()` - Get single setting by key
    - `setSetting()` - Set/update single setting
    - `getSettings()` - Get multiple settings by keys
    - `getDesignSystemConfig()` - Get complete design system config with defaults
    - `updateDesignSystemConfig()` - Update design system configuration
    - `getSiteMetadata()` - Get site metadata
    - `updateSiteMetadata()` - Update site metadata
  - [x] Create TypeScript types for design system (`src/types/design-system.ts`)
    - `FontConfig` - Font configuration interface
    - `ColorPalette` - Color palette interface
    - `DesignSystemConfig` - Complete design system structure
    - `SiteMetadata` - Site metadata interface
    - `DEFAULT_DESIGN_SYSTEM` - Default values constant

- [x] Design system core implementation
  - [x] Create `src/lib/design-system.ts` utility for loading/applying design system
    - `designSystemToCSSVariables()` - Convert config to CSS variables
    - `generateGoogleFontsURL()` - Generate Google Fonts URL
    - `loadDesignSystem()` - Main function to load and prepare design system
  - [x] Create `src/components/design-system/DesignSystemProvider.tsx` to inject CSS variables
    - Client component that applies CSS variables to document root
    - Handles Google Fonts loading dynamically
    - Updates variables when config changes
  - [x] Update `src/app/layout.tsx` to load design system settings and apply CSS variables
    - Loads design system config from database (server-side)
    - Injects CSS variables in `<head>` via inline style (prevents FOUC)
    - Loads Google Fonts stylesheet
    - Wraps children with DesignSystemProvider for dynamic updates
  - [x] Create TypeScript types for design system settings
    - Already completed in previous step (`src/types/design-system.ts`)

- [x] Create public component directory structure
  - [x] Create `src/components/public/` directory structure
    - Created `layout/`, `sections/`, `blocks/`, `content/`, `media/` directories
    - Added README.md with component guidelines
    - Added base TypeScript interfaces (`src/components/public/types.ts`)
  - [x] Create `src/components/site/` directory structure
    - Created `site/pages/`, `site/config/`, `site/overrides/`, `site/experiments/` directories
    - Added README.md with promotion workflow
  - [x] Create base component structure with TypeScript interfaces
    - `BaseComponentProps` - Base props for all components
    - `SectionProps` - Props for section components
    - `MediaProps` - Props for media components
    - `LayoutProps` - Props for layout components
    - `ThemeConfig` - Theme configuration interface

- [x] Standby launch mode (Coming Soon)
  - [x] Add env gate for public site mode (e.g., `NEXT_PUBLIC_SITE_MODE=coming_soon|live`)
    - Environment variable: `NEXT_PUBLIC_SITE_MODE` (defaults to "live")
    - Values: "coming_soon" or "live"
  - [x] Create `/coming-soon` route/page (public)
    - Created `src/app/(public)/coming-soon/page.tsx`
    - Displays site name and description from settings
    - Uses design system fonts and colors
    - Includes noindex/nofollow metadata for SEO safety
  - [x] Gate public routes to `/coming-soon` when enabled (allow `/admin/*` and `/api/*`)
    - Updated middleware to check `NEXT_PUBLIC_SITE_MODE`
    - Redirects all public routes to `/coming-soon` when mode is "coming_soon"
    - Admin routes (`/admin/*`) and API routes (`/api/*`) are always accessible
    - Coming-soon page itself is accessible
  - [x] Add `noindex`/`nofollow` behavior for coming-soon mode (SEO safety)
    - Metadata includes `robots: { index: false, follow: false }`
  - [ ] Document Vercel env var setup for client deployments
    - TODO: Add to deployment documentation

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

### Phase 5A: CRM MVP (Minimal CRM for Membership Integration)

**Status**: Pending - Minimal CRM required for Phase 5 membership features

**Purpose**: Provide basic CRM functionality needed for Phase 5 (linking form submissions to members, unified customer view). Full CRM implementation comes in Phase 10B.

**Scope**: Minimal schema and utilities - just enough to store contacts and link them to members.

- [ ] Create minimal CRM schema (MVP)
  - [ ] Create migration `supabase/migrations/004_crm_mvp.sql`:
    - [ ] `crm_contacts` table (minimal: id, email, firstname, lastname, fullname, source, form_id, created_at, updated_at)
    - [ ] `forms` table (minimal: id, name, slug, settings JSONB) - form registry for tracking form submissions
    - [ ] Add indexes for email lookups (for member linking)
    - [ ] Note: Full CRM schema (companies, emails, phones, consents, DND) comes in Phase 10B

- [ ] Create minimal CRM utilities (MVP)
  - [ ] Create `src/lib/supabase/crm-mvp.ts`:
    - [ ] `createContact()` - Create contact from form submission (minimal fields)
    - [ ] `getContactByEmail()` - Get contact by email (for member linking)
    - [ ] `linkContactToMember()` - Link contact to member profile (by email match)
    - [ ] `getMemberContacts()` - Get all contacts linked to member (by email)
    - [ ] `getFormSubmissions()` - Get form submissions for contact (basic)

- [ ] Update form submission API (MVP)
  - [ ] Update `POST /api/forms/[formId]/submit` to create minimal contact record
    - [ ] Extract email, name fields from form data
    - [ ] Create contact in `crm_contacts` table
    - [ ] Link to form via `form_id`
    - [ ] Store source as 'contact_form'
    - [ ] Note: Full duplicate detection, consent management, DND comes in Phase 10B

- [ ] Create minimal member-CRM linking
  - [ ] Create utility `src/lib/memberships/member-crm-link.ts`:
    - [ ] `linkMemberToContacts()` - Link member to existing contacts (by email match)
    - [ ] `getMemberActivity()` - Get form submissions linked to member
  - [ ] Update member detail page to show linked contacts (basic view)
    - [ ] Show form submissions linked by email
    - [ ] Basic activity timeline

**Note**: This MVP provides just enough CRM to support Phase 5's "link form submissions to members" feature. Full CRM (companies, relational emails/phones, consent management, DND, duplicate detection) will be implemented in Phase 10B.

### Phase 5: Membership Platform

**Status**: Pending - Core feature for protected content, depends on Phase 0, 4, and 5A (CRM MVP)

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
    - View member activity (form submissions linked by email) - **Requires Phase 5A (CRM MVP)**
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
  - [ ] Link form submissions to member profiles (when email matches) - **Requires Phase 5A (CRM MVP)**
  - [ ] Unified customer view (form submissions + memberships) - **Requires Phase 5A (CRM MVP)**
  - [ ] Simple interface for client admins to manage memberships easily
  - [ ] **Note**: Full CRM features (companies, consents, DND, duplicate detection) come in Phase 10B

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

### Phase 10B: CRM-First Forms & Compliance System (Full Implementation)

**Status**: Pending - Full CRM implementation building on Phase 5A MVP

**Priority**: High - Required for form submissions and marketing compliance (GDPR, ICANN, TCPA)

**Note**: Phase 5A provides minimal CRM (basic contacts, form linking). This phase expands to full CRM with companies, relational data, consent management, DND, and compliance features.

- [ ] Create CRM database schema
  - [ ] Create migration `supabase/migrations/004_crm_schema.sql`:
    - [ ] `crm_custom_fields` table (name, label, type, validation_rules JSONB)
    - [ ] `crm_companies` table (name, slug, email, industry, category, tags, company_size, website, description, address fields, custom_data JSONB, status, notes)
    - [ ] `crm_contacts` table (firstname, lastname, fullname, category, custom_data JSONB, dnd_status, source, form_id, status, duplicate_status, potential_duplicate_of, notes)
    - [ ] `crm_contact_emails` table (contact_id, email, type, is_primary) - relational emails
    - [ ] `crm_contact_phones` table (contact_id, phone, type, is_primary) - relational phones
    - [ ] `crm_contact_companies` table (contact_id, company_id, role, department, is_primary, start_date, end_date) - many-to-many
    - [ ] `crm_consents` table (contact_id, consent_type, consented, method, source, ip_address, user_agent, consent_text, consented_at, withdrawn_at) - marketing consent audit trail
    - [ ] `crm_dnd_history` table (contact_id, dnd_status, reason, method, source, set_by, set_at, notes) - DND audit trail
    - [ ] `forms` table (name, slug, field_mappings JSONB, settings JSONB) - form registry (developer helper)
    - [ ] `cookie_consents` table (contact_id, member_id, preferences JSONB, consent_version, ip_address, user_agent, consented_at, session_id) - cookie consent storage
    - [ ] Add indexes for performance (email lookups, company relationships, consent queries)
    - [ ] Add foreign key constraints and cascade deletes

- [ ] Create CRM utilities
  - [ ] Create `src/lib/supabase/crm.ts`:
    - [ ] `getCRMFields()` - Get all CRM fields (staple + custom)
    - [ ] `getCustomFields()` - Get custom CRM fields
    - [ ] `createCustomField()` - Create custom CRM field
    - [ ] `updateCustomField()` - Update custom CRM field
    - [ ] `getContacts()` - List contacts with filtering (status, DND, consent, company)
    - [ ] `getContact()` - Get contact details (with emails, phones, companies, consents, DND history)
    - [ ] `createContact()` - Create contact record
    - [ ] `updateContact()` - Update contact record
    - [ ] `mergeContacts()` - Merge duplicate contacts
    - [ ] `detectDuplicates()` - Duplicate detection logic (perfect match, partial match)
    - [ ] `getCompanies()` - List companies with filtering
    - [ ] `getCompany()` - Get company details (with contacts)
    - [ ] `createCompany()` - Create company record
    - [ ] `updateCompany()` - Update company record
    - [ ] `linkContactToCompany()` - Link contact to company (many-to-many)
    - [ ] `getConsents()` - Get consent history for contact
    - [ ] `recordConsent()` - Record marketing consent (with audit trail)
    - [ ] `withdrawConsent()` - Withdraw consent (sets DND automatically)
    - [ ] `getDNDHistory()` - Get DND history for contact
    - [ ] `setDNDStatus()` - Set DND status (automatic or manual)
    - [ ] `checkDNDStatus()` - Check if contact has DND for channel

- [ ] Implement form submission workflow
  - [ ] Update `POST /api/forms/[formId]/submit` route:
    - [ ] Validate form data against CRM field validation rules
    - [ ] Perform duplicate detection (perfect match → update, partial match → flag for review, no match → create new)
    - [ ] Create/update CRM contact record directly (no staging table)
    - [ ] Create email/phone records in relational tables (support multiple per contact)
    - [ ] Handle company linking (autocomplete existing or create new)
    - [ ] Process marketing consents (email_marketing, phone_marketing) with audit trail (IP, user agent, timestamp)
    - [ ] Set DND status based on consent (no consent = DND for that channel)
    - [ ] Link cookie consent to contact if user identified
    - [ ] Send email notification to admin if configured (Nodemailer)
    - [ ] Return success/error response

- [ ] Create form registry UI (developer helper)
  - [ ] Create `src/app/admin/crm/forms/page.tsx` (form registry list)
  - [ ] Create `src/app/admin/crm/forms/new/page.tsx` (create form registry entry)
  - [ ] Create `src/app/admin/crm/forms/[id]/page.tsx` (edit form registry entry)
  - [ ] Create `src/components/crm/FormRegistryEditor.tsx`:
    - [ ] Display available CRM fields (staple + custom) with copy/paste field references
    - [ ] Field mappings JSONB editor (for developer reference)
    - [ ] Form settings (success_message, redirect_url, notifications)
    - [ ] Suggested field combinations for common form types
    - [ ] Field validation rules display

- [ ] Create CRM admin UI (contacts and companies)
  - [ ] Create `src/app/admin/crm/page.tsx` (CRM dashboard - contacts and companies overview)
  - [ ] Create `src/app/admin/crm/contacts/page.tsx` (contact list with filtering/search)
  - [ ] Create `src/app/admin/crm/contacts/[id]/page.tsx` (contact detail view):
    - [ ] Display all email addresses and phone numbers (relational)
    - [ ] Display all company relationships (with roles, primary company indicator)
    - [ ] Display consent history (with audit trail - IP, timestamp, consent text)
    - [ ] Display DND status and history timeline
    - [ ] Display custom field values
    - [ ] Display interaction history
    - [ ] Merge duplicate contacts action
    - [ ] Status management (new, contacted, archived)
    - [ ] Notes and follow-up tracking
    - [ ] Export contact data (CSV, with DND/consent filters)
  - [ ] Create `src/app/admin/crm/companies/page.tsx` (company list with filtering)
  - [ ] Create `src/app/admin/crm/companies/[id]/page.tsx` (company detail view):
    - [ ] Display all contacts at company (with roles, primary contact indicator)
    - [ ] Display company email, industry, category, tags
    - [ ] Display location data
    - [ ] Display custom field values
    - [ ] Display notes
    - [ ] Company-based email marketing (send to all contacts, respecting DND)
  - [ ] Create `src/components/crm/ContactList.tsx` (table view with actions)
  - [ ] Create `src/components/crm/ContactDetail.tsx` (comprehensive contact view)
  - [ ] Create `src/components/crm/CompanyList.tsx` (table view with filtering)
  - [ ] Create `src/components/crm/CompanyDetail.tsx` (comprehensive company view)
  - [ ] Create `src/components/crm/DuplicateReview.tsx` (review and merge potential duplicates)
  - [ ] Create `src/components/crm/ConsentHistory.tsx` (consent timeline with audit trail)
  - [ ] Create `src/components/crm/DNDManagement.tsx` (DND status display and management)

- [ ] Implement consent management system
  - [ ] Create `src/lib/compliance/consent.ts`:
    - [ ] `recordMarketingConsent()` - Record consent with audit trail (IP, user agent, timestamp, consent text)
    - [ ] `withdrawConsent()` - Withdraw consent (updates crm_consents, sets DND if all withdrawn)
    - [ ] `getConsentHistory()` - Get consent history for contact
    - [ ] `checkConsentStatus()` - Check if contact has consented to channel
    - [ ] `exportConsentAuditTrail()` - Export consent data for GDPR requests
  - [ ] Create consent UI components:
    - [ ] `src/components/crm/ConsentBadge.tsx` - Visual consent indicators (✅ Consented, ❌ Withdrawn)
    - [ ] `src/components/crm/ConsentTimeline.tsx` - Consent history timeline
    - [ ] `src/components/crm/ManualConsentRecord.tsx` - Manual consent recording (for phone/offline)
  - [ ] Create unsubscribe endpoint:
    - [ ] `POST /api/crm/contacts/[id]/unsubscribe` - Unsubscribe endpoint (sets DND, records consent withdrawal)
    - [ ] One-click unsubscribe link generation for emails

- [ ] Implement DND (Do Not Disturb) status management
  - [ ] Create `src/lib/compliance/dnd.ts`:
    - [ ] `setDNDStatus()` - Set DND status (automatic or manual, with reason tracking)
    - [ ] `getDNDHistory()` - Get DND history for contact
    - [ ] `checkDNDStatus()` - Check if contact has DND for channel (email, phone, all)
    - [ ] `enforceDND()` - Enforce DND before sending emails/calls
  - [ ] Automatic DND triggers:
    - [ ] On unsubscribe link click → Set `dnd_status: 'email'`
    - [ ] On form submission (no consent) → Set DND for that channel
    - [ ] On email bounce (hard bounce) → Auto-set `dnd_status: 'email'`
    - [ ] On spam complaint → Auto-set `dnd_status: 'all'`
    - [ ] All DND changes logged in `crm_dnd_history` with reason and method
  - [ ] Manual DND (admin override):
    - [ ] Admin can manually set DND status in CRM
    - [ ] Tracks who set it and why in `crm_dnd_history`
  - [ ] DND enforcement:
    - [ ] Email marketing: Check DND before sending (must not be 'email' or 'all')
    - [ ] Phone marketing: Check DND before calling (must not be 'phone' or 'all')
    - [ ] Export filters: Option to exclude DND contacts from marketing exports

- [ ] Implement cookie consent management
  - [ ] Create cookie consent database schema (already in CRM schema migration)
  - [ ] Create `src/lib/compliance/cookies.ts`:
    - [ ] `getCookieConsent()` - Get consent preferences (from localStorage or database)
    - [ ] `saveCookieConsent()` - Save consent (localStorage + database if user identified)
    - [ ] `updateCookieConsent()` - Update consent preferences
    - [ ] `checkCookieCategory()` - Check if user consented to category
    - [ ] `linkConsentToContact()` - Link cookie consent to CRM contact (when form submitted)
    - [ ] `linkConsentToMember()` - Link cookie consent to member (when logged in)
  - [ ] Create cookie consent UI components:
    - [ ] `src/components/public/cookies/CookieBanner.tsx` - Cookie banner (first visit)
    - [ ] `src/components/public/cookies/CookiePreferences.tsx` - Preferences modal/page
    - [ ] `src/components/public/cookies/CookiePolicy.tsx` - Cookie policy page component
  - [ ] Create cookie consent API endpoints:
    - [ ] `POST /api/cookies/consent` - Submit cookie consent preferences
    - [ ] `GET /api/cookies/consent` - Get current consent preferences (if user identified)
    - [ ] `PUT /api/cookies/consent` - Update consent preferences
    - [ ] `GET /api/cookies/policy` - Get cookie policy content (public)
  - [ ] Implement client-side cookie control:
    - [ ] Before setting non-essential cookies, check localStorage consent
    - [ ] Only set cookies for categories user has consented to
    - [ ] Third-party scripts (analytics, marketing) only load if consent given
    - [ ] Dynamic script loading based on consent preferences
  - [ ] Create cookie policy page:
    - [ ] `src/app/(public)/cookie-policy/page.tsx` - Public cookie policy page (admin-editable)
    - [ ] Lists all cookie categories and specific cookies used
    - [ ] Explains how to manage preferences
  - [ ] Create admin cookie configuration:
    - [ ] `src/app/admin/settings/cookies/page.tsx` - Cookie settings configuration
    - [ ] Enable/disable cookie consent banner
    - [ ] Configure cookie categories (add/edit/remove)
    - [ ] Set cookie descriptions and purposes
    - [ ] Configure third-party services (Google Analytics, Facebook Pixel, etc.)
    - [ ] Set cookie policy page URL
    - [ ] Configure consent expiration
    - [ ] Set consent version (increment when policy changes)
    - [ ] Editable cookie policy content (rich text editor)

- [ ] Create CRM API endpoints
  - [ ] `GET /api/crm/contacts` - List contacts (admin, with filtering)
  - [ ] `GET /api/crm/contacts/[id]` - Get contact details (includes consents, DND history)
  - [ ] `POST /api/crm/contacts/[id]/merge` - Merge duplicate contacts (admin)
  - [ ] `POST /api/crm/contacts/[id]/unsubscribe` - Unsubscribe endpoint (sets DND, records consent withdrawal)
  - [ ] `PUT /api/crm/contacts/[id]` - Update contact (admin)
  - [ ] `DELETE /api/crm/contacts/[id]` - Delete contact (admin)
  - [ ] `GET /api/crm/companies` - List companies (admin, with filtering)
  - [ ] `GET /api/crm/companies/[id]` - Get company details (includes all contacts)
  - [ ] `POST /api/crm/companies` - Create company (admin)
  - [ ] `PUT /api/crm/companies/[id]` - Update company (admin)
  - [ ] `DELETE /api/crm/companies/[id]` - Delete company (admin)
  - [ ] `GET /api/crm/contacts/[id]/consents` - Get consent history for contact
  - [ ] `POST /api/crm/contacts/[id]/consents` - Record consent (admin or via form submission)
  - [ ] `POST /api/crm/contacts/[id]/consents/withdraw` - Withdraw consent (sets DND automatically)
  - [ ] `GET /api/crm/contacts/[id]/dnd-history` - Get DND history for contact
  - [ ] `PUT /api/crm/contacts/[id]/dnd-status` - Update DND status (admin)

- [ ] Update form submission email notifications
  - [ ] Integrate Nodemailer with CRM form submission workflow
  - [ ] Send email notification when form submitted (if configured in form registry settings)
  - [ ] Include contact details and consent status in notification
  - [ ] Respect DND status (don't send notification if contact has DND for email)

- [ ] Testing and validation
  - [ ] Test duplicate detection logic (perfect match, partial match, no match)
  - [ ] Test company linking (existing vs new company creation)
  - [ ] Test consent recording with audit trail (IP, user agent, timestamp)
  - [ ] Test DND status management (automatic and manual)
  - [ ] Test cookie consent storage (localStorage and database)
  - [ ] Test cookie consent linking to CRM contacts
  - [ ] Test form submission workflow end-to-end
  - [ ] Test CRM admin UI (contacts, companies, consents, DND)
  - [ ] Test compliance features (consent withdrawal, DND enforcement, export audit trails)
  - [ ] Test API endpoints (authentication, filtering, CRUD operations)

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

### Phase 13: Component Library Reference System

**Status**: Planned - Nice-to-have feature that greatly aids in deploying future client sites

**Priority**: Low - Not critical for MVP, but significantly improves developer productivity for future client deployments

**Purpose**: Create a searchable component library reference in superadmin area that serves as the starting point for component development. Developers search the library first, create component specs if needed, then build components that are tightly linked to library entries. The system auto-discovers components, extracts metadata from header comments, and provides visual reference (screenshots/wireframes) to help developers find, understand, and reuse components.

- [ ] Create component library database schema
  - [ ] Create migration `supabase/migrations/005_component_library.sql`:
    - [ ] `component_library` table (name, library_entry_id UUID UNIQUE, file_path, import_path, category, theme, location, description, props_schema JSONB, usage_examples JSONB, dependencies, design_tokens, screenshot_url, wireframe_url, preview_images JSONB, requirements_screenshot_url, requirements_text, development_status, is_linked_to_file, assigned_to, priority, estimated_complexity, planned_at, started_at, completed_at, author, dates, search_text TSVECTOR)
    - [ ] Add indexes for category, theme, location, development_status, and full-text search
    - [ ] Create Supabase Storage bucket `component-library/` for image storage

- [ ] Build component scanner/auto-discovery system
  - [ ] Create `src/lib/components/scanner.ts`:
    - [ ] `scanComponents()` - Recursively scan `src/components/` directory
    - [ ] `extractMetadata()` - Parse JSDoc-style header comments
    - [ ] `parseProps()` - Extract props from TypeScript interfaces
    - [ ] `detectComponentInfo()` - Detect category, theme, location from file path
    - [ ] `linkComponentToLibrary()` - Link component file to library entry (via @library_id or name match)
    - [ ] `updateComponentLibrary()` - Update database with discovered components
    - [ ] `updateDevelopmentStatus()` - Auto-update status based on component file existence and completeness
  - [ ] Create component metadata parser:
    - [ ] Parse `@library_id` tag (links component to library entry)
    - [ ] Parse `@component`, `@category`, `@theme`, `@description` tags
    - [ ] Parse `@props` section for prop definitions
    - [ ] Extract `@usage` code blocks
    - [ ] Extract `@dependencies`, `@example`, `@author`, dates
    - [ ] Use TypeScript compiler API to parse component files for additional prop info

- [ ] Create component library utilities
  - [ ] Create `src/lib/components/library.ts`:
    - [ ] `getComponents()` - List components with filtering/search
    - [ ] `getComponent()` - Get component details by ID or name
    - [ ] `searchComponents()` - Full-text search across components
    - [ ] `getComponentsByCategory()` - Filter by category
    - [ ] `getComponentsByTheme()` - Filter by theme
    - [ ] `getComponentsByStatus()` - Filter by development status
    - [ ] `createComponentSpec()` - Create new library entry (component spec)
    - [ ] `updateComponentMetadata()` - Update component metadata
    - [ ] `linkComponentImage()` - Link screenshot/wireframe to component
    - [ ] `updateDevelopmentStatus()` - Update component development status
    - [ ] `generateComponentTemplate()` - Generate component file template from library entry
    - [ ] `linkComponentFile()` - Link component file to library entry

- [ ] Build superadmin component library UI
  - [ ] Create `src/app/admin/super/components/page.tsx` (component library list):
    - [ ] Search bar (full-text search)
    - [ ] Filter controls (category, theme, location, promotable status, development_status)
    - [ ] Sort options (name, category, last updated, status)
    - [ ] Grid/List view toggle
    - [ ] Component cards with thumbnails and status badges
    - [ ] Statistics dashboard (total components, by category, by theme, by status)
    - [ ] Development queue view (planned components)
    - [ ] "Create New Component" button (prominent)
  - [ ] Create `src/app/admin/super/components/new/page.tsx` (create component spec):
    - [ ] Component spec form (name, category, theme, location, description)
    - [ ] Requirements text/prompt input
    - [ ] Upload requirements screenshot/wireframe
    - [ ] Set priority, complexity, assign to developer
    - [ ] Creates library entry with status "planned"
    - [ ] Generates unique library_entry_id
  - [ ] Create `src/app/admin/super/components/[id]/page.tsx` (component detail):
    - [ ] Component overview (name, description, file path, import path, library_entry_id)
    - [ ] Development status section (status badge, timeline, assigned developer)
    - [ ] Requirements section (screenshot/prompt - shown when status is "planned" or "in_progress")
    - [ ] "Start Development" button (creates component file template, links to library entry, updates status)
    - [ ] Visual reference section (screenshot, wireframe, example images)
    - [ ] Props table (name, type, required, default, description)
    - [ ] Usage examples (code snippets with syntax highlighting)
    - [ ] Dependencies list (with links to dependency components)
    - [ ] Design tokens used
    - [ ] Use cases and related components
    - [ ] Actions (view source, copy import, copy example, open in editor, update status)
  - [ ] Create development status management:
    - [ ] Status filter view (Planned, In Progress, Complete, Deprecated)
    - [ ] Kanban board view (optional - drag-and-drop status updates)
    - [ ] Development queue (list of planned components)
    - [ ] Status update UI (manual status changes)

- [ ] Implement image upload/management
  - [ ] Create `src/components/superadmin/ComponentImageUpload.tsx`:
    - [ ] Upload screenshot (file upload, drag-and-drop)
    - [ ] Upload wireframe (file upload)
    - [ ] Add example images (multiple images with captions)
    - [ ] Image preview and management (replace, delete, set primary)
    - [ ] Link to media library entries
  - [ ] Create image upload API route:
    - [ ] `POST /api/admin/components/[id]/images` - Upload component image
    - [ ] Store images in Supabase Storage `component-library/` bucket
    - [ ] Generate optimized variants (thumbnail, large)
    - [ ] Update component record with image URLs
  - [ ] Create image optimization:
    - [ ] Generate WebP variants on upload
    - [ ] Create thumbnails (150×150, 400×400)
    - [ ] Store original + optimized versions

- [ ] Create component scanning API and automation
  - [ ] Create `src/app/api/admin/components/scan/route.ts` (POST - manual scan trigger)
  - [ ] Create scheduled scan job (daily/weekly) - optional
  - [ ] Create file watcher for dev mode (auto-scan on file change) - optional
  - [ ] Create CI/CD hook for automatic scan on deployment

- [ ] Build component library search functionality
  - [ ] Implement PostgreSQL full-text search (TSVECTOR)
  - [ ] Weighted search (name > description > props)
  - [ ] Fuzzy matching for typos
  - [ ] Category/theme filtering
  - [ ] Search API endpoint: `GET /api/admin/components/search`

- [ ] Create component library statistics and analytics
  - [ ] Component count by category
  - [ ] Component count by theme
  - [ ] Promotable vs client-specific breakdown
  - [ ] Development status breakdown (planned, in progress, complete)
  - [ ] Development queue (planned components count)
  - [ ] Recently added/updated components
  - [ ] Components without images (needs attention)
  - [ ] Components without documentation (needs attention)
  - [ ] Components linked vs unlinked (library entries without files)

- [ ] Implement library-first development workflow
  - [ ] Create component spec creation flow (new component entry form)
  - [ ] Create "Start Development" functionality:
    - [ ] Generate component file template with library_entry_id
    - [ ] Create file in correct location (based on category/location/theme)
    - [ ] Link file to library entry
    - [ ] Update status to "in_progress"
    - [ ] Open file in editor
  - [ ] Create status management UI (update status manually)
  - [ ] Implement automatic status updates (scanner detects file creation/completion)
  - [ ] Create development queue view (planned components)
  - [ ] Create component file template generator:
    - [ ] Template includes library_entry_id in header
    - [ ] Basic component structure
    - [ ] Props interface from requirements
    - [ ] Placeholder implementation

- [ ] Testing and validation
  - [ ] Test component scanner (discovers all components correctly)
  - [ ] Test metadata extraction (JSDoc parsing, TypeScript interface parsing)
  - [ ] Test search functionality (full-text search, filters)
  - [ ] Test image upload and management
  - [ ] Test component detail view (all sections display correctly)
  - [ ] Test component linking (dependencies, related components)
  - [ ] Test library-first workflow (create spec → start development → link file → update status)
  - [ ] Test component file template generation
  - [ ] Test automatic status updates
  - [ ] Test library entry to component file linking (two-way reference)

- [ ] Documentation
  - [ ] Document JSDoc comment format for components (including @library_id)
  - [ ] Document component scanner usage
  - [ ] Document image upload process
  - [ ] Document library-first development workflow
  - [ ] Create developer guide for adding component metadata
  - [ ] Create guide for component spec creation and development process

**Note**: This phase is not critical for MVP but will greatly improve developer productivity when deploying future client sites. It provides a searchable, visual reference for all available components, making it easier to discover and reuse components across projects.

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
