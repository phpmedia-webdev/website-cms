# Plan Log

This document tracks planned work, implementation phases, and backlog items for the Website-CMS project. Items are organized by priority and development phase.

For session continuity (current focus, next up, handoff), see [sessionlog.md](./sessionlog.md). Planlog remains the priority development workflow; items are never deleted, only checked off.

**Performance (speed):** Speed is a major goal for the web app. When adding features that may slow the system (e.g. extra DB or API calls on every request, heavy layout logic, sync jobs on high-traffic paths), document the impact and consider scoping to specific routes or throttling. Notify/product-owner flag any such features so we can decide trade-offs. See [prd.md](./prd.md) — Performance (Speed).

---

## Completed / Reference

- **Taxonomy management UI** (Settings → Taxonomy): Phase 04 + 04b complete. Sections, Categories, Tags (modals, slug, cascade, section filter, section delete, "Apply to these Sections"); Media assignment + filter. Post/Page integration, public features, auto-assign Uncategorized — not done.
- **Settings twirldown + sub-page routing:** Sidebar Settings is a twirldown (General, Fonts, Colors, Taxonomy, Content Types, Content Fields, Security, API). `/admin/settings` → redirect to General. Sub-pages for each; Fonts/Colors use design-system API. **Content Types** and **Content Fields** are full UIs (list, Add, Edit, Delete). Twirldown state persisted in localStorage; open when on any settings route.
- **Content phase (unified model):** Steps 1–13 complete — schema, admin UI, Tiptap, Types/Fields, taxonomy, public routes, legacy redirects. `/admin/content` uses `ContentPageClient` + Suspense for `useSearchParams`. [sessionlog](./sessionlog.md) pruned.
- **Tenant admin team management (Settings → Users, Owner flag):** Migration 090 (`is_owner` on `tenant_user_assignments`), types/CRUD in tenant-users.ts, `getTeamManagementContext()` in resolve-role.ts, Settings → Users link (adminOnly + canManageTeam) and route `/admin/settings/users`, GET/POST/PATCH `/api/settings/team`, superadmin `is_owner` in `/api/admin/tenant-sites/[id]/users`, SettingsUsersContent (list, add, role, remove; Owner badge; Remove disabled for Owners unless superadmin). Verified: View as Creator hides Users link.

---

## Implementation Phases (Priority Order)

### Phase 00: Supabase Auth Integration

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
    - `user_metadata.role`: `superadmin | client_admin | editor | creator | viewer | ...` (Creator = content submissions only; no site editing)
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
  - [X] Document user creation process:
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
  - [ ] Add Site URL field to **Superadmin → Tenant Sites → [site detail/settings]**: single input for true site domain (e.g. https://example.com). Use as prefix for gallery standalone URL (Gallery Details → Standalone URL). Fallback: NEXT_PUBLIC_APP_URL or request origin if not set.

- [ ] Test Automated Client Setup Script *(required prior to deploying a fork site)*
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

- [ ] Template (Root) Domain Deployment Setup *(next: we are using root domain, not subdomain)*
  - [ ] Set up Vercel project for template repository
  - [ ] Configure root domain (e.g., `yourdomain.com` or `app.yourdomain.com`)
  - [ ] Create test schema in Supabase (e.g., `template_dev`) using automated script
  - [ ] Expose schema in Supabase Dashboard (Settings → API → Exposed Schemas)
  - [ ] Configure Vercel environment variables:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `NEXT_PUBLIC_CLIENT_SCHEMA=template_dev`
    - `NEXT_PUBLIC_APP_URL=https://yourdomain.com` (or your root domain)
  - [ ] Create superadmin user in Supabase Auth with proper metadata
  - [ ] Test authentication flow on deployed domain
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
      - SimpleCommenter.com: Input field for Domain (dev/staging client feedback tool; disable in production)
      - Enable/disable checkboxes for each integration
      - Save/Update functionality with loading states
      - Status indicators (configured vs. not configured) with icons
      - Display current vendor UIDs/IDs
    - Route requires superadmin role (2FA check added as TODO for when 2FA is implemented)
  - [x] Implement script injection in public layout:
    - Updated `src/app/(public)/layout.tsx` to load integration settings
    - Inject Google Analytics script (gtag.js) with Measurement ID
    - Inject VisitorTracking.com script with Vendor UID
    - Inject SimpleCommenter.com script with Domain (dev/staging client feedback tool; disable in production; not blog comments)
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
    - [X] Create `src/app/members/account/security/page.tsx` (member security settings - optional 2FA) - Deferred to Phase 09 (Membership Platform)
  - [x] Password policy and auth flows (2026-02-03):
    - [x] `src/lib/auth/password-policy.ts` (min 12, denylist, normalize); used on change-password, reset-password, invite acceptance
    - [x] Forgot password (link, /admin/login/forgot, /admin/login/reset-password); invite redirectTo reset-password so first password meets policy
    - [x] My Profile: Change password card; Security card with TOTP for tenants (allowRemoveLastFactor); MFA enroll redirect to Profile
    - [x] Login: 2FA required only for superadmin; tenant admins optional; CRM recommendation banner on Profile
    - [x] Tenant site name on auth pages (layout resolves when unauthenticated); deeper design deferred to client site design
  - [ ] Update API routes for AAL checks *(senior dev may know; see sessionlog)*:
    - Update sensitive admin API routes to check `aal` claim
    - Require `aal2` for destructive operations (archive, reset, user management)
    - Return 403 if `aal1` but `aal2` required
  - [ ] Add RLS policies for AAL enforcement (if needed):
    - Check `aal` claim in JWT for sensitive database operations
    - Require `aal2` for superadmin operations
  - [ ] Handle edge cases *(before final launch)*:
    - Session refresh maintains `aal2` status
    - Prevent unenrollment of last factor for roles requiring 2FA
    - Recovery process documentation for lost authenticator access
    - Multiple factor enrollment support (up to 10 factors)
  - [ ] Testing *(when we deploy to domain — soon; add to planlog)*:
    - Test enrollment flow for superadmin and client admin
    - Test challenge flow after login
    - Test middleware enforcement for protected routes
    - Test API route AAL checks
    - Test multiple factor enrollment
    - Test unenrollment safety checks

- [ ] SMS/Phone-Based 2FA (Future dev)
  - [ ] Research SMS provider options (Twilio, MessageBird, Vonage, Textlocal)
  - [ ] Document SMS provider setup requirements
  - [ ] Plan SMS enrollment flow (similar to TOTP)
  - [ ] Plan SMS challenge flow
  - [ ] Note: Requires external SMS provider account and credentials
  - [ ] Note: Per-message costs apply (handled by provider)
  - [ ] Status: Deferred to future release (TOTP is primary method)

### Phase 01: Foundation & Infrastructure

**Status**: Pending - Tables and schema (make sure updated PRD specs are properly reflected)

**Note**: Only essentials first. We develop/adjust proper schemas per section as we develop.

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
  - [X] Document Vercel env var setup for client deployments
    - TODO: Add to deployment documentation

- [X] Create essential database schemas (as needed per phase)
  - [X] **Note**: Schemas will be created incrementally as each phase is developed
  - [x] Phase 05 created: `media`, `media_variants` tables (migrations 026, 039, 040)
  - [X] Phase 06 creates: `content`, `content_types`, `content_type_fields` (unified model)
  - [X] Phase 07 will create: CRM tables (`crm_contacts`, `crm_custom_fields`, `crm_contact_custom_fields`, `crm_contact_mags`, `crm_consents`, `forms`)
  - [X] Phase 08 will use: `forms` table (from Phase 07)
  - [X] Phase 09 will create: MAG tables (`mags`, `members`, `user_mags`, `menu_items`)
  - [X] Phase 03 will create: Client tenant tables (`public.client_tenants`, `public.client_admins`, `public.client_admin_tenants`)
  - [X] All schemas will reflect updated PRD specifications

- [ ] Refactor: Color palette — central preset library in public schema
  - [ ] Move predefined palette library to a **table in the public schema** (e.g. `public.color_palette_presets`). Superadmin maintains this central table (add/edit/remove presets); all tenants reference it as the picklist for choosing palettes.
  - [ ] Tenant schema: retain only **custom** palettes (user-created per site), e.g. in existing `color_palettes` or a dedicated `custom_palettes` table. Picker UI: "Presets" (from public) + "My palettes" (from tenant).
  - [ ] RPCs/API: read presets from public; read/write custom palettes in tenant schema. Single source of truth for the preset library; easier maintenance and sharing across all tenant apps.
  - [ ] Optional: migration to copy existing predefined rows from tenant `color_palettes` into public presets (once), then remove predefined rows from tenant tables or stop inserting them per tenant.

### Phase 02: Superadmin UI

**Status**: Pending - Required to begin settings and developing components (crude MVP component library manager)

**Note**: Simple list/text table to reference components as we build. Start by adding component name and description. As components are built in code, keep metadata in sync.

- [X] Enhance settings page with design system section **New Method** We went with a copy/past code library on the superadmin section
  - [X] Update `src/app/admin/settings/page.tsx` with design system section
  - [X] Create `src/components/settings/DesignSystemSettings.tsx`:
    - Font selection UI (Google Fonts integration)
    - Color palette picker UI
    - Real-time preview component
    - Save/update functionality
  - [X] Create API route `src/app/api/admin/settings/route.ts` for updating settings

- [X] Implement admin dark theme - **decided to skip**
  - [ ] Update admin layout (`src/app/admin/layout.tsx`) to use dark theme
  - [ ] Create admin-specific CSS variables that use design system colors in dark mode
  - [ ] Ensure admin uses same fonts but different color application

- [x] CSS variable integration *(single global area for tenant-managed CSS: Settings → Fonts/Colors → design system → CSS variables at root; not scattered)*
  - [x] Update `src/app/globals.css` with design system CSS variables (fallbacks in :root)
  - [x] Create utility functions to apply design system values (`designSystemToCSSVariables`, injection in layout)
  - [x] Ensure variables are applied globally from one source (public and admin use same variable set from DB)

- [X] Create crude MVP component library manager (simple list/text table) **New Method** We went with a copy/past code library on the superadmin section
  - [X] Create database table for component library (simple: name, description, file_path, status)
  - [X] Create superadmin UI at `/admin/super/components` (simple list/table view)
  - [X] Add component entry form (name, description)
  - [X] Update metadata as components are built
  - [X] Simple search/filter functionality

### Phase 03: Superadmin Tenant Admin Management

**Status**: Implemented as **Tenant Sites** and **Tenant Users** (naming: `tenant_sites`, `tenant_users`, `tenant_user_assignments`). Routes: `/admin/super/tenant-sites`, `/admin/super/tenant-users`; API: `/api/admin/tenant-sites`, `/api/admin/tenant-users`.

- [x] Create client/tenant registry database schema
  - [x] Migrations: `082_create_tenant_management_tables.sql`, `085_alter_tenant_sites_deployment_url.sql`, `086_add_tenant_user_assignments.sql`
  - [x] `public.tenant_sites` (id, name, slug, schema_name, status, deployment_url, github_repo, site_mode, site_mode_locked, site_mode_locked_by, site_mode_locked_at, site_mode_locked_reason, created_at, updated_at, notes)
  - [x] `public.tenant_users` (id, user_id, email, display_name, status, …)
  - [x] `public.tenant_user_assignments` (tenant_site_id, tenant_user_id, role_slug, assigned_at, assigned_by, …)
  - [x] Indexes for slug, schema_name, email lookups

- [x] Create client/tenant management utilities
  - [x] `src/lib/supabase/tenant-sites.ts`: getTenantSites, getTenantSiteById, getTenantSiteBySchema, createTenantSite, updateTenantSite
  - [x] `src/lib/supabase/tenant-users.ts`: listTenantUsers, listUsersByTenantSite, getTenantUserByEmail, createTenantUser, assignUserToSite, removeUserFromSite, updateTenantUser, etc.
  - [x] Site mode and lock updated via updateTenantSite (no separate lockSiteMode/unlockSiteMode; lock fields on tenant_sites)

- [x] Build superadmin client management UI
  - [x] `src/app/admin/super/tenant-sites/page.tsx` — list (name, schema, status, deployment URL, site mode)
  - [x] `src/app/admin/super/tenant-sites/new/` — create site (name, slug, schema_name, status, deployment_url, site_mode, notes)
  - [x] `src/app/admin/super/tenant-sites/[id]/page.tsx` — detail with deployment info, site mode control, user list, notes
  - [x] `src/app/admin/super/tenant-sites/[id]/settings/page.tsx` — site settings
  - [x] `src/app/admin/super/tenant-users/page.tsx` — global tenant users list; add user to site from tenant-sites detail
  - [x] Site mode + lock: `TenantSiteModeCard` on site detail; lock toggle and reason (superadmin only)
  - [x] Add user to site: from site detail (email, display_name, role_slug, invite); no separate /clients/[id]/admins/new page — inline or modal

- [x] Implement email notifications for admin creation
  - [ ] Custom email template for new admin welcome (optional; currently Supabase invite email)
  - [ ] Include tenant-specific login URL in template (optional)
  - [x] Send email when admin is created: `inviteUserByEmail()` when `invite: true` in POST `/api/admin/tenant-sites/[id]/users`

- [x] Update site mode control in tenant admin settings
  - [x] Settings → General (`GeneralSettingsContent`): site mode toggle, lock status, lock reason, toggle disabled when locked
  - [x] API: GET/PATCH `/api/settings/site-mode` (admin auth; superadmin can set lock)

- [x] Create API routes for client/tenant management
  - [x] `GET/POST /api/admin/tenant-sites` — list, create
  - [x] `GET/PUT /api/admin/tenant-sites/[id]` — get, update
  - [x] `GET/POST/DELETE /api/admin/tenant-sites/[id]/users` — list, add (with invite), remove
  - [x] `GET/PATCH /api/admin/tenant-sites/[id]/site-mode` — get/update site mode and lock
  - [x] `GET /api/admin/tenant-users` — list tenant users (superadmin)

### Phase 04: Tenant Admin UI

**Status**: Complete — Admin uses **sidebar layout** with collapsible sections (Dashboard, Content, Media, Forms, CRM, Settings; Superadmin section when applicable). All areas have real pages; Posts/Pages are served via unified Content with legacy redirects.

**Note**: Design uses sidebar + expandable groups rather than top tabs. Clean visual UX in place; further polish can continue in later phases.

- [x] Create placeholder admin dashboard structure
  - [x] Layout: sidebar with collapsible sections (`Sidebar.tsx`); path-driven open state; feature-based visibility
  - [x] Navigation: Dashboard, Content, Media (Library + Galleries), Forms, CRM (Contacts, Forms, Lists, Marketing, Memberships, Code Generator), Settings (Profile, General, Fonts, Colors, Taxonomy, Content Types, Content Fields, CRM, Security)
  - [x] Pages: Dashboard (`/admin/dashboard`), Content (`/admin/content` — list/new/[id]/edit), Media (`/admin/media`), Galleries (`/admin/galleries`), Forms (`/admin/forms`), CRM (`/admin/crm/*`), Settings (`/admin/settings/*`). Posts/Pages: redirect to Content with `?type=post` / `?type=page` (Phase 06)
  - [x] Visual UX: consistent admin shell, StatsCard on dashboard, feature guards and role-based nav
  - [x] Navigation and routing wired; layout in `src/app/admin/layout.tsx`, `AdminLayoutWrapper`, `Sidebar`

### Phase 05: CMS - Media Library (Storage, Image Optimization, Local Copy)

**Status**: Complete (core). Media Library is live: storage, variants, upload (file + video URL), taxonomy, view mode. **Deferred:** Local copy workflow, `createClientBucket`/`renameBucket`, `getImageUrl` helper, `POST /api/media/[id]/optimize`, video embed component.

- [x] Build storage utilities
  - [x] Bucket configuration (policies via `039_setup_storage_bucket_policies.sql`), `getClientBucket()` in `src/lib/supabase/schema.ts`
  - [x] `src/lib/media/storage.ts`: upload, variant upload, `generateImageVariants`; path structure via `image-optimizer`
  - [ ] **Deferred:** `createClientBucket()`, `renameBucket()` (bucket created via Dashboard; migrations assume it exists)

- [x] Integrate bucket setup
  - [x] Migration `039` configures storage policies for client bucket
  - [x] Bucket validation (039 checks bucket exists before applying policies)
  - [x] Upload flows use `getClientBucket()` (MediaUpload, ImageUpload, MediaFileUpload, media API)

- [x] Image optimization system (Media Library)
  - [x] `src/lib/media/image-optimizer.ts`: variant configs, dimensions, `generateStoragePath`, `getVariantsToGenerate`
  - [x] `src/lib/media/storage.ts`: `generateImageVariants()`, upload variants to Supabase Storage; WebP conversion; standard sizes (thumbnail, small, medium, large, original)
  - [x] `media_variants` table (026): variant paths, width, height, size_bytes, format; `media` stores original metadata
  - [x] `MediaUpload` / `MediaFileUpload` / `ImageUpload`: trigger optimization on upload, store variant metadata
  - [x] Media Library UI: variant display, image size info (e.g. `formatFileSize`), variant selection in ImagePreviewModal
  - [ ] **Deferred:** `POST /api/media/[id]/optimize`; `src/lib/images/getImageUrl.ts` helper
  - [ ] **N/A:** PostEditor (replaced by Content modal); Gallery uses media. Content `featured_image_id` references media.

- [ ] **Deferred — Image Storage Strategy (Local Copy Workflow)**
  - [ ] Update media database schema for local copy tracking (`copy_to_local`, `local_path`, `copied_at`)
  - [ ] `src/lib/media/local-copy.ts`, `LocalCopyDialog.tsx`, copy/remove API routes, `getImageUrl` updates
  - [ ] Local copy UI in Media Library (Copy to Local, Remove Local Copy, etc.)

- [x] Video URL management
  - [x] `media_type`, `video_url` on media table (migration 040)
  - [x] Support for YouTube, Vimeo, Adilo, direct video URLs; `AddVideoUrlForm`, `normalizeVideoUrl`, validation
  - [x] View mode Images/Videos/All; video placeholder in grid when `media_type === 'video'`
  - [ ] **Deferred:** Video embed component for public pages

**Note**: Event Calendar feature has been removed from the priority list. Can be added back as a future enhancement if needed.

### Phase 06: CMS - Content Management (Unified Content Model)

**Status**: Core complete. Unified content (single `content` table, `content_types`, `content_type_fields`), full-page editor, taxonomy, public blog/pages, legacy redirects. No WordPress-style page builder — tenant sites use custom code sections (code library) and reference content by UUID. Remaining: document content-by-UID for code library; FAQ block content type (optional).

- [x] Unified content schema and migrations
  - [x] `content_types`, `content_type_fields`, `content` tables (client schema); RLS; dynamic RPCs
  - [x] Seed core types (post, page, snippet, quote, article); drop `posts`
- [x] Admin content UI (unified list + full-page editor)
  - [x] `src/app/admin/content/page.tsx` — list all types, type filter, search, taxonomy filter, Add New, Edit, Delete
  - [x] Full-page editor: `src/app/admin/content/new/page.tsx` (ContentNewClient), `src/app/admin/content/[id]/edit/page.tsx` (EditContentClient); list navigates to `/admin/content/new` and `/admin/content/[id]/edit`. Back button and full-width editing.
  - [x] Type selector, Name, Slug, body (Tiptap), Excerpt, Status, custom fields, taxonomy in edit view
- [x] Integrate rich text editor (Tiptap)
  - [x] `src/components/editor/RichTextEditor.tsx` — H1–H6, bold/italic, lists, blockquote, links, images, HTML code view, WYSIWYG (`prose`)
  - [x] Saving/loading via `content.body` JSONB
- [x] Settings → Content Types, Content Fields
  - [x] Content Types: list (Label, Slug, Description), Add New, Edit, Delete (core protected)
  - [x] Content Fields: list, filter by type, Add/Edit/Delete; key, label, type, config, display_order
- [x] Taxonomy integration for content
  - [x] Wire `taxonomy_relationships` (`content_type` = `content_types.slug`, `content_id` = `content.id`); migration 048 extends constraint
  - [x] `TaxonomyAssignmentForContent` in Content edit modal (edit mode); Categories/Tags filter + Reset on list
- [x] Build public-facing blog pages
  - [x] `src/app/(public)/blog/page.tsx` (list posts from `content` type `post`)
  - [x] `src/app/(public)/blog/[slug]/page.tsx` (single post, rich content, SEO)
- [x] Build public-facing pages
  - [x] Homepage and routes are **code-defined** (not a dynamic WordPress-style page fetcher). Content library excludes "page" type; pages/sections are built in tenant code.
- **Page composition (product decision)** — We are **not** building a dynamic page builder like WordPress. No "Page" content type; no section editor or drag-and-drop DB-driven composition. Instead: **custom code sections per tenant site**, using the **Code Library** (Superadmin) as a starting block; tenant code references content in code and fetches by UID where needed.
  - [x] **Content UID (UUID):** Every content item has a stable `id` (UUID) in `content` table. Tenant code (and code library snippets) should **reference content by this UUID** (e.g. `getContentById(id)` or public API by UUID) so sections can reliably pull in the right content. Use title/slug for display; use UUID for stable reference in code and APIs.
  - [ ] **Document/reinforce:** Ensure code library and docs describe referencing content by UUID; add example snippets if needed (e.g. fetch content by UUID for a section).
- [ ] Content type: FAQ block
  - [ ] Add FAQ block as a selectable content type in the content library (create/edit in list + modal or dedicated editor)
  - [ ] Structure: one topic (title) + multiple Q&A pairs (question, answer). Store in `content.body` JSONB or content-type-specific fields (e.g. `{ topic, items: [{ question, answer }] }`)
  - [ ] Content library: FAQ block appears in type filter and list; selecting it opens editor for topic and Q&A list (add/remove/reorder pairs)
  - [ ] Use cases: (1) Block can be placed on a public page (e.g. as a section/block when page composition exists, or embedded by slug/UUID); (2) Included in RAG knowledge document (Phase 16a) for AI agent training when opted in
  - [ ] Migration or seed: add `faq_block` (or equivalent slug) to `content_types`; add any content-type-specific fields if not using body JSONB
  - [ ] Public render: optional route or component to render a single FAQ block (e.g. by slug or UUID) for embedding; or render only when used as a section in page composition

- [x] Legacy admin routes
  - [x] Redirect `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]` → `/admin/content?type=post`; `/admin/pages` → `/admin/content?type=page`; Content page reads `?type=` and sets type filter

### Phase 07: CRM-First Lightweight CRM

**Status**: Core complete. Schema, utilities, form submission, CRM admin UI (contacts list + detail, Activity Stream, taxonomy, custom fields, MAGs, marketing lists), and API routes in place. Tags/categories via taxonomy (not `tags TEXT[]`). Remaining: central automations layer (optional), auto-assign tags on form submit (optional), manual push to external CRM (optional), combined Activity Stream dashboard widget (optional).

**Workflow**: Form submitted → match/create contact, fill core + custom fields, auto-assign MAGs (if configured), insert form_submission → admin reviews in CRM, uses Activity Stream, taxonomy, custom fields, MAGs/lists; external CRM push not yet implemented.

- [x] Create simplified CRM schema
  - [x] Client schema: `crm_contacts` (standard fields, status, dnd_status, message, external_crm_id, external_crm_synced_at, source, form_id), `crm_notes`, `crm_custom_fields`, `crm_contact_custom_fields`, `crm_contact_mags`, `forms`, `form_submissions`. Tags/categories via **taxonomy_relationships** (content_type = `crm_contact`). Status from Settings → CRM picklist.
  - [ ] **Optional:** `crm_consents` table if needed for consent tracking

- [x] Create CRM utilities
  - [x] `src/lib/supabase/crm.ts`: getContacts, getContactById, getContactByEmail, createContact, updateContact; getContactNotes, createNote, updateNote, deleteNote; getContactMags, addContactToMag, removeContactFromMag; getContactMarketingLists, add/remove from list; getCrmCustomFields, getContactCustomFields, upsertContactCustomFieldValue; getForms, getFormFields, setFormFields, insertFormSubmission, getFormSubmissions; getMags, getNewContactsCount. Taxonomy for contact tags via crm-taxonomy / taxonomy_relationships.
  - [ ] **Deferred:** pushContactToExternalCRM() — manual push to external CRM (fields exist; no implementation)

- [x] Update form submission workflow
  - [x] `POST /api/forms/[formId]/submit`: validate, match/create contact, fill core + custom fields, auto-assign MAGs (form.auto_assign_mag_ids), insert form_submission, status = default (e.g. new)
  - [ ] **Optional:** Auto-assign taxonomy tags from form.auto_assign_tags (form has column; not wired in submit)
  - [ ] **Optional:** Process consents, set DND from consent (if crm_consents added)

- [ ] **Deferred — Central automations layer**
  - [ ] `src/lib/automations/` (or equivalent): single place for automation logic; form submit / code redeem call into it
  - [ ] Pattern: trigger → pipeline of steps; document for future events

- [x] Create CRM admin UI
  - [x] `src/app/admin/crm/page.tsx` → redirect to `/admin/crm/contacts`
  - [x] `src/app/admin/crm/contacts/page.tsx` — list with search, filter by status, MAG, marketing list, category/tag (taxonomy)
  - [x] `src/app/admin/crm/contacts/[id]/page.tsx` — detail with tabs: Activity Stream, Taxonomy, Custom Fields, Marketing Lists, Memberships (MAGs); edit contact; status badge
  - [x] Activity Stream (per contact): timestamped notes, "+Add Custom Note", code redemption auto-appends entry
  - [x] Taxonomy (ContactTaxonomyBlock): assign categories/tags to contact
  - [x] Custom Fields: form filter, inline edit, PATCH /api/crm/contacts/[id]/custom-fields
  - [x] MAG and marketing list assignment in detail view
  - [ ] **Optional:** Combined Activity Stream dashboard widget (all contacts, merged view)
  - [ ] **Deferred:** "Manual push to external CRM" button; dedicated TagManager/MAGAssignment/ExternalCRMPush components (functionality in ContactTaxonomyBlock, ContactCardRight, etc.)

- [x] Create CRM API endpoints
  - [x] `GET /api/crm/contacts` — list (admin)
  - [x] `GET/PATCH /api/crm/contacts/[id]` — get/update contact
  - [x] `GET/POST/PATCH/DELETE /api/crm/contacts/[id]/notes`
  - [x] `GET/PATCH /api/crm/contacts/[id]/custom-fields`
  - [x] `GET/POST/DELETE /api/crm/contacts/[id]/mags`
  - [x] `GET/POST/DELETE /api/crm/contacts/[id]/lists` (marketing lists)
  - [x] `GET /api/crm/contacts/new-count` (badge). Taxonomy (tags) via taxonomy APIs.
  - [ ] **Deferred:** `POST /api/crm/contacts/[id]/push` (manual push to external CRM)
  - [ ] **Optional:** Add tags by email / assign MAGs by email (API key auth) for external integrations

### Phase 08: Forms Management

**Status**: Complete. Form registry (Custom Fields + Forms tabs), form-field assignment, form submission API, and submissions view are implemented. Only optional "Edit all" mode in Custom Fields section remains.

**Note**: Forms are developer-authored components that map to CRM fields. Form registry at `/admin/crm/forms` organizes custom field definitions and form definitions; forms = logical grouping of custom fields with display order and required flag. Submit API and submissions list at `/admin/crm/forms/submissions` are live.

- [x] Create form registry UI (developer helper)
  - [x] Create `src/app/admin/crm/forms/page.tsx` (server: fetch custom fields + forms) and `CrmFormsClient.tsx` (tabs: Custom Fields, Forms)
  - [x] Custom Fields tab: list/add/edit/delete definitions (name, label, type); types include text, number, email, url, tel, checkbox, textarea, **select**, **multiselect** (options in `validation_rules.options`)
  - [x] Forms tab: list/add/edit/delete form definitions (name, slug). API: `GET/POST /api/crm/custom-fields`, `GET/POST /api/crm/forms`, PATCH/DELETE by id
  - [x] Migrations 059 (add `auto_assign_tags`, `auto_assign_mag_ids` to `forms`), 060 (make `forms.fields` nullable). `formatSupabaseError` in crm.ts for RPC errors
- [x] Assign form fields to form (form = logical grouping of custom fields)
  - [x] Migration: form_fields table (061), RPC (062); getFormFields(formId), PATCH with field_assignments
  - [x] Forms UI: in Forms add/edit modal, multi-select custom fields for this form; display order, required. PATCH `/api/crm/forms/[id]`, GET `/api/crm/forms/[id]/fields`
  - [x] Optional later: filter Custom Fields tab on contact detail by form (All | Contact's form | specific); persist in sessionStorage

- [x] Custom Fields section (contact detail): filter, persist open, edit (see sessionlog §3b)
  - [x] Form filter in Custom Fields section: All | Contact's form | specific form; persist in sessionStorage
  - [x] Persist twirldown open state (sessionStorage, per contact) so Custom Fields stays open when returning from Edit or another contact
  - [x] API: PATCH /api/crm/contacts/[id]/custom-fields (single or batch); use upsertContactCustomFieldValue
  - [x] Inline edit per row: pencil/click → input by type (text, select, multiselect); Save/Cancel; single-line layout (label | value | pencil)
  - [ ] Optional: "Edit all" mode in section header; Save all / Cancel

- [x] Create form submission API
  - [x] Create `POST /api/forms/[formId]/submit` route: validate, match/create/update contact, fill-in-blanks, append message; form_submissions table (066)
  - [x] Store custom field values; new contact status from picklist

- [x] Create form submissions view
  - [x] Create `/admin/crm/forms/submissions` (list submissions, filter by form, link to contact)

### Phase 09: Membership System / MAG Manager (Tied to CRM)

**Status**: Core complete. MAG schema (mags, crm_contact_mags), admin UI at `/admin/crm/memberships` (list, new, [id], code-generator), gallery protection (gallery_mags, checkGalleryAccess, mag-tags on media), content editor access/MAG, and API `/api/crm/mags` are implemented. **Remaining/deferred:** Member auth flow and member routes, protected video/media proxy, section-level and inline shortcode protection, menu restrictions, ecommerce webhooks, api_keys. Member = CRM contact with MAGs via crm_contact_mags; **members** table (9C) exists for elevated contacts (auth + licenses).

**Phase 09 and sub-phases (9A–9E) — execution order and status**

Recommended **execution order** (dependencies first): **09** (core MAG) → **9C** (Members & Ownership, prerequisite for 9A) → **9A** (Code Generator & Redemption) → **9E** (Gallery Enhancement). External integrations (Marketing, AnyChat) are in **Phase 12** (12A, 12B), not part of membership core.

| Phase | Done | Still needed |
|-------|------|--------------|
| **09** | MAG schema (mags, crm_contact_mags, gallery_mags); utilities (crm.ts, gallery-access, content-protection); admin UI (memberships list/new/[id], code-generator); gallery + content editor access/MAG; API /api/crm/mags. | Member auth flow & routes; checkContentAccess for blog/pages; protected video/download proxy; section-level & shortcode protection; menu restrictions; ecommerce webhooks & api_keys; dashboard membership stats. |
| **9C** | members + user_licenses schema; members.ts (getMemberByContactId, createMemberForContact, resolveMemberFromAuth); licenses.ts (hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership). | Elevation flow docs (when to create members row); update LMS Phase 17 to use user_licenses. |
| **9A** | Code tables (batches, membership_codes); code-generator.ts (generate, redeem, hash); admin UI (code-generator, batches, explore); API (batches, generate, codes, redeem-code). | Redemption flow: assign MAG via contact (crm_contact_mags), create/update members row on redeem; character exclusion in generator; public/member "Apply code" UI (login page + member profile). |
| **9E** | Gallery schema & status; media↔gallery assignment (both directions); MAG protection; standalone /gallery/[slug]; shortcode spec + parser + findGalleryShortcodes; GalleryRenderer (server) + GalleryEmbed (client); ContentWithGalleries; GalleryPreviewModal (images + native video, keyboard, captions); Insert gallery + copy shortcode UIs; GET /api/galleries/[id] and /api/galleries/[id]/public (JSON). | GalleryPreviewModal: external video embed (YouTube/Vimeo/Adilo via video_url + provider); optional thumbnail strip/zoom; gallery header filter by media taxonomy (categories/tags); content–gallery linking (Phase 7); style templates/presets (Phase 8). |

**Phase 09 (main) — What we built vs what’s still needed**

Inferred from planlog + codebase review:

**Built**
- **Schema:** `mags`, `crm_contact_mags`, `gallery_mags`; `content` and galleries have `access_level`, `required_mag_id` (content single, galleries via junction), `visibility_mode`, `restricted_message`.
- **Utilities:** `crm.ts` (MAG CRUD, getContactMags, addContactToMag, removeContactFromMag, getContactsByMag, searchMags); `gallery-access.ts` (checkGalleryAccess for public/members/mag with required_mag_ids); `content-protection.ts` (getMagTagSlugsOnMedia, canAccessMediaByMagTags for gallery media).
- **Admin UI:** `/admin/crm/memberships` — list, new, [id] (MAGDetailClient), code-generator (batches, explore). MAG assign/remove from Contact detail → Memberships tab.
- **Gallery protection:** `(public)/gallery/[slug]/page.tsx` and `api/galleries/[id]/public` run `checkGalleryAccess` before rendering; gallery client filters media by mag-tags; admins bypass.
- **Content editor:** Full-page editor (EditContentClient / ContentEditorForm) has access_level, single required_mag_id, visibility_mode, restricted_message. GalleryEditor has multi-MAG picker and same.
- **API:** `GET/POST /api/crm/mags`, `GET/PUT/DELETE /api/crm/mags/[id]`, `GET /api/crm/mags/search`, `GET/POST/DELETE /api/crm/contacts/[id]/mags`.
- **Login:** `(public)/login` — shared Supabase signInWithPassword; redirects by user_metadata.type (member → redirect param, admin → /admin/dashboard). No separate register or member-only auth API.
- **Redeem:** `POST /api/members/redeem-code` exists (expects authenticated member via getMemberByUserId).

**Still needed (Phase 09 main)**  
**Execution order:** Implement and test content protection first; add the membership feature switch **after** basic memberships and content protection work. **No per-page membership management** — membership is global for the site; the switch turns the feature on/off for the whole site only.

- **Content protection (blog/pages)** — do first: `blog/[slug]/page.tsx` and `(public)/[slug]/page.tsx` do **not** check `access_level`/`required_mag_id` before rendering; they fetch and render body for everyone. **Required:** Implement `checkContentAccess(content, session)` and gate blog + dynamic page routes (and optionally blog list) so restricted body is never sent to unauthorized users; redirect to login with return URL when access requires member. Add getMagIdsForCurrentUser for MAG-level content. Test with GPUM; then add membership switch (when OFF, skip content protection).
- **Membership feature switch (site-level, optimized speed)** — add after content protection is tested: Purpose: optimized site speed for sites that do not require any gated content. Add a **master “Membership” toggle** on the **Membership master page** (`/admin/crm/memberships`). When **OFF:** No membership sync on public pages; no content protection; show notice that admin must turn memberships on before creating MAGs; disable/hide “Create membership” until ON. When **turning OFF** (from ON): If any MAGs exist, warn that gated content will be exposed; advise making all memberships inactive (e.g. MAG status = draft) before turning off. When **ON:** Membership is global (sync and content protection as configured). Store per tenant (e.g. `tenant_sites.membership_enabled` or feature registry). See [prd.md](./prd.md) — Membership feature switch.
- **Member auth flow:** Optional separate register page or combined login/register; optional `/api/auth/member/*` if you want member-only endpoints. Middleware has no `/members/*` handling (no member routes yet).
- **Member routes:** No `(public)/members` (dashboard), `members/profile`, `members/account`; no MemberDashboard/MemberProfile. Add if member portal is in scope.
- **Protected video/download:** No `/api/stream/media/[id]` or `/api/download/media/[id]`; direct storage URLs still used. Add proxy routes that verify session + MAG and stream bytes.
- **Granular protection:** Section-level, shortcode `[[mag-code]]`, menu restrictions, ProtectedContent wrapper — all deferred.
- **Ecommerce:** No api_keys table, no payment webhooks, no payment-integration.ts.
- **Dashboard:** No membership stats on admin dashboard, no `/admin/members` list or unified customer view.

- [x] **Membership feature switch (site-level)** — optimized speed for sites without gated content
  - [x] Add tenant-level setting (e.g. `tenant_sites.membership_enabled` or feature registry). Master toggle on `/admin/crm/memberships` page.
  - [x] When OFF: notice “Turn memberships on before creating memberships”; disable/hide Create membership. No sync on public pages; no content protection.
  - [x] When turning OFF with existing MAGs: warn that gated content will be exposed; advise making all memberships inactive (draft) first.
  - [x] When ON: membership global (sync and content protection as configured). See PRD — Membership feature switch.

- [x] Create MAG (Membership Access Groups) database schema
  - [x] Client schema: `mags` table (id, uid, name, description, start_date, end_date, status active|draft, etc.); **contacts get MAGs via `crm_contact_mags`** (contact_id, mag_id, assigned_via, assigned_at) — no separate `members` table; member = contact with MAG assignments.
  - [x] Content: `content` table has `access_level`, `required_mag_id`, `visibility_mode`, `restricted_message`.
  - [x] Galleries: `access_level`, `visibility_mode`, `restricted_message`; **`gallery_mags` junction** (gallery_id, mag_id) for multi-MAG; legacy `required_mag_id` migrated to junction.
  - [ ] **Deferred:** `menu_items` table with access; section_restrictions on pages; separate `members`/`user_mags` if member auth is added later.

- [x] Build MAG utilities
  - [x] `src/lib/supabase/crm.ts`: getMags, getMagById, getContactMags, addContactToMag, removeContactFromMag, getContactsByMag, searchMags (MAG CRUD and contact–MAG assignment).
  - [x] `src/lib/auth/gallery-access.ts`: checkGalleryAccess(galleryAccessInfo) — public/members/mag, required_mag_ids from gallery_mags, returns hasAccess/visibilityMode/restrictedMessage.
  - [x] `src/lib/mags/content-protection.ts`: getMagTagSlugsOnMedia(mediaIds), canAccessMediaByMagTags(magTagSlugs, userMagUids) — mag-tag restriction for gallery media.
  - [ ] **Deferred:** src/lib/mags/section-protection.ts, shortcode-parser.ts, menu-filter.ts; member-auth.ts (getMemberUser, validateMemberAccess); checkContentAccess for posts/pages (content-level gate).

- [ ] Member authentication flow
  - [x] Create `src/app/(public)/login/page.tsx` (member login/registration)
  - [ ] Create `src/app/(public)/register/page.tsx` (or combine with login)
  - [ ] Create API route `src/app/api/auth/member/login/route.ts` (Supabase Auth for members)
  - [ ] Create API route `src/app/api/auth/member/register/route.ts` (member registration with user_metadata.type = "member")
  - [ ] Update middleware to handle member authentication (separate from admin)

- [x] Member routes and pages (2026-02-03: dashboard, profile with display name/avatar, account placeholder; Members Area nav; sync in members layout only)
  - [x] Create `src/app/(public)/members/page.tsx` (member dashboard - protected)
  - [x] Create `src/app/(public)/members/profile/page.tsx` (member profile page)
  - [x] Create `src/app/(public)/members/account/page.tsx` (account settings)
  - [ ] Create `src/components/memberships/MemberDashboard.tsx` (optional; dashboard uses page + ApplyCodeBlock)
  - [ ] Create `src/components/memberships/MemberProfile.tsx` (optional; profile uses MemberProfileForm)

- [x] Gallery content protection (implemented)
  - [x] `src/app/(public)/gallery/[slug]/page.tsx`: runs `checkGalleryAccess(gallery.access)` before rendering; if no access, shows restricted message or "Sign in" link; access uses `required_mag_ids` from gallery_mags; admins bypass.
  - [x] Gallery media: mag-tags on media (taxonomy slug `mag-{uid}`); `content-protection.ts` getMagTagSlugsOnMedia, canAccessMediaByMagTags, getMagUidsForCurrentUser, filterMediaByMagTagAccess; **GET /api/galleries/[id]/public** filters items server-side by mag-tag (admins bypass); gallery displays different items for anonymous vs members with MAG.
- [ ] **Content protection (blog/pages) — partial**
  - [ ] **Security principle (CRITICAL):** Server-side enforcement only; never send restricted body to unauthorized users. Gate at data layer.
  - [ ] checkContentAccess(content, session) for posts/pages; use in blog/[slug] and dynamic [slug] before rendering body.
  - [ ] Blog list: filter restricted posts; teaser-only for visibility_mode = message.
  - [ ] ProtectedContent wrapper; redirect to /login with return URL when access_level requires member.
  - [ ] **Never use client-side hiding** for restricted content.

- [ ] **Protected video/media delivery** (prevent URL copy-and-share)
  - [ ] **Problem:** Direct video URLs in HTML (e.g. `<video src="https://storage.../video.mp4">`) can be copied from view source and shared; anyone with the URL could watch after membership ends or share with friends.
  - [ ] **Solution: Proxy streaming** — Do NOT expose raw Supabase Storage URLs. Use authenticated API route that streams video to authorized users only.
  - [ ] Create `src/app/api/stream/media/[id]/route.ts` (or `/api/stream/video/[id]`):
    - [ ] Verify member session and MAG access (check media item's mag-tags against user's MAGs)
    - [ ] If unauthorized: return 403
    - [ ] If authorized: fetch from Supabase Storage (use signed URL with short expiry for internal fetch, or service role) and stream bytes to response
    - [ ] Set appropriate headers: `Content-Type`, `Content-Length` or chunked, `Accept-Ranges` for seeking
  - [ ] Gallery/video player: use `<video src="/api/stream/media/{id}">` — URL in view source points to proxy; requires valid session; shared link returns 403 for others
  - [ ] **Optional:** Short-lived signed URLs for internal Supabase fetch (e.g. 2–4 hours) so even server-side fetch uses time-limited URLs
  - [ ] **Cannot prevent:** Screen recording, account sharing. Protection stops casual URL sharing.

- [ ] **Protected video/media downloads** (expiring links)
  - [ ] **Problem:** Download links can be copied and shared; a permanent URL allows access after membership ends.
  - [ ] **Option A — Proxy download (preferred):** Create `src/app/api/download/media/[id]/route.ts` — verifies session + MAG, streams file with `Content-Disposition: attachment`. No shareable URL; every download goes through auth. Same pattern as streaming proxy.
  - [ ] **Option B — Expiring signed URLs:** When user clicks Download, call API that verifies access, generates Supabase signed URL with short expiry (e.g. 5–15 min), returns or redirects to it. User downloads within window; shared link expires quickly. Store nothing; generate on demand.
  - [ ] Prefer Option A for strongest protection (no URL ever exposed). Option B if proxy is impractical for very large files.
  - [ ] Download button: link to `/api/download/media/{id}` (proxy) or trigger fetch to get expiring URL then `window.location` / `<a download href={url}>`.

- [ ] **Vimeo hosting & domain restriction**
  - [ ] Plan to host videos on Vimeo; use Vimeo's domain restriction to allow playback only on allowed domains (reduces embed theft to other sites)
  - [ ] **Consideration — Roku/OTT apps:** Domain restriction may block Roku or other streaming apps (they don't run on a web domain). Before building Roku app: verify Vimeo's options for app/OTT playback (signed embeds, API, token-based auth). May need different config for web vs app, or hybrid hosting.

- [x] Admin UI for MAG management (under CRM → Memberships)
  - [x] `src/app/admin/crm/memberships/page.tsx` — list all MAGs (MembershipsListClient); new MAG at `/admin/crm/memberships/new`
  - [x] `src/app/admin/crm/memberships/[id]/page.tsx` — MAG detail/edit (MAGDetailClient): name, uid, description, start/end date, status (active/draft)
  - [x] MAG assign/remove: from **Contact detail** (Memberships tab) — assign/remove MAGs per contact; no separate /admin/members list (contacts = members for MAG purposes)
  - [x] Code generator: `/admin/crm/memberships/code-generator` (batches, explore) for membership codes
  - [ ] **Deferred:** Dedicated /admin/members page (list members with MAGs); API key management page; ecommerce tag / auto-assign UI in MAG editor if desired

- [ ] Implement granular content protection
  - [ ] Section-level content protection:
    - [ ] Update page editor to support section-level restrictions
    - [ ] Section restriction UI in page editor
    - [ ] Section ID assignment (unique IDs for each section)
    - [ ] Access level dropdown per section
    - [ ] MAG selector per section
    - [ ] Visibility mode toggle per section
    - [ ] Message override input per section
  - [ ] Inline text protection (shortcode syntax):
    - [ ] Create Tiptap extension for protected text (`src/lib/tiptap/extensions/ProtectedText.ts`)
    - [ ] Parse shortcode syntax: `[[mag-code]]content[[/mag-code]]`
    - [ ] Parse shortcode with message: `[[mag-code message="..."]][[/mag-code]]`
    - [ ] Convert shortcodes to `ProtectedText` nodes in JSON structure
    - [ ] Visual indicator in editor (highlighted background or border)
    - [ ] Toolbar button to insert protected text block
    - [ ] Create protected text rendering component (`src/components/public/ProtectedText.tsx`)
    - [ ] Update rich text renderer to handle `ProtectedText` nodes
  - [ ] Visibility modes:
    - [ ] Update content access check utilities to return visibility mode
    - [ ] Update `ProtectedContent` component:
      - [ ] Handle `hidden` mode (completely hide content)
      - [ ] Handle `message` mode (show restricted message)
      - [ ] Apply message hierarchy for message content
  - [ ] Menu item restrictions:
    - [ ] Update menu rendering to filter items based on user's MAGs
    - [ ] Add menu item restriction UI in menu editor:
      - [ ] Access level dropdown per menu item
      - [ ] MAG selector per menu item (when access_level = "mag")

- [x] **Multi-MAG protection schema (galleries & content)** — *per membershipQAdiscussion: "assign membership(s) to an object... display gallery of protected content made accessible by the membership(s)"*
  - [x] **Decision:** Junction table vs array column (see options below)
  - [x] **Option A (junction):** Create `gallery_mags(gallery_id, mag_id)` junction; deprecate `required_mag_id` on galleries. Access = user has ANY assigned MAG. Same pattern for content: `content_mags(content_id, mag_id)`.
  - [ ] **Option B (array):** Add `required_mag_ids UUID[]` to galleries; keep `access_level`. Query: `WHERE required_mag_ids && ARRAY[user's mag ids]`. Same for content if desired.
  - [x] **GalleryEditor UI:** "Membership Protection" section — access level dropdown; **multi-select MAG picker** (when "Specific Memberships"); visibility mode; restricted message.
  - [ ] **Content (posts/pages):** Apply same multi-MAG pattern for consistency (TBD in planning).

- [ ] **Membership and media items (sessionlog up-next)** — make media protection consistent with content/galleries; mag-tag optional (filtering only).
  - [x] Add **media_mags(media_id, mag_id)** table (same pattern as gallery_mags); migration 094.
  - [x] Protection: getMagIdsOnMedia, filterMediaByMagIdAccess using getMemberMagIds; switch gallery public API from mag-tag to media_mags.
  - [x] API: read/write media MAG assignments (GET/PUT media/[id]/mags).
  - [x] Media item UI: membership selector (multi-select MAGs) on media item page (Memberships tab); mag-tag remains optional for filtering.
  - [ ] Optional backfill: media_mags from existing mag-tags on media.
  - [ ] Red "M" badge on gallery list/grid for items in a membership (media_mags).
  - [ ] Red "M" badge in media library (list + grid) for items in a membership.

- [ ] Content editor integration
  - [x] Update content editor (full-page EditContentClient / ContentEditorForm — unified model for post/page):
    - [x] Add access level dropdown (public, members, mag)
    - [x] Add MAG selector (single required_mag_id for now; multi-MAG TBD)
    - [x] Add visibility mode toggle (hidden/message)
    - [x] Add restricted message input (optional override)
  - [ ] Update `src/components/posts/PostEditor.tsx` (if still used): same as above
  - [x] Update `src/components/galleries/GalleryEditor.tsx`:
    - [x] Add "Membership Protection" section
    - [x] Add access level dropdown (public, members, specific memberships)
    - [x] Add **multi-select MAG picker** (when access_level = "mag") — user can access if they have ANY of the assigned MAGs
    - [x] Add visibility mode toggle (hidden/message)
    - [x] Add restricted message input (optional override)
  - [ ] Update `src/components/pages/PageEditor.tsx` (if still used): same as above
  - [ ] Add section-level restrictions UI (page editor)
  - [ ] Update Tiptap editor:
    - [ ] Protected text toolbar button
    - [ ] MAG selector when inserting protected text
    - [ ] Message override input
    - [ ] Visual indicators for protected text blocks
  - [ ] Add preview mode to see member view

- [x] API routes for MAGs (under /api/crm)
  - [x] `GET/POST /api/crm/mags` — list, create (admin)
  - [x] `GET/PUT/DELETE /api/crm/mags/[id]` — get, update, delete (admin)
  - [x] `GET /api/crm/mags/search?q=...` — search MAGs
  - [x] Contact–MAG assignment: `GET/POST/DELETE /api/crm/contacts/[id]/mags`
  - [ ] **Deferred:** /api/mags/[id]/assign and /remove (API key auth for ecommerce); /api/members/* (member by email, verify MAG, member profile); content API routes enforcing access_level (posts, pages); search/RSS filtering for restricted content

- [ ] Ecommerce Integration API (simple tag-based system)
  - [ ] Create API key management system:
    - [ ] Create `api_keys` table (key_hash, name, rate_limit, created_at, expires_at)
    - [ ] Create `src/lib/api/api-keys.ts` utilities (validate, rate limiting)
    - [ ] Create API key generation endpoint (admin only): `POST /api/admin/api-keys`
  - [ ] Create payment webhook endpoints (simple tag matching):
    - [ ] Create `src/app/api/webhooks/payment/route.ts` (generic webhook handler)
    - [ ] Create `src/app/api/webhooks/payment/stripe/route.ts` (Stripe-specific handler)
    - [ ] Create `src/app/api/webhooks/payment/shopify/route.ts` (Shopify-specific handler)
    - [ ] Create `src/app/api/webhooks/payment/woocommerce/route.ts` (WooCommerce-specific handler)
    - [ ] Implement webhook signature verification per provider
    - [ ] Create `src/lib/webhooks/payment-processor.ts`:
      - [ ] `extractTagAndEmail()` - Extract tag and email from webhook payload (provider-specific)
      - [ ] `findMAGByTag()` - Lookup MAG by `ecommerce_tag`
      - [ ] `assignMAGOnPayment()` - Auto-assign MAG if enabled
      - [ ] `handleWebhookError()` - Error handling and logging
  - [ ] Implement simple payment-to-MAG flow:
    - [ ] Create `src/lib/mags/payment-integration.ts`:
      - [ ] `findMAGByTag()` - Lookup MAG by ecommerce_tag
      - [ ] `assignMAG()` - Simple assignment (no payment data)
      - [ ] `createOrUpdateMember()` - Create member profile if doesn't exist
      - [ ] `preventDuplicateAssignment()` - Idempotency check (email + tag combination)
    - [ ] Handle duplicate webhook prevention (idempotency based on email+tag)
    - [ ] Simple error handling and logging

- [ ] Member authentication middleware
  - [ ] Update `src/middleware.ts` to handle member routes (`/members/*`)
  - [ ] Add member session validation (separate from admin)
  - [ ] Implement protected content route checks

- [ ] Dashboard integration (CRM view)
  - [ ] Add membership statistics to admin dashboard
  - [ ] Show recent member registrations
  - [ ] Display membership group counts
  - [ ] Quick access to member management (`/admin/members`)
  - [ ] Link form submissions to member profiles (when email matches) - **Requires Phase 07 (CRM)**
  - [ ] Unified customer view (form submissions + memberships) - **Requires Phase 07 (CRM)**
  - [ ] Simple interface for client admins to manage memberships easily
  - [ ] **Note**: Full CRM features (companies, consents, DND, duplicate detection) come in Phase 10B

### Phase 9C: Members Table & Ownership (User Licenses)

**Status**: Schema and utilities complete. **Still needed:** Elevation flow (when to create members row) and wiring so admin grant MAG and first-time code redemption create/link members. See [members-and-ownership-summary.md](./reference/members-and-ownership-summary.md).

**Design**: Members = qualified contacts (MAG + auth). Simple signup = contact only. Ownership = per-item licenses for media and courses (iTunes-style "My Library").

**Phase 9C — What we built vs what we need**

**Built**
- **Schema:** `members` table (id, contact_id UNIQUE, user_id UNIQUE nullable, created_at, updated_at); `user_licenses` table (member_id, content_type, content_id, granted_via, granted_at, expires_at, metadata). Migrations in archive (072/073 or equivalent). RLS and grants per project pattern.
- **members.ts:** getMemberByContactId(contactId), getMemberByUserId(userId), createMemberForContact(contactId, userId?), resolveMemberFromAuth() → member id or null. Idempotent create; optional user_id update when linking auth to existing member.
- **licenses.ts:** hasLicense(memberId, contentType, contentId), grantLicense(…), revokeLicense(…), getMemberLicenses(memberId, contentType?), filterMediaByOwnership(mediaIds, memberId). Content types: 'media' | 'course'.
- **Usage:** Redeem-code API (POST /api/members/redeem-code) uses getMemberByUserId and redeemCode(memberId) — assigns MAG to member’s contact via addContactToMag; does **not** create the members row (expects member to already exist). Batch Explore page joins to members for redeemed_by_member_id.
- **Performance:** CRM + members sync (ensure contact in CRM, ensure members row) runs only on **member-designated pages** (`/members/*` layout), not on every public page. Keeps rest of site fast; see [prd.md](./prd.md) — Performance (Speed) and Member sync and performance. **Membership is limited to certain pages for now.** When the **Membership feature switch** is ON (see Phase 09 — membership master toggle on `/admin/crm/memberships`), sync can be global; when OFF, no sync and no content protection — **optimized site speed for sites that do not require any gated content.** When implementing membership shortcodes (Apply code, MAG-gated blocks on arbitrary pages), the switch governs whether membership runs at all; latency testing will inform sync scope when ON.

**Still needed**
- **Elevation flow — when to create members row:** (1) **Admin assign MAG (done):** When admin adds a contact to a MAG (POST /api/crm/contacts/[id]/mags), POST /api/crm/contacts/[id]/mags calls createMemberForContact(contactId) after addContactToMag (idempotent). (2) **First-time code redemption:** Either (a) “Register with code” on login: create contact by email if needed, createMemberForContact(contactId, userId) after auth, then redeem code; or (b) “Apply code” for already-logged-in member — then member must already exist (e.g. created by admin or prior flow). (3) **Purchase webhook (later):** When assigning MAG on payment, createMemberForContact(contactId) if not already member.
- **Documentation:** Short doc or planlog note: simple signup = contact only; member = purchase OR admin grant OR signup code; when to create members row (three triggers above). Form auto_assign_mag_ids = for qualifying forms only (not every form).
- **Optional:** Update LMS Phase 17 plan to use user_licenses for course enrollment alongside course_mags.

- [x] Schema: members table
  - [x] Create `members` table (id, contact_id UNIQUE FK → crm_contacts, user_id UNIQUE FK → auth.users nullable, created_at, updated_at)
  - [x] Existence of row = contact is a member; user_id nullable until they register
  - [x] Indexes: contact_id, user_id
  - [x] RLS, grants per project pattern (migration 072)

- [x] Schema: user_licenses table
  - [x] Create `user_licenses` table (id, member_id FK → members, content_type CHECK IN ('media','course'), content_id UUID, granted_via, granted_at, expires_at, metadata JSONB, created_at)
  - [x] UNIQUE(member_id, content_type, content_id)
  - [x] Indexes: member_id, content_type+content_id
  - [x] RLS, grants per project pattern (migration 073)

- [x] Members utilities
  - [x] Create `src/lib/supabase/members.ts`:
    - [x] `getMemberByContactId(contactId)` — get member row by contact
    - [x] `getMemberByUserId(userId)` — get member row by auth user
    - [x] `createMemberForContact(contactId, userId?)` — elevate contact to member (idempotent)
    - [x] `resolveMemberFromAuth()` — auth.uid() → members.id for current user

- [x] Licenses utilities
  - [x] Create `src/lib/supabase/licenses.ts`:
    - [x] `hasLicense(memberId, contentType, contentId)` — check ownership
    - [x] `grantLicense(memberId, contentType, contentId, options)` — grant license
    - [x] `revokeLicense(memberId, contentType, contentId)` — revoke
    - [x] `getMemberLicenses(memberId, contentType?)` — list owned items
    - [x] `filterMediaByOwnership(mediaIds, memberId)` — filter to owned only

- [x] Admin assign MAG → create member
  - [x] POST /api/crm/contacts/[id]/mags: after addContactToMag success, call createMemberForContact(contactId) (idempotent)
- [x] Elevation flow documentation
  - [x] Document: simple signup = contact only; member = purchase OR admin grant OR signup code (see "Elevation flow" note above in Phase 9C)
  - [x] Form auto_assign_mag_ids: only for qualifying forms (not every form)
  - [x] When to create members row: admin grant MAG (done), purchase webhook (later), signup code redemption (Apply code requires existing member; optional register-with-code)
- [ ] First-time code redemption (optional): register with code on login

- [x] Types
  - [x] Add Member, UserLicense types to database.ts
  - [ ] Update LMS Phase 17 plan: use user_licenses for course enrollment alongside course_mags

### Phase 9A: Membership Code Generator & Redemption

**Status**: Core complete. Schema, code-generator.ts, admin UI (Code Generator, batches, Explore), and redeem API are implemented. **Still needed:** Public/member UI for code entry (login "Have an access code?" and/or member dashboard/profile "Apply code"); optional "No ambiguous" preset in admin generator UI.

**Purpose**: Two code types — (1) single-use redemption codes: unique codes, one use each, tracked; (2) multi-use codes: one shared code, finite or unlimited uses. Two-table design: `membership_code_batches` + `membership_codes`.

**Phase 9A — What we built vs what we need**

**Built**
- **Schema:** `membership_code_batches` (mag_id, name, use_type single_use|multi_use; single_use: num_codes, expires_at, code_prefix, code_suffix, random_length, exclude_chars, created_by; multi_use: code_hash, code_plain, max_uses, use_count, expires_at). `membership_codes` (batch_id, code_hash, status available|redeemed, redeemed_at, redeemed_by_member_id). `membership_code_redemptions` for multi-use "who used when". Migrations 078, 079 (archive). RLS, indexes.
- **code-generator.ts:** generateCodeString(prefix, suffix, randomLength, excludeChars) with NO_AMBIGUOUS preset; hashCode; createSingleUseBatch; createMultiUseCode; generateSingleUseCodes; redeemCode(code, memberId). Single-use: find available by hash, check batch expires_at, idempotent getContactMags then addContactToMag, update code status, createNote. Multi-use: find batch by hash, check expires_at and max_uses, same assign + increment use_count, insert redemption row, createNote.
- **Admin UI:** Code Generator at /admin/crm/memberships/code-generator — create batch (MAG, single_use|multi_use, num_codes/max_uses, expires_at, prefix, suffix, random length); multi-use: enter code string; single-use: "Generate N codes", export CSV; batch list with stats; Explore per batch with redemption table (code, status, contact/email link, redeemed_at).
- **API:** POST/GET /api/admin/membership-codes/batches; POST batches/[id]/generate; GET batches/[id]/codes; POST /api/members/redeem-code (auth member, body.code).

**Still needed**
- **Public/member UI — code entry:** (1) Login page: optional "Have an access code?" field; on submit after auth, if code provided call POST /api/members/redeem-code (requires user to already be a member — so either combine with "register with code" that creates member first, or "Apply code" only for already-logged-in members). (2) Member dashboard or profile: "Apply code" section — input code, submit to POST /api/members/redeem-code; show success/error. Depends on Phase 09 member routes (/members, /members/profile) and 9C elevation (member row exists when admin assigned MAG or after first-time flow).
- **Optional:** Admin generator UI: expose "No ambiguous" character preset as a checkbox (backend already uses it by default); custom exclude list field optional.

- [x] Schema: membership code tables (client schema)
  - [x] Create `membership_code_batches` table:
    - [x] id, mag_id (FK → mags), name, use_type (single_use | multi_use)
    - [ ] For multi_use: code_hash TEXT, max_uses INT, use_count INT DEFAULT 0, expires_at TIMESTAMPTZ
    - [ ] For single_use: num_codes INT, expires_at TIMESTAMPTZ
    - [ ] Pattern fields (optional): code_prefix TEXT, code_middle TEXT, code_suffix TEXT, random_length INT
    - [ ] Charset: exclude_chars TEXT (e.g., "oO0iIlL1") or preset (no_ambiguous)
    - [ ] created_at, created_by (admin user id optional)
  - [x] Create `membership_codes` table (single-use only):
    - [x] id, batch_id (FK → membership_code_batches), code_hash TEXT UNIQUE
    - [x] status (available | redeemed), redeemed_at, redeemed_by_member_id (FK → members)
  - [ ] Optional: `code_redemption_log` for multi-use "who used when" (or add columns to batch)
  - [x] RLS, indexes per project pattern

- [x] Code generation utilities
  - [x] Create `src/lib/mags/code-generator.ts`:
    - [x] `generateSingleUseCodes(batchId, count, options?)` — generate unique codes with pattern and charset, hash and insert into membership_codes
    - [x] `createMultiUseCode(magId, code, maxUses, expiresAt)` — create batch with one code
    - [x] `generateCodeString(options)` — crypto-safe random string with:
      - [ ] Pattern: prefix, middle, suffix (fixed text) + random segment(s)
      - [ ] Character exclusion: preset "no ambiguous" (omit o,O,0,i,I,l,L,1) or custom exclude list
      - [ ] Configurable length for random segment(s)
    - [x] `hashCode(code)` — normalize (trim, lowercase) and hash for lookup
    - [x] `redeemCode(code, memberId)` — validate, mark used, assign MAG

- [x] Redemption flow
  - [ ] Validate: not expired, not already used (single-use), under max_uses (multi-use)
  - [ ] Assign MAG to member via `user_mags`
  - [ ] Update membership_codes or batch use_count
  - [ ] Idempotency: same member + same code = no double-assign (check existing user_mags)

- [x] Admin UI: Code Generator
  - [x] Add to CRM → Memberships: "Code Generator" page (/admin/crm/memberships/code-generator)
  - [x] Create batch form: MAG selector, use_type (single_use | multi_use), num_codes or max_uses, expires_at
  - [x] Pattern config: prefix, suffix (optional text inputs); random segment length
  - [ ] Character exclusion: preset "No ambiguous" in generator; custom exclude list (optional)
  - [x] For multi-use: input code string, save
  - [x] For single-use: "Generate N codes" button, show count, export CSV (plain codes for distribution)
  - [x] Batch list: name, MAG, type, usage stats (e.g., 45/100 redeemed), expires, actions
  - [x] "Explore" button per batch → dedicated page `/admin/crm/memberships/code-generator/batches/[id]` with redemption table (Code, Status, Contact/Email with link to contact, Redeemed timestamp)

- [ ] Public/member UI: Code entry
  - [ ] Login/register page: optional "Have an access code?" field; on submit, if code provided, validate and assign MAG after auth
  - [x] Member profile/account page: "Apply code" section — input code, submit; validate and assign MAG to current member (ApplyCodeBlock on member dashboard; 2026-02-03)

- [x] API routes
  - [x] `POST /api/admin/membership-codes/batches` — Create batch (admin)
  - [x] `GET /api/admin/membership-codes/batches` — List batches (admin)
  - [x] `POST /api/admin/membership-codes/batches/[id]/generate` — Generate single-use codes (admin)
  - [x] `GET /api/admin/membership-codes/batches/[id]/codes` — List codes in batch (admin; for Explore page)
  - [x] `POST /api/members/redeem-code` — Redeem code (authenticated member)

### Phase 9E: Gallery Enhancement (prerequisite for membership protection testing)

**Status**: In progress - Galleries must be fully functional before testing MAG protection on gallery items.

**Design**: Galleries are virtual groupings of media. No taxonomy on gallery; media items have taxonomy. Shortcode method: style options in shortcode attributes; no schema for presentation. Two-way assignment: media ↔ galleries. Developer use: `GET /api/galleries/[id]` returns JSON; custom styling in code.

**Phase 9E — What we built vs what we need**

**Built**
- **Schema & core (Phases 1–3):** Gallery `status`, `access_level`, `required_mag_id`, `visibility_mode`, `restricted_message`; GalleryEditor status field and list filters; ImagePreviewModal "Assign to galleries"; GalleryEditor media picker with taxonomy-filtered media; shared `MediaFilterBar`; gallery_items two-way assignment via `galleries.ts` helpers.
- **Shortcode system (Phase 4):** `src/lib/shortcodes/gallery.ts` — `GALLERY_SHORTCODE_SPEC`, `parseGalleryShortcode`, `findGalleryShortcodes`, `generateGalleryShortcode`. `ContentWithGalleries` parses body HTML and replaces shortcodes with `GalleryEmbed`. Server `GalleryRenderer` uses `getGalleryForPublic`; client `GalleryEmbed` fetches `/api/galleries/[id]/public?styleId=`.
- **GalleryPreviewModal (Phase 4.5, partial):** `GalleryPreviewModal` exists: lightbox, image + native `<video>` (display_url), prev/next, keyboard (arrows, ESC), caption, counter. Used in `GalleryEmbed` and thus on standalone gallery page. **Missing:** External video embed (YouTube/Vimeo/Adilo via `video_url` + `provider`); optional thumbnail strip; optional zoom/pan for images.
- **Shortcode builder UIs (Phase 5):** `GalleryPickerModal` — pick gallery + style, insert shortcode at cursor (RichTextEditor). Gallery edit page: "Use this gallery" with copy shortcode and standalone URL. **Optional still:** Gallery list quick "Copy shortcode"; cheat sheet in editor footer/modal.
- **Public gallery & API (Phase 6):** `(public)/gallery/[slug]/page.tsx` with `checkGalleryAccess`, style picker, `GalleryPageClient` + `GalleryEmbed`. `GET /api/galleries/[id]` and `GET /api/galleries/[id]/public` return JSON (gallery + items with media); public route enforces MAG via `checkGalleryAccess`. **Missing:** Filter gallery items by media taxonomy (categories/tags) in page header.

**Still needed**
- **GalleryPreviewModal:** Support external video (YouTube, Vimeo, Adilo) in lightbox via `video_url` + `provider` (iframe or existing video-embed component). Optional: thumbnail strip for quick jump; zoom/pan for images.
- **Gallery page:** Optional filter bar by media categories/tags so visitors can narrow items (media taxonomy, not gallery-level).
- **Phase 7 (future):** Content–gallery linking (e.g. `content_galleries` junction, editor UI to link galleries to posts).
- **Phase 8 (future):** Gallery style templates & presets (public library + per-tenant presets).

- [x] Phase 1: Schema & core
  - [x] Migration: add `status` (draft | published), `access_level`, `required_mag_id`, `visibility_mode`, `restricted_message` to galleries
  - [x] Update Gallery type and types
  - [x] GalleryEditor: add status field
  - [x] Gallery list: filter by status (All | Published | Draft), status badge on cards

- [x] Phase 2: Assignment — Media → Galleries
  - [x] ImagePreviewModal: add "Assign to galleries" section
  - [x] Multi-select picklist of active (published) galleries (checkbox badges)
  - [x] Load current gallery assignments for media item
  - [x] Add/remove via gallery_items; show which galleries item is in
  - [x] API/helper: get galleries for media; add/remove media from galleries (galleries.ts)

- [x] Phase 3: Assignment — Gallery → Media
  - [x] MediaLibrary (or variant): add taxonomy filter (categories, tags) for GalleryEditor
  - [x] GalleryEditor: wire media picker to taxonomy-filtered media
  - [x] Search + taxonomy filter when adding items to gallery
  - [x] Extract shared `MediaFilterBar` component (Categories, Tags, Reset; Search, Sort, View toggle)
  - [x] GalleryMediaPicker uses same filter/sort/view UI as Media Library

- [x] Phase 4: Shortcode system
  - [x] Create `src/lib/shortcodes/gallery.ts`: GALLERY_SHORTCODE_SPEC (attributes, defaults, example)
  - [x] Shortcode parser: `parseGalleryShortcode`, `findGalleryShortcodes` — format `[[gallery:uuid, style-id]]` or `[[gallery:uuid]]`
  - [x] GalleryRenderer (server) + GalleryEmbed (client): gallery data + style, layout (grid, masonry, slider)
  - [x] Integrate parser into content renderer: `ContentWithGalleries` (blog/post body) replaces shortcodes with GalleryEmbed

- [x] Phase 4.5: Mixed media gallery preview modal (partial)
  - [x] Create `GalleryPreviewModal` component — lightbox for viewing gallery items
  - [x] Mixed media support: detect `media_type` (image vs video) per item
  - [x] Image viewer: full-size display (zoom/pan optional, not yet)
  - [x] Video player: native `<video>` for uploaded/variant videos (display_url)
  - [x] Navigation: Previous/Next arrows, keyboard support (arrows, ESC to close)
  - [x] Seamless transitions between image and video items in same gallery
  - [ ] Thumbnail strip (optional): show all gallery items for quick jump
  - [x] Caption display: show `gallery_items.caption` or `media.alt_text`
  - [ ] External video embed: YouTube/Vimeo/Adilo via `video_url` + `provider` (iframe)

- [x] Phase 5: Shortcode builder UIs
  - [x] Post editor: "Insert gallery" button → GalleryPickerModal (pick gallery, style) → insert shortcode at cursor
  - [x] Gallery edit page: "Use this gallery" section — shortcode copy, standalone URL
  - [ ] Optional: gallery list quick "Copy shortcode" (defaults)
  - [ ] Cheat sheet: collapsible in editor footer or in modal; generated from GALLERY_SHORTCODE_SPEC

- [x] Phase 6: Public gallery & developer API (partial)
  - [x] Create `(public)/gallery/[slug]/page.tsx` — standalone gallery page by slug
  - [x] Confirm `GET /api/galleries/[id]` and `GET /api/galleries/[id]/public` return JSON (items with media)
  - [ ] Gallery display: filter media by categories/tags in header (media taxonomy)
  - [x] Integrate `GalleryPreviewModal` — click item opens lightbox (image + native video)
  - [x] Handle MAG protection: checkGalleryAccess on standalone page + public API
  - [x] **Note:** Gallery membership assignment uses **multi-select MAGs** — see "Multi-MAG protection schema" in Membership Protection phase.
  - [ ] **Note:** Gallery Details Standalone URL prefix comes from superadmin Site URL setting (when added). See planlog superadmin section.

- [ ] Phase 7: Content–gallery linking (future)
  - [ ] `content_galleries(content_id, gallery_id)` junction if posts link to galleries
  - [ ] Content editor UI to link galleries

- [ ] **Phase 8: Gallery style templates & presets (production-ready future feature)**
  - [ ] **Template styles (public library):** Global library of predefined styles (e.g. "Compact Grid", "Full-Width Slider", "Masonry Lightbox")
  - [ ] Create `gallery_style_templates` table (shared/public schema) — id, name, layout, columns, gap, size, captions, lightbox, border, slider_*, display_order
  - [ ] Seed templates via migration; superadmin can add/edit (optional)
  - [ ] Display Style modal: "Start from template" → pick from library → form pre-filled; "Start from scratch" → current behavior
  - [ ] **Presets (optional, per-tenant):** Save current form values as user/tenant preset; "Start from my preset" when creating style
  - [ ] Add `gallery_style_presets` table (tenant schema) if presets desired — id, tenant_id, name, layout, columns, ...
  - [ ] Benefits: faster workflow, consistency, easier onboarding; additive to existing per-gallery display styles

### Phase 10: API Development

**Status**: Deferred - Move after Phase 11 (Deployment Tools) and component library structure. See sessionlog for priority.

- [ ] Enhance public API routes
  - [ ] Improve error handling in existing API routes
  - [ ] Add SEO metadata to post responses
  - [ ] Add pagination to gallery API
  - [ ] Add search/filter to posts API
  - [ ] Ensure all protected content endpoints check MAG access

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
  - [ ] Document MAG access requirements
  - [ ] Add rate limiting documentation

### Phase 11: CLI Deployment Tools

**Status**: Active priority (swapped with Phase 10) - Focus before API dev. Enables deployment and structure for public pages.

- [ ] Create setup script (client/tenant startup script)
  - [ ] Create `scripts/setup-new-client.ts` (or extend existing setup-client script):
    - Interactive CLI for new client setup
    - Schema creation
    - Migration execution
    - Storage bucket creation
    - Environment variable validation
    - **Always assign superadmin access** to the new site (so superadmin can manage it immediately).
    - **Optional first-user (admin):** when provided, script creates tenant user + assignment (Admin) and can send invite; when omitted, operator can scaffold the site first and add the first admin later via Superadmin UI (Tenant Site detail or Tenant Users).
  - [ ] Add `pnpm run setup` script to `package.json`

- [ ] Create client script generator (copy/paste workflow)
  - [ ] Generator UI (e.g. Superadmin section or localhost dev page): form for new client variables (client/site name, slug, schema name, deployment URL, **optional first-admin email** (for first tenant admin; omit to scaffold first), default features).
  - [ ] Generator outputs SQL script for copy/paste into Supabase SQL Editor: `INSERT INTO public.tenant_sites` with entered values; optionally `INSERT INTO public.tenant_features` for default feature set (reference new site id, e.g. via DO block or two-step script).
  - [ ] Optional: output block or instructions for client schema creation (`CREATE SCHEMA` + migrations) if that is run via SQL Editor; or note to run existing setup-client script separately for schema.
  - [ ] Generator outputs short checklist for manual steps: if first admin was not set by script, create/invite first admin via Auth or Superadmin UI; set env vars for deployment.
  - [ ] Workflow: use generator in dev (localhost), copy generated SQL into Supabase SQL Editor and run manually; then complete any non-SQL steps (auth, env). No need to run scripts from the app; generator only produces the script.

- [ ] Create reset script
  - [ ] Create `scripts/reset-content.ts` (CLI for resetting content, partial/full options)
  - [ ] Add `pnpm run reset` script to `package.json`

- [ ] Create archive script
  - [ ] Create `scripts/archive-project.ts` (CLI for archiving project, backup options)
  - [ ] Add `pnpm run archive` script to `package.json`

### Phase 11b: Digicards (Digital Business Cards)

**Status**: Planned - Future enhancement

**Goal**: Single-page digital business cards ("Digicards") for the tenant client and their team. Mobile-optimized landing pages at `https://clientdomain.com/digicard/[slug]` with VCF download, native share, and PWA add-to-home-screen. Admin manages their own card and team member cards. Analytics (view/open/share) feed Activity Stream or a dedicated dashboard.

**Reference**: See `prd-planned.md` — Digital Business Card Feature (team_members schema, vCard, PWA). **Team member profile** (Phase 18b) is the **data source** for Digicards: bio, photo, social links, etc. live on the team profile; Digicards read from it.

- [ ] Schema and team members
  - [ ] Create `team_members` table (or equivalent) — may align with Phase 18b team member profile: id, name, title, company, email, phone, bio, photo_url, social_links JSONB, digicard_slug UNIQUE, is_active, created_at, updated_at
  - [ ] Create `digicard_events` table for analytics: id, team_member_id, event_type (view | open | share | vcf_download), created_at, metadata JSONB (user_agent, referrer, etc.)
- [ ] Admin UI
  - [ ] CRM or Settings → Digicards (or Team Cards)
  - [ ] List cards: tenant/org card + team member cards
  - [ ] Add/Edit card: name, title, company, email, phone, bio, photo, social links, slug
  - [ ] Preview link to public page
- [ ] Public digicard page
  - [ ] Route: `/(public)/digicard/[slug]/page.tsx` → `https://clientdomain.com/digicard/team-member-name`
  - [ ] Single-page layout optimized for mobile
  - [ ] PWA manifest + service worker so page can be saved to device home screen
- [ ] VCF (vCard) download
  - [ ] API or route: `GET /digicard/[slug]/vcf` or `/api/digicard/[slug]/vcard`
  - [ ] Generate .vcf from team member data for one-tap save to contacts
- [ ] Share button
  - [ ] Native Web Share API: `navigator.share()` opens device share sheet (text, email, AirDrop, etc.)
  - [ ] Fallback: copy link, or compose mail with pre-filled contact
- [ ] Analytics and tracking
  - [ ] Track: view (page load), open (e.g. link open), share (Share API success), vcf_download
  - [ ] Store in `digicard_events`; optionally write to Activity Stream (e.g. as contact activity if linked) or separate Digicards dashboard
  - [ ] Admin: Digicards dashboard panel — views, shares, downloads per card; time range filter
- [ ] Design system integration
  - [ ] Digicard layout uses tenant design system (fonts, colors, branding)
  - [ ] Photo from Media Library or URL
- [ ] Documentation
  - [ ] How to add team members, customize cards, interpret analytics
    [ ] Team members complete a form and upload a photo.

**Note**: Tenant "org" card can be a special team_member (e.g. `is_primary` or slug `company`) for the client’s main business card.

---

### Phase 12: Integrating External Applications

**Status**: Planned. External integrations (email marketing, live chat) were previously listed under Phase 09 by priority; they are not part of the membership core. Phase 12 groups them as **12A** (Marketing) and **12B** (AnyChat). **Former Phase 12 (Visual Component Library)** moved to end of planlog as Phase 20 (cancelled, reference only). We decided against a dynamic site (WordPress-style) and a drag-and-drop / section-editor page builder. The product uses a **simple Code Library** (Superadmin → Code Library) where we store copy-paste code blocks (headers, hero sections, etc.) for tenant use. No visual component catalog, no scanner, no DB-driven section picker. Phase 02’s “crude MVP component library manager” was superseded by the Code Library; this full Phase 12 scope is obsolete.

**Note**: This was the full visual component library system (from old Phase 13). All items below are **cancelled**; retained for reference only.

~~**Spec — Central shared library in public schema:** Section/component building blocks (the blocks used in the Page section editor) would have been stored in a table in the public schema. We do not have a Page section editor; we have a Code Library instead.~~

- [x] ~~Create component library database schema (**public** schema)~~ **N/A — cancelled**
  - [x] ~~Create migration for **public** schema table~~ **N/A**
  - [x] ~~Table fields…~~ **N/A**
  - [x] ~~Add indexes…~~ **N/A**
  - [x] ~~Create Supabase Storage bucket `component-library/`~~ **N/A**

- [x] ~~Build component scanner/auto-discovery system~~ **N/A — cancelled**
  - [x] ~~Create `src/lib/components/scanner.ts`~~ **N/A**
  - [x] ~~scanComponents, extractMetadata, parseProps, etc.~~ **N/A**

- [x] ~~Build superadmin component library UI~~ **N/A — cancelled**
  - [x] ~~Component library list page~~ **N/A**
  - [x] ~~Component detail page~~ **N/A**

- [x] ~~Implement image upload/management~~ **N/A — cancelled**
  - [x] ~~ComponentImageUpload, image API~~ **N/A**

- [x] ~~Create component scanning API and automation~~ **N/A — cancelled**
  - [x] ~~Scan route, scheduled job, file watcher, CI/CD~~ **N/A**

- [x] ~~Build component library search functionality~~ **N/A — cancelled**
  - [x] ~~Full-text search, search API~~ **N/A**

### Phase 13: Archive & Restore System

**Status**: Pending - Can run parallel with other phases

- [ ] Create archive registry table
  - [ ] Create migration `supabase/migrations/009_archive_registry.sql`
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

### Phase 14: Reset All for Clean Template

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

### Phase 15: Polish & Testing

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

### Phase 16a: RAG Knowledge Document Export (External AI Agent Feed)

**Status**: Planned - Future enhancement

**Goal**: Produce a single public-but-hidden document containing condensed CMS content so external AI agents (Custom GPTs, etc.) can be pointed at one URL instead of many. Most AI agent training UIs accept URLs one at a time; this document represents the full client website in one place.

**Concept**:
- Per-content checkbox (auto-checked by default): "Include in AI knowledge document"
- When content is created/updated, optionally include it in a consolidated, optimized document
- Each entry: condensed/cleaned text (strip HTML, summarize if needed)
- Single document served at unlisted URL (token-protected or UUID path)
- Admin: regenerate button, copy URL for pasting into AI agent config

- [ ] Schema and content flag
  - [ ] Add `include_in_rag_export` boolean to content (default `true`)
  - [ ] Migration for new column
- [ ] Content editor integration
  - [ ] Add checkbox "Include in AI knowledge document" to ContentEditModal (default checked)
  - [ ] Persist on save
- [ ] Document builder
  - [ ] Create `src/lib/ai/rag-knowledge-doc.ts`:
    - `buildRagKnowledgeDocument()` - Query opted-in content, condense each, concatenate
    - Condense: strip HTML, extract plain text, optional truncation/summary per entry
    - Include: title, slug, excerpt, condensed body, content type, public URL
  - [ ] Regenerate on content save (async) or via admin "Regenerate" button
- [ ] Public delivery
  - [ ] Route: `/api/rag-knowledge` or `/rag/[uuid].txt` (unlisted; token or UUID in path)
  - [ ] Public, no auth required (document is non-sensitive condensed content)
  - [ ] Cache or store built document; invalidate on regenerate
- [ ] Admin UI
  - [ ] Settings → RAG Knowledge (or under Content/Settings)
  - [ ] "Regenerate" button
  - [ ] "Copy URL" for pasting into external AI agent (Custom GPT, etc.)
  - [ ] Optional: Rotate token / generate new UUID for URL
- [ ] Documentation
  - [ ] How to use with ChatGPT Custom GPTs, other AI agents
  - [ ] Security note: URL is unlisted but not secret; document contains only public-facing condensed content

**Note**: This feeds external AI agents. Phase 16 (RAG Chatbot) builds an on-site chatbot with vector embeddings; the condensed document could optionally feed that pipeline later.

---

### Phase 16: RAG Chatbot (Future Nice-to-Have)

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

### Phase 17: LMS Components for Developing Courseware (Future Nice-to-Have)

**Status**: Planned - Future enhancement

**Note**: Visual components will be part of library but course requires unique code to be developed.

- [ ] Design LMS schema extension
  - [ ] Create `courses` table (title, slug, description, status, mag_id for access)
  - [ ] Create `lessons` table (course_id, title, slug, content, order, status)
  - [ ] Create `course_progress` table (member_id, course_id, progress_percentage, started_at, completed_at)
  - [ ] Create `lesson_completion` table (member_id, lesson_id, completed_at)
  - [ ] Create `course_mags` junction table (course_id, mag_id) for course access control

- [ ] Build LMS admin UI
  - [ ] Create course management interface
  - [ ] Create lesson management interface
  - [ ] Link courses to MAGs for access control
  - [ ] Track student progress

- [ ] Build LMS public UI
  - [ ] Create course catalog page
  - [ ] Create course detail page
  - [ ] Create lesson viewer
  - [ ] Create student dashboard (progress tracking)

- [ ] Integrate with MAG system
  - [ ] Use MAG access control for courses
  - [ ] Track course completion and grant MAGs if configured

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

### MAG (Membership Access Groups) Platform & CRM Integration
- MAGs stored in client schema (mags table)
- Members extend Supabase auth.users with profile in members table
- Many-to-many relationship: members can belong to multiple MAGs
- Content protection via access_level (public, members, mag) with granular control:
  - Page-level protection
  - Section/component-level protection (JSONB)
  - Inline text protection (shortcode syntax)
  - Menu item restrictions
- Visibility modes: `hidden` (default) or `message` (opt-in)
- Message hierarchy: Inline override > Section/component override > MAG default > System fallback
- Separate member authentication flow from admin authentication
- **CRM System**: Unified system for managing form submissions and MAGs
  - Form submissions and MAGs managed in same CRM interface
  - Link form submissions to member profiles (email matching)
  - Track customer journey from form submission to MAG conversion
  - **Easy Admin Management**: Client admins can easily log in and manage MAGs
    - Simple assign/remove interface
    - Member status management
    - Bulk operations
- **Simple Ecommerce Integration**: Tag-based reference system
  - Simple `ecommerce_tag` field in MAGs (no duplicate payment data)
  - Payment webhook endpoints match tag and assign MAG
  - All payment details remain in ecommerce platform (not duplicated)
  - API key authentication for webhook endpoints
  - Simple payment-to-MAG automatic flow

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
- Follow phase dependencies (don't start Phase 02 before Phase 01 is complete)
- Refer to `docs/prd.md` for detailed architecture and specifications
- Review and update regularly during development sessions

**Note**: All PRD updates have been integrated into the appropriate phases above. The reorganization is complete with the new priority order (00-17).

**Status**: Pending - New feature for managing client tenants and admin users

- [ ] Create client/tenant registry database schema
  - [ ] Create migration `supabase/migrations/006_client_tenants.sql`:
    - [ ] `public.client_tenants` table (id, client_name, slug, schema_name, status, deployment_url, github_repo, site_mode, site_mode_locked, site_mode_locked_by, site_mode_locked_at, site_mode_locked_reason, created_at, updated_at, notes)
    - [ ] `public.client_admins` table (id, user_id, email, display_name, status, temporary_password_set, password_set_at, created_at, updated_at, notes)
    - [ ] `public.client_admin_tenants` junction table (id, admin_id, tenant_id, role, assigned_at, assigned_by)
    - [ ] Add indexes for performance (slug, schema_name, email lookups)

- [ ] Create client/tenant management utilities
  - [ ] Create `src/lib/supabase/client-tenants.ts`:
    - [ ] `getClientTenants()` - List all client tenants (with filtering)
    - [ ] `getClientTenant()` - Get tenant details by ID
    - [ ] `createClientTenant()` - Create new client tenant record
    - [ ] `updateClientTenant()` - Update tenant record
    - [ ] `getClientAdmins()` - List all client admins (global or filtered by tenant)
    - [ ] `getClientAdmin()` - Get admin details
    - [ ] `createClientAdmin()` - Create admin user (Supabase Auth + CRM record)
    - [ ] `assignAdminToTenant()` - Link admin to tenant(s)
    - [ ] `removeAdminFromTenant()` - Unlink admin from tenant
    - [ ] `lockSiteMode()` - Lock site mode (superadmin only)
    - [ ] `unlockSiteMode()` - Unlock site mode (superadmin only)
    - [ ] `updateSiteMode()` - Change site mode (with lock check)

- [ ] Build superadmin client management UI
  - [ ] Create `src/app/admin/super/clients/page.tsx` (client list view):
    - [ ] Table showing: client name, schema, status, deployment URL, site mode, admin count
    - [ ] Filter by status (active, archived, suspended)
    - [ ] Filter by site mode (coming_soon, live)
    - [ ] Search by client name
    - [ ] Quick actions: View details, Create admin, Archive client
  - [ ] Create `src/app/admin/super/clients/new/page.tsx` (create new client):
    - [ ] Client name input
    - [ ] Auto-generate slug and schema name
    - [ ] Status selection
    - [ ] Deployment URL and GitHub repo fields
    - [ ] Site mode default (coming_soon)
    - [ ] Notes field
  - [ ] Create `src/app/admin/super/clients/[id]/page.tsx` (client detail view):
    - [ ] Client information display
    - [ ] Deployment tracking (GitHub repo, Vercel URL, domain)
    - [ ] Site mode control section:
      - [ ] Current mode display (coming_soon/live)
      - [ ] Lock status indicator
      - [ ] Lock reason display (if locked)
      - [ ] Toggle lock button (superadmin only)
      - [ ] Change mode button (if not locked)
    - [ ] Admin list with add/remove buttons
    - [ ] Notes field
    - [ ] Quick actions: Create admin, Archive client, View deployment
  - [ ] Create `src/app/admin/super/clients/[id]/admins/page.tsx` (manage client admins):
    - [ ] List of all admins assigned to this client
    - [ ] Add new admin button
    - [ ] For each admin: email, display name, status, assigned date, actions (Suspend, Remove, View details)
  - [ ] Create `src/app/admin/super/clients/[id]/admins/new/page.tsx` (create admin for client):
    - [ ] Email input (required)
    - [ ] Display name input (optional)
    - [ ] Assign to tenant(s) multi-select
    - [ ] Status selection (default: active)
    - [ ] Notes field
    - [ ] On submit: Create Supabase Auth user with temporary password, set user metadata, create CRM record, link to tenant(s), send email
  - [ ] Create `src/app/admin/super/admins/page.tsx` (global admin list):
    - [ ] View all client admins across all sites
    - [ ] Filter by tenant
    - [ ] See which sites each admin manages
    - [ ] Create new admin (assign to tenant during creation)
    - [ ] Suspend/activate admins globally
  - [ ] Create `src/components/superadmin/ClientList.tsx` (table view)
  - [ ] Create `src/components/superadmin/ClientDetail.tsx` (detail view)
  - [ ] Create `src/components/superadmin/AdminList.tsx` (admin table view)
  - [ ] Create `src/components/superadmin/AdminCreationForm.tsx` (admin creation form)
  - [ ] Create `src/components/superadmin/SiteModeControl.tsx` (site mode toggle with lock display)

- [ ] Implement email notifications for admin creation
  - [ ] Create email template for new admin welcome
  - [ ] Include login URL (tenant-specific deployment URL)
  - [ ] Include temporary password
  - [ ] Include instructions to set new password on first login
  - [ ] Include link to password reset if needed
  - [ ] Send email when admin is created

- [ ] Update site mode control in tenant admin settings
  - [ ] Update `src/app/admin/settings/page.tsx` to show site mode toggle
  - [ ] Display lock status if site mode is locked
  - [ ] Disable toggle if locked (with explanation)
  - [ ] Show lock reason if locked
  - [ ] Allow tenant admin to toggle if not locked

- [ ] Create API routes for client/tenant management
  - [ ] `GET /api/super/clients` - List all clients (superadmin only)
  - [ ] `GET /api/super/clients/[id]` - Get client details
  - [ ] `POST /api/super/clients` - Create new client
  - [ ] `PUT /api/super/clients/[id]` - Update client
  - [ ] `POST /api/super/clients/[id]/admins` - Create admin for client
  - [ ] `PUT /api/super/clients/[id]/site-mode` - Change site mode (with lock check)
  - [ ] `PUT /api/super/clients/[id]/site-mode/lock` - Lock/unlock site mode

### Phase 18: Admin Sidebar Feature Gating & Custom Links

**Status**: Planned - Superadmin controls feature visibility per tenant; custom links per fork. Can be extended to **per-role** feature selection (see Phase 18b).

**Purpose**: Enable tiered feature offerings. Some clients don't get all features. Disabled features show as ghosted (visible but greyed out); optionally route to preview/upsell page. Custom links per tenant (not in template) for client-specific navigation.

- [ ] Schema and storage for sidebar configuration
  - [ ] Create `sidebar_features` (or tenant config) — template feature IDs with enabled/disabled per tenant
  - [ ] Create `sidebar_custom_links` — per-tenant custom links (label, href, icon, display_order, open_in_new_tab)
  - [ ] Store in tenant schema (client_xxx) or tenant config table

- [ ] Superadmin UI: Sidebar feature gating
  - [ ] Add Sidebar section to client detail (`/admin/super/clients/[id]` or sub-page `/admin/super/clients/[id]/sidebar`)
  - [ ] List all template sidebar features (Content, Galleries, Media, CRM, Events, Settings, etc.)
  - [ ] Toggle each feature on/off per tenant
  - [ ] Optional: Set upsell URL per disabled feature (when disabled, link goes to preview offer page instead of greyed-out)

- [ ] Superadmin UI: Custom links
  - [ ] Add/Edit/Delete custom sidebar links per tenant
  - [ ] Fields: label, href (internal path or external URL), icon (optional), display_order, open_in_new_tab
  - [ ] Custom links are not part of template — stored per fork/tenant

- [ ] Sidebar component updates
  - [ ] Load sidebar config from API/settings (per tenant)
  - [ ] Render enabled features as normal links
  - [ ] Render disabled features as ghosted (greyed out, non-clickable) OR link to upsell URL if configured
  - [ ] Render custom links in correct order (merge with template features)
  - [ ] Middleware/route protection: block access to disabled feature routes (403 or redirect to upsell)

- [ ] API routes
  - [ ] `GET /api/super/clients/[id]/sidebar` - Get sidebar config for tenant
  - [ ] `PUT /api/super/clients/[id]/sidebar` - Update sidebar feature gating and custom links
  - [ ] `GET /api/admin/sidebar-config` - Get current tenant's sidebar config (for Sidebar component)

### Phase 18b: Tenant Team Members, Roles & Profile

**Status**: Planned - Client admin roles (Creator, editor, viewer, client_admin), optional custom roles, per-role feature set, and team member profile page. Team members are not required to be in CRM; profile is the source for Digicards.

**Purpose**: Admin users for a tenant are **team members**. Each has a role and a **team member profile** (name, email, role, avatar, bio, photo, social links). Profile serves (1) access/identity and (2) **Digicards** data source. Per-role feature set lets superadmin/client_admin select which CMS features each role can access (same idea as Phase 18 but per role).

- [ ] Roles: Creator, editor, viewer, client_admin
  - [ ] **Creator:** Content submissions only (create/edit content); no site-editing features (Settings, structure, user management). Add to `user_metadata.role` and `hasRole()` / middleware.
  - [ ] **editor, viewer, client_admin:** As today; scope may be limited by per-role feature set.
- [ ] Per-role feature set
  - [ ] Superadmin (and optionally client_admin) configures which sidebar features each role can access (Content, Galleries, Media, CRM, Settings, etc.). Same mechanism as Phase 18 but **per role** (e.g. Creator = [Content], editor = [Content, Media, Galleries]).
  - [ ] Schema: e.g. `role_features` (role_id or role slug, feature_id, enabled) or tenant config. Sidebar and route protection use role + feature set.
- [ ] Optional: Custom roles
  - [ ] Allow tenant to define custom roles (e.g. "Marketing", "Support") and assign a feature set to each. Users assigned a built-in or custom role.
- [x] View as Role + Site (superadmin testing)
  - [x] Superadmin dashboard: selector (Site + Role). Override effective features via cookie/session so sidebar and route guards reflect that tenant+role. Superadmin section stays visible; persistent red banner with "Exit View As". View-only (no mutations as viewed user).
- [ ] Team member profile page / management section
  - [ ] Each team member has a **profile** (name, email, role, avatar, and fields for **Digicards**: bio, photo, social_links, title, company, phone, digicard_slug). Stored in tenant schema (e.g. `team_members` or extend auth/user profile table).
  - [ ] Admin UI: Team list and team member profile page (e.g. `/admin/settings/team` or `/admin/team`, `/admin/team/[id]`). Edit profile; profile is **source for Digicards** (Phase 11b).
  - [ ] **Team ≠ CRM:** Team members may or may not be in the CRM/contact list. If in CRM, that is for marketing; access and Digicard data live on the team member profile.
- [ ] Digicards integration
  - [ ] Phase 11b (Digicards) uses **team member profile** as the data source (bio, photo, social links, etc.). Implement team profile first or align `team_members` schema with Digicards needs.

### Phase: Code Review, Security, Optimization & Modular Alignment

**Status**: Planned - Run after MVP roles/features/team (or as a pre-release gate). Aligns code to documented feature boundaries and applies security/optimization per module.

**Purpose**: Comprehensive code review and refactor for security, performance, and modular structure. Feature boundaries and version marking are documented in PRD and prd-technical; this phase executes the alignment and adds light per-module version marking where desired.

- [ ] **Documentation (design)**
  - [x] Modular design & feature boundaries in PRD (prd.md)
  - [x] Feature boundaries & modular code map in prd-technical (section 8)
  - [x] Version marking (per module) in prd-technical — light form (comment header or manifest)
  - [ ] Optional: Add coding rule or checklist so new code follows feature paths

- [ ] **Security review (per module)**
  - [ ] Auth and RLS: middleware, route protection, Supabase policies
  - [ ] Input validation and API exposure (admin vs public routes)
  - [ ] Per-feature pass: Content, CRM, Media, Galleries, Forms, Settings, Auth/MFA, Superadmin

- [ ] **Optimization pass (per module)**
  - [ ] Bundle size and lazy loading where appropriate
  - [ ] Query and caching (Supabase, React)
  - [ ] Per-feature pass using feature map in prd-technical

- [ ] **Modular alignment (refactor)**
  - [ ] Align existing code to feature boundaries (move/split files as needed)
  - [ ] Reduce cross-feature coupling; keep shared code in documented shared paths

- [ ] **Version marking (optional)**
  - [ ] Add light per-module version markers (e.g. comment header `@module X @version Y`) to key module entry files
  - [ ] Optional: manifest or script to compare module versions across template and forks

## Notes

- **IMPORTANT**: Items are NEVER deleted from this document - they remain and are simply checked off (`- [ ]` → `- [x]`) when completed
- This provides a complete history of what was planned and what was completed
- Check off items as they are completed (keep them in the document)
- Add summary entries to `changelog.md` for completed work, but keep detailed task history here
- Follow phase dependencies (don't start Phase 02 before Phase 01 is complete)
- Refer to `docs/prd.md` for detailed architecture and specifications
- Review and update regularly during development sessions
- **REORGANIZATION COMPLETE**: All PRD updates have been integrated into the appropriate phases with the new priority order (00-17)