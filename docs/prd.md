# Website CMS - Product Requirements Document

**For technical implementation details, see [prd-technical.md](./prd-technical.md).**

---

## Project Overview

A WordPress-style CMS application built with Next.js 15, designed as a lightweight alternative to WordPress focused on essential features for basic business websites. The application serves both as the public-facing website and the content management system in a single deployment. Each client instance is created from a single template repository (via GitHub forks) and deployed separately on Vercel, while sharing a single Supabase project using separate schemas for data isolation.

**Goal**: Create a WordPress killer replacement that narrows down to just the essentials for a basic business website - simpler, faster, and easier to use than WordPress while maintaining similar functionality.

## Technology Stack

- **Frontend/App Framework:** Next.js 15 with App Router
- **Language:** TypeScript 5
- **Development Environment:** Cursor IDE
- **Version Control:** GitHub
- **Backend/Database:** Supabase (PostgreSQL with multi-schema architecture)
- **Authentication:** Supabase Auth (native multi-client support)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Rich Text Editor:** Tiptap
- **Forms:** Developer-authored components mapping to CRM fields (CRM-first architecture)
- **Email Notifications:** Nodemailer (SMTP) for form submission notifications
- **Package Manager:** pnpm
- **Hosting:** Vercel

## Architecture

### Single Application Model

The application is a unified Next.js app that serves both:
- **Public Website**: Public-facing routes at the root (`/`, `/blog`, `/gallery`, etc.)
- **Admin CMS**: Protected admin routes at `/admin/*` (e.g., `/admin/dashboard`, `/admin/posts`)

This WordPress-style approach provides:
- Single deployment per client
- Shared codebase and components
- Simpler maintenance and updates
- Better performance through shared caching
- Easier for clients (one URL, one login)

### Route Structure

**Public Routes:**
- `/` - Homepage (CMS-managed page with slug "home" or "/")
- `/blog` - Blog listing page
- `/blog/[slug]` - Single blog post
- `/[slug]` - Static pages (About, Services, Contact, etc.) - CMS-managed from `pages` table
- `/gallery/[slug]` - Gallery page
- `/events` - Event calendar (day/week/month/agenda views)
- `/login` - Member login/registration
- `/register` - Member registration (or combined with /login)
- `/members` - Member dashboard (protected)
- `/members/profile` - Member profile page (protected)
- `/members/account` - Account settings (protected)
- `/cookie-policy` - Cookie policy page (public, admin-editable)
- Other public pages as needed

**Admin Routes (Protected):**
- `/admin` - Redirects to `/admin/dashboard` or `/admin/login`
- `/admin/login` - Admin login page
- `/admin/dashboard` - Dashboard home
- `/admin/content` - Content management (unified list of all content types; search, filter by type, add/edit modal)
- `/admin/posts` - Blog post management (legacy route, redirects to `/admin/content` with type filter "Post")
- `/admin/pages` - Static page management (legacy route, redirects to `/admin/content` with type filter "Page")
- `/admin/galleries` - Gallery management
- `/admin/media` - Media library
- **CRM** (sidebar parent; expandable)
  - `/admin/crm/contacts` - Contacts list (spreadsheet-like; search/filter by name, email, phone, categories, tags)
  - `/admin/crm/contacts/[id]` - Contact detail (sub-page; standard + custom fields, notes log, tags, MAGs, marketing lists)
  - `/admin/crm/forms` - Form registry (virtual form definitions; developer reference; not a visual form builder)
  - `/admin/crm/memberships` - Membership Access Groups (MAGs): create/edit MAGs (name, UID, description); protected content
    - `/admin/members` - Member user management (member accounts; MAG assignments)
    - `/admin/members/[id]` - View member details and MAG assignments
  - `/admin/crm/marketing` - Email marketing (lists/segments, campaign management; Resend or Vbout API)
- `/admin/events` - Event calendar management
- `/admin/settings` - Site settings (including theme selection, design system: fonts and color palette)
- `/admin/settings/taxonomy` - Taxonomy management (categories and tags for posts, pages, media, and CRM)
- `/admin/settings/cookies` - Cookie consent configuration and policy management
- `/admin/settings/archive` - Archive/restore project management
- `/admin/settings/reset` - Reset content to template state

**Superadmin Routes (Protected, Superadmin + 2FA Required):**
- `/admin/super` - Superadmin dashboard/utilities
- `/admin/super/integrations` - Third-party integrations management (Google Analytics, VisitorTracking.com, SimpleCommenter.com)
- `/admin/super/components` - Component library reference (searchable component catalog with screenshots/wireframes)
- `/admin/super/clients` - Client/tenant management
- `/admin/super/clients/new` - Create new client tenant
- `/admin/super/clients/[id]` - Client detail view
- `/admin/super/clients/[id]/admins` - Manage client admins
- `/admin/super/clients/[id]/admins/new` - Create new admin for client
- `/admin/super/admins` - Global admin list (view all admins across all sites)

**Standby / Coming Soon Route (Optional):**
- `/coming-soon` - Standby landing page used when the site is in "coming soon" mode (see Developer Workflow)

### Third-Party Integrations

Superadmin configures integrations at `/admin/super/integrations`. Scripts are injected on public routes only.

- **Google Analytics** — Website analytics (GA4). Config: Measurement ID.
- **VisitorTracking.com** — Visitor tracking and analytics. Config: Website ID.
- **SimpleCommenter.com** — **Development/client feedback tool only.** Not a blog comment system.
  - **Purpose:** During site development or staging, clients add pinpoint annotations and comments on the live site so developers can implement changes accurately.
  - **Usage:** Enable only on dev/staging. **Turn off in production.**
  - **Config:** Domain (e.g. project or staging domain). Script loads from SimpleCommenter.com when enabled.
  - **Do not use** for blog post comments, article discussions, or any public-facing comment feature. Blog comments (if needed) are a separate, future consideration.

### Multi-Schema Strategy

Each client deployment uses:
- A dedicated Supabase schema (e.g., `client_abc123`)
- A dedicated storage bucket (`client-{schema-name}`)
- Environment variable `NEXT_PUBLIC_CLIENT_SCHEMA` to identify the schema
- Direct Supabase access for CMS operations
- REST API endpoints for programmatic content access (optional)

**Data Isolation:**
- Each client schema contains all their CMS data (pages, posts, galleries, media, forms, settings)
- Users are associated with their tenant via `user_metadata.tenant_id`
- Application logic enforces schema boundaries - users can only access their designated schema
- Complete data isolation between clients
- Shared infrastructure (single Supabase project)
- Shared authentication system (Supabase Auth)

**Technical Details:** See [prd-technical.md - Database Architecture](./prd-technical.md#1-database-architecture--schema-management)

### Deployment Model

- Each client = separate Vercel deployment
- Each client deployment = separate GitHub repository forked from a single template repo
- Template repo naming: `yourorg/website-cms-template`
- Client repo naming: `yourorg/website-cms-{client}` (e.g., `yourorg/website-cms-acme`)
- Reusable improvements flow back to the template via Pull Requests (PRs) from client repos
- Shared Supabase project with schema isolation
- Single domain deployment: `clientdomain.com` (no subdomain needed)
- Admin access via `/admin` route (discreet login link in footer)

### Developer Workflow (Idea Intake, Migrations, and Standby Launch)

This project is optimized for a **developer-authored** workflow (Cursor + Git) rather than a client-side page builder.

**Ingesting UI Ideas (Inspiration Sites, Vercel v0, etc.):**
- Treat external sources as UI inspiration and **donor components**; do not try to auto-import entire apps into the template.
- Intake path:
  - Start in `src/components/site/experiments/` for rapid iteration.
  - Normalize to template standards (design tokens, accessibility, responsiveness).
  - Promote reusable sections into `src/components/public/**` and PR them back to `yourorg/website-cms-template`.

**Migrating Simple Existing Sites (Commonly Pages Router):**
- Use the template as the base and migrate UI into it (avoid merging two Next.js apps).
- Typical mapping:
  - `pages/_app.*` wrappers → `src/app/layout.tsx` or `src/app/(public)/layout.tsx`
  - `pages/*.tsx` routes → `src/app/(public)/*/page.tsx`
  - `components/*` → start in `src/components/site/experiments/` then promote as needed

**Assets (Images/Media) Intake:**
- Short-term: static assets may live in `public/` for speed during early build-out.
- Long-term: upload assets to the CMS Media Library (Supabase Storage) so non-developers can manage media without redeploys.

**Standby Launch ("Coming Soon" Mode):**
- Purpose: allow early Vercel deployment, domain setup, and environment configuration while keeping the public site hidden until ready.
- Default behavior: New client sites start in "coming_soon" mode automatically
- Control: Both tenant admin and superadmin can toggle site mode
- Superadmin lock: Superadmin can lock site mode to prevent tenant admin from changing it during intensive updates or maintenance
- In `coming_soon` mode:
  - Public routes redirect/render to `/coming-soon`
  - `/admin/*` remains accessible for building/configuration
  - `/api/*` remains accessible for CMS operations and testing
  - Add `noindex`/`nofollow` for SEO safety
- Site mode can be changed by tenant admin (if not locked) or superadmin (always available)

**CI/CD (Continuous Integration / Continuous Deployment):**
- Deploy early with `coming_soon` enabled.
- Iterate via standard Git pushes to the client repo; Vercel builds/deploys on each push.
- Flip site mode to `live` when ready to launch.

### Developer-Centric Component Architecture

The application uses a **developer-centric component library approach** rather than a visual page builder. This provides maximum flexibility and maintainability.

#### Component Library System

**Reusable Component Library:**
- Components are built as React/TypeScript components in the codebase
- Stored in `src/components/public/` (promotable, reusable library)
- Site-specific glue/composition lives in `src/components/site/` (kept intentionally small)
- Components are themeable via design tokens (Tailwind semantic classes backed by CSS variables)
- Library grows over time as reusable patterns are identified
- Components can be shared across all client projects

**Component Structure:**
```
src/components/
├── ui/                   # shadcn/ui primitives (Button, Card, Input...)
├── public/               # PROMOTABLE: reusable across future client sites
│   ├── themes/           # Theme-tagged component libraries
│   │   ├── modern/       # Theme: "modern" - Modern design aesthetic
│   │   ├── classic/       # Theme: "classic" - Classic/traditional design
│   │   ├── minimal/      # Theme: "minimal" - Minimalist design
│   │   └── [theme-name]/ # Additional themes can be added
│   ├── shared/           # Theme-agnostic components
│   │   ├── layout/       # Navigation/Header/Footer (generic, data-driven)
│   │   └── content/      # Renderers (RichTextRenderer, PostBody, etc.)
│   └── sections/         # Legacy/default sections (fallback if theme missing component)
└── site/                 # CLIENT glue (keep small)
    ├── pages/            # Page compositions (Home/About/Contact)
    ├── config/           # Per-site config (nav items, feature flags, site meta)
    ├── overrides/        # Rare client-specific wrappers/tweaks
    └── experiments/      # Incubator components before promotion to `public/`
```

**Design System Integration:**
- Components consume global font and color settings via CSS variables (design tokens)
- Design system values stored in database (settings table) and/or set per-deployment defaults
- Applied via CSS custom properties (CSS variables) so components inherit theme automatically
- Components automatically inherit themeable properties
- Example tokens: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`

**Component Styling Hierarchy:**
- **Component Defaults**: Components define their own structural styles (layout, spacing, borders, sizing, positioning)
- **Inherited Styles**: Components inherit colors and fonts from the client's design system settings (configured in `/admin/settings`)
- **Styling Priority**:
  1. Component structure/layout/borders (defined in component code)
  2. Design system colors and fonts (inherited via CSS variables from admin settings)
  3. Theme-specific overrides (if theme component exists)
- **Best Practice**: Components focus on structure and layout; colors and fonts come from the design system for consistency and easy customization

**Theme System (Tagged Components):**

The application supports a **theme-based component system** where components are tagged with a theme identifier. This allows clients to switch between different design aesthetics while maintaining the same component structure and functionality.

**Theme-Tagged Component Architecture:**
- Components are organized by theme in `src/components/public/themes/[theme-name]/`
- Each theme contains its own versions of sections and blocks (e.g., `HeroSection`, `ServicesSection`)
- Themes share the same component API/props for consistency
- Clients can switch themes via admin settings, instantly changing the visual design
- Fallback to shared/default components if a theme doesn't have a specific component

**Theme Selection:**
- Theme setting stored in database (settings table)
- Configurable per client via `/admin/settings` (client admin accessible)
- Theme change applies immediately across all pages
- Available themes: `modern`, `classic`, `minimal`, and custom themes as they're added

**Component Resolution:**
- Pages reference components by name (e.g., `<HeroSection />`)
- System resolves component based on current theme setting
- If theme-specific component exists, it's used; otherwise falls back to shared/default
- Theme context provided at layout level for efficient component loading

**Benefits:**
- Easy theme switching: Change one setting, entire site updates
- Component reuse: Same structure, different designs
- A/B testing: Test different themes easily
- Client customization: Offer theme options per client
- Maintainability: Update theme-specific components independently
- Scalability: Add new themes without affecting existing ones

**Themeability Requirements (Reusable Components):**
- Reusable components in `src/components/public/**` must use semantic design tokens (no hard-coded colors)
- Theme-specific components must maintain the same API/props as other theme versions
- Avoid `"use client"` in public components unless interactivity truly requires it
- Prefer prop-driven variants (e.g., `variant`, `tone`, `density`) over copy/paste "almost the same" components

**Naming Conventions (Prevent Near-Duplicates):**
- Use `NounVariant` names for sections and layouts (avoid `Hero2`, `NewTestimonials`)
- Examples: `HeroCentered`, `HeroSplit`, `TestimonialsGrid`, `FAQAccordion`, `FooterColumns`, `NavigationBar`

**Image Storage Strategy (CMS-First with Local Copy Workflow):**

The application uses a **CMS-first approach** where all images are initially stored in Supabase Storage (CDN), with an optional workflow for developers to selectively copy images to the local `public/` folder for optimization and version control.

**Initial Storage (All Images):**
- All uploaded images are stored in Supabase Storage (CDN) by default
- Images uploaded via CMS admin (galleries, blog images, media library) → Supabase Storage
- CDN provides global edge caching and dynamic optimization

**Local Copy Workflow (Developer-Controlled):**
- Developers can selectively copy critical images to `public/` folder
- Useful for: hero images, logos, critical above-the-fold assets
- Enables: Git versioning, build-time optimization, offline development
- Workflow: Developer identifies critical images → copies to `public/` → updates component references

**Best Practice:**
- Start with CMS storage for all images
- Copy only critical/hero images to `public/` as needed
- Keep `public/` folder minimal (only essential static assets)
- Use CMS media library for all user-uploaded content

---

## Content Types

All content types use the **site-wide taxonomy system** for categories and tags (see [Taxonomy System – Single Source of Truth](#single-source-of-truth--no-separate-taxonomy)). When adding new content types (e.g. properties, products), integrate with that system—do not build a separate tags/categories system.

### Unified Content Model (Single-Table Storage)

**Architecture:** Text-based content (posts, pages, snippets, quotes, articles, and custom types) is stored in a **single `content` table**. This keeps the system compact and scalable.

- **Shared core fields:** All such content shares common fields: title, slug, body (Tiptap rich text), excerpt, status, timestamps, and optional access-control fields. Type-specific data lives in **custom fields**.
- **Content type registry:** A `content_types` table defines each type (core and custom). Core types include **post**, **page**, **snippet**, **quote**, **article**. Custom types (e.g. portfolio, properties) are added via Settings → Content Types.
- **Custom fields:** A `content_type_fields` table defines fields **per content type**. Each field applies to exactly one type. Values are stored in `content.custom_fields` (JSONB). Example: a "Price" field for "Properties" is separate from a "Price" field for "Portfolio."
- **No per-type tables:** Do **not** create separate `posts`, `pages`, or type-specific tables for text-based content. Use the unified `content` table and `content_type_id` to distinguish types.

**Benefits:** One place to query and manage all content, consistent list/modal UI, and new types added via configuration rather than new migrations.

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference) (Content Model).

### Pages

**Static pages** are a **content type** in the unified model (slug `page`).

- CMS-managed static pages (About, Services, Contact, etc.)
- Homepage is a special page with slug "home" or "/"
- Rich text body with Tiptap editor
- SEO metadata (title, description, keywords)
- Access control: public, members-only, or MAG-restricted
- Section-level restrictions: Different sections of a page can have different access levels (e.g. `section_restrictions` in custom fields or dedicated column)
- Taxonomy: Categories and tags (section-scoped)

### Blog Posts

**Posts** are a **content type** in the unified model (slug `post`).

- Rich text body with Tiptap editor
- Featured image support
- Excerpt/description
- Publication date and status (placeholder/published/archived)
- Author assignment
- SEO metadata
- Access control: public, members-only, or MAG-restricted
- Taxonomy: Hierarchical categories and flat tags (section-scoped)

**Blog features:** Blog listing with pagination, category and tag archives, related posts, optional author pages.

### Other Core Types (Snippet, Quote, Article)

- **Snippet:** Short text (e.g. FAQs, micro-copy). Stored in `content` with minimal fields; no rich-text body if not needed.
- **Quote:** Testimonial or quote. Same unified storage; type-specific fields as defined in Content Type Fields.
- **Article:** Long-form editorial content. Same as post but distinct type for filtering and presentation.

### Custom Content Types

Custom types (e.g. **Portfolio**, **Properties**) use the same `content` table. Define the type in Settings → Content Types, add fields in Settings → Content Fields, and assign a taxonomy section. All managed via the unified Content list and add/edit modal.

### Galleries

**Gallery Management:**
- Multiple galleries per site
- Gallery items (images with captions)
- Gallery descriptions
- Access control: public, members-only, or MAG-restricted
- Visibility modes: hidden or show message for restricted content

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

### Media Library

**Media Management:**
- Upload images (JPG, PNG, BMP, TGA)
- Automatic image optimization and variant generation (thumbnail, small, medium, large)
- Variants stored as separate files in Supabase Storage
- Original file preserved
- WebP format for variants (web optimization)
- Metadata: name, slug, description, alt text
- Status: placeholder/published/archived
- Storage usage tracking

**Image Variants:**
- Original: Preserves original format
- Thumbnail: Small preview (150px max)
- Small: 400px max
- Medium: 800px max
- Large: 1200px max
- All variants converted to WebP for web optimization

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

### Events

**Event Calendar (dual purpose):**
- **Public events:** Publish events (e.g. webinars, workshops) for the site; visible with full details on the public calendar and in the ICS feed.
- **Scheduling and booking backend:** The same calendar supports scheduling and booking private meetings (e.g. client calls). Private meetings are visible in full only in the admin calendar; on the public side they appear only as blocked/unavailable time (no title or details).
- Event creation and management
- Date/time with timezone support
- Location information
- Recurrence patterns (daily, weekly, monthly, yearly)
- Event descriptions
- Access control: public, members-only, or MAG-restricted (for public events); private (meetings) visible only as availability blocks to the public
- Calendar views: day, week, month, agenda
- iCalendar (ICS) subscription feed

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

### Forms

**Form System:**
- Developer-authored form components (not auto-generated)
- Forms are **virtual** (named field sets); form registry is a developer reference—**not** a visual form builder
- Forms map to CRM fields; submissions create/update CRM contacts (match by email or phone)
- **Validation:** Field validation runs **before** any data is written to the CRM. Invalid submissions are rejected; no contact record is created or updated until validation passes.
- Consent management (GDPR compliance)
- Duplicate detection (email or phone)
- Email notifications via Nodemailer (SMTP)
- Form registry at `/admin/crm/forms` (developer helper)

**Form Features:**
- Custom field mapping to CRM (standard + tenant custom fields)
- Validation rules per field (required, format, max length, etc.) enforced at submission time
- Consent checkboxes
- File uploads (optional)
- Spam protection (future)
- Submission tracking

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

---

## CRM Module

### Overview

The CRM accepts contact data from public forms, stores standard and custom fields per tenant, supports taxonomy (categories/tags), memberships (MAGs) via a separate table system, a notes log, and email marketing lists. Admin uses the CRM as the primary interface for contacts, forms, memberships, and marketing. Sidebar navigation: **CRM** (parent) → **Contacts**, **Forms**, **Memberships** (including Member user management), **Marketing**.

### Form submissions → contacts

- Site visitors submit forms (developer-built components) that post to the form submission API.
- Submission creates a **new** contact or **updates** an existing one when **email or phone** matches.
- New or updated records are **marked for review** (e.g. red badge) until an admin clears the state.
- **Validation** runs before any data is written to the CRM: form payload is validated against field rules (required, format, custom rules); invalid submissions are rejected and no contact record is created or updated.
- Data that passes validation maps to CRM standard fields and tenant-specific custom fields as configured for the form.

### Virtual forms (form registry)

- Forms are **virtual objects**: a named collection of fields, grouped for reference—**not** a visual form builder.
- All forms are **built in code** and reference form fields by name when submitting.
- The form registry lists these form definitions (name, slug, field set, validation rules, settings) so developers can reference them and map submissions to CRM fields.
- Form registry supports optional auto-assign rules (tags, MAGs) on submit.
- **Field validation:** Each form definition includes validation rules (e.g. required, email format, max length). Validation is applied at submission time **before** data is added to the CRM record; failed validation returns errors to the client and does not create or update the contact.

### Contact record structure

- **Standard fields** (on the contact table): e.g. name, email, phone, company, address, status, DND, source, timestamps (exact list TBD).
- **Custom fields** (per tenant): stored in a related table; definitions in a custom-fields table (name, label, type, validation).
- **Contact detail view:** standard fields in an upper block; custom field values in a table below; notes log; taxonomy (categories/tags); MAG assignments; marketing lists.

### Notes (log)

- Notes are **relational** (e.g. contact_notes or crm_notes table), displayed as a **log** on the contact detail.
- Admins add entries for cultivation and work history.
- Some entries are **automated** (e.g. "Contact created", "Added to campaign X").

### Contacts list

- **Compact, spreadsheet-like** table: common fields (name, email, phone, etc.).
- **Search:** name, email, phone.
- **Filter:** categories and tags (taxonomy), status, DND, **memberships** (MAGs), marketing lists (when implemented).
- Clicking a row opens the **contact detail sub-page** (not a modal).

### Taxonomy integration

- CRM uses the **site taxonomy** with a dedicated **CRM section** (staple section; see Taxonomy System).
- Categories and tags from that section can be assigned to contacts and used for filtering in the list and detail.
- **Membership** is **not** represented as taxonomy tags—membership is managed via a separate table system (MAGs, contact–MAG junction) to avoid sync issues between tags and membership status. Contacts are searchable/filterable by membership via the membership tables.

### Memberships (MAGs)

- **Membership management page** (`/admin/crm/memberships`): create and edit MAG definitions (name, UID, description); configure protected content. This page is for **developing the actual membership** and **drilling backwards** to see which members belong to which memberships.
- **Assigning memberships to contacts:** done on the **CRM contact detail view** only. Admin adds/removes MAGs for that contact from the detail page.
- **Member user management** (`/admin/members`, `/admin/members/[id]`) is a sub-link under CRM → Memberships: manage member accounts (logged-in users) and their MAG assignments.
- **Search/filter contacts by membership:** the contacts list supports filtering by MAG (via the separate membership tables; no taxonomy tag sync).

### Email marketing

- Integration with a **light email marketing** provider (e.g. Resend, Vbout) via API.
- **CRM as interface:** lists/segments and campaign management (as far as the API supports) are operated from CRM → Marketing.
- **Lists/segments:** stored per contact (relational table or array TBD); **search contacts by list** is required.
- Reference: Vbout API https://developers.vbout.com/ ; Resend and others via provider docs.

### Sidebar navigation

- **CRM** (top-level, expandable).
  - **Contacts** – list and detail.
  - **Forms** – form registry.
  - **Memberships** – MAG management; Member user management (Members, Members/[id]) as sub-links.
  - **Marketing** – email lists and campaigns.

---

## Design System & Branding

### Design System Settings

**Global Settings (Per Client):**
- Primary and secondary fonts (Google Fonts integration)
- Color palette (15 colors: primary, secondary, accent, background, foreground, muted, etc.)
- Theme selection (modern, classic, minimal)
- Site name and description

**Settings Storage:**
- Stored in database (settings table)
- Accessed via RPC functions
- Applied via CSS variables (design tokens)
- Changes apply immediately across entire site

**Color Palette System:**
- Predefined palettes (global presets)
- Custom palettes (per-tenant)
- 15-color structure (color01 through color15)
- Palette library with preview
- Live preview in settings UI

**Font System:**
- Google Fonts integration
- Primary and secondary font selection
- Font loading optimization
- Live preview in settings UI

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

### Theme System

**Available Themes:**
- `modern` - Modern design aesthetic
- `classic` - Classic/traditional design
- `minimal` - Minimalist design
- Custom themes can be added

**Theme Switching:**
- Change theme via `/admin/settings`
- Instant visual update across all pages
- Components automatically use theme-specific versions
- Fallback to shared components if theme missing component

---

## Authentication

### User Types

**1) Superadmin (Platform Admin / Developer Team)**
- Scope: Cross-client (can access all client deployments / schemas)
- Purpose: Platform-wide settings, diagnostics, client lifecycle tooling, and emergency access
- Access: `/admin/super/*` routes
- 2FA: Always required (aal2)

**2) Client Admin (Site Admin)**
- Scope: Single-client (their specific client schema only)
- Purpose: Day-to-day site administration: media, posts, galleries, forms/CRM, events, MAGs, site settings
- Access: `/admin/*` routes
- 2FA: Required for sensitive operations (settings, members, archive)

**3) GPU (General Public User)**
- Scope: Public website only
- Purpose: Browse public pages and content
- Access: Public routes only (no auth required)

**4) GPUM (General Public User - Member)**
- Scope: Public site + protected member content (based on MAGs)
- Purpose: Access protected pages/content and member dashboard
- Access: `/login`, `/register`, `/members/*`, plus gated content routes
- 2FA: Optional (can enable in account settings)

**Core Distinction:**
- **Admin roles** control **what CMS features** an authenticated admin can access
- **MAGs (Membership Access Groups)** control **what protected content** a GPUM can access on the public site

### Multi-Client Authentication Strategy

Since all clients share a single Supabase project but use separate schemas, authentication works as follows:

1. **User Metadata**: Each user in Supabase Auth has metadata containing:
   - `tenant_id`: The client schema they belong to (e.g., `client_abc123`)
   - `type`: `superadmin | admin | member`
   - `role`: Role for admin authorization within the CMS (superadmin, client_admin, editor, viewer, etc.)
   - `allowed_schemas`: Optional array for cross-client access (used by superadmins)

2. **Schema Association**: When a user logs in, their `tenant_id` from metadata is matched with the `NEXT_PUBLIC_CLIENT_SCHEMA` environment variable to ensure they can only access their designated schema.

3. **Access Control**: 
   - Middleware validates user session and checks client association
   - Database queries are automatically scoped to the correct schema
   - Users cannot access data from other client schemas

**Superadmin Bypass Rules:**
- If `user_metadata.type = "superadmin"` and `role = "superadmin"`, middleware can permit access regardless of `NEXT_PUBLIC_CLIENT_SCHEMA`
- Superadmins may optionally carry `allowed_schemas: ["*"]` or a concrete schema allowlist

### Two-Factor Authentication (2FA/MFA)

**MFA Methods:**
- **TOTP (Primary)**: Time-based one-time password via authenticator apps (Google Authenticator, Authy, etc.)
- **SMS/Phone (Planned)**: SMS verification via external provider

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

**Dev Mode Bypass:**
- Set `NEXT_PUBLIC_DEV_BYPASS_2FA=true` in `.env.local`
- Authentication still required, only 2FA bypassed
- Only works in development mode

**Technical Details:** See [prd-technical.md - Authentication & Security](./prd-technical.md#6-authentication--security)

---

## MAG (Membership Access Groups) System

### Overview

MAG (Membership Access Groups) system provides granular access control for protected content. Members are assigned to MAGs, and content can be restricted to specific MAGs.

### Dual Authentication System

The application supports two distinct user types:

1. **Admin Users** - Access CMS at `/admin/*`
   - Superadmin: Cross-tenant access
   - Client Admin: Single-tenant access
   - Authenticate at `/admin/login`

2. **Member Users** - Access protected content on public site
   - Stored in Supabase Auth with `user_metadata.type = "member"`
   - Have `user_metadata.tenant_id` (for multi-client isolation)
   - Authenticate at `/login` or `/register`
   - Profile stored in `members` table in client schema
   - Can belong to multiple MAGs

### MAG vs Roles

**Roles** (Admin Users):
- Define what CMS features a user can access
- Set in `user_metadata.role` (superadmin, client_admin, editor, viewer, etc.)
- Examples: "Can this admin user delete posts?", "Can they edit settings?"

**MAG (Membership Access Groups)** (Member Users):
- Define what protected content members can access
- Stored in `mags` table in client schema
- Members assigned via `user_mags` junction table
- Examples: "Can this member view premium blog posts?", "Can they access VIP gallery?"

### Content Protection

**Access Levels:**
- `public` - Visible to everyone
- `members` - Requires member login (any member)
- `mag` - Requires specific MAG assignment

**Visibility Modes:**
- `hidden` - Content not visible to unauthorized users
- `message` - Show restricted message to unauthorized users

**Content Types with Access Control:**
- **Content** (posts, pages, etc.): access_level, required_mag_id, visibility_mode, restricted_message; pages may use section_restrictions (JSONB) for section-level control
- Galleries: access_level, required_mag_id, visibility_mode, restricted_message
- Events: access_level, required_mag_id

**Section-Level Restrictions (Pages):**
- Different sections of a page can have different access levels
- Stored in `section_restrictions` JSONB field
- Allows granular control within a single page

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

### Ecommerce Integration

**Simple Tag-Based Matching:**
- MAGs have `ecommerce_tag` field (e.g., "premium-membership")
- `auto_assign_on_payment` flag enables automatic assignment
- Payment webhooks match tag and auto-assign MAG
- No payment processing in CMS - handled by external ecommerce platform

**Supported Platforms:**
- Stripe
- Shopify
- WooCommerce
- Other platforms via generic webhook handler

**Technical Details:** See [prd-technical.md - API Endpoints Reference](./prd-technical.md#5-api-endpoints-reference)

---

## Taxonomy System

### Overview

Taxonomy system manages categories and tags for organizing content and CRM records. Categories are hierarchical, tags are flat. Both can be section-scoped for filtering. The template includes **staple sections** (CRM, PAGE, BLOG, ARTICLE, SNIPPET, and media) that cannot be deleted; see Section-Scoped Filtering below.

### Single Source of Truth – No Separate Taxonomy

**Critical rule for developers and AI agents:** The taxonomy system is the **only** source for categories and tags used to organize content. All content types—existing (posts, pages, media, galleries) and future (e.g. properties, products, custom entities)—**must** use this site-wide system for categories, tags, and filtering.

**Do not:**
- Build a separate or parallel tags/categories system for any module (e.g. "Media Library tags", "Post categories" in isolation)
- Add content-type-specific category or tag tables
- Implement module-specific pickers that maintain their own term lists

**Do:**
- Use **sections** (Settings → Taxonomy → Sections) to scope terms per content type (e.g. "blog", "image", "video", "property")
- Store relationships via `taxonomy_relationships` (`content_type`, `content_id`, `term_id`)
- Reuse existing taxonomy helpers (`src/lib/supabase/taxonomy.ts`) and UI components (e.g. `TaxonomyAssignment`, `TaxonomyMultiSelect`) for assignment and filtering

When adding a new content type, define a section for it in the taxonomy system and wire assignment and filtering through the shared taxonomy—**do not create a side taxonomy**.

### Categories

**Hierarchical Structure:**
- Parent-child relationships (self-referencing)
- Unlimited depth
- Section-scoped: Optional `section_id` for filtering by section
- Fields: name, slug, description, parent_id, section_id, display_order

**Usage:**
- Posts: Multi-select hierarchical categories
- Pages: Multi-select hierarchical categories
- Media: Multi-select hierarchical categories (optional)

### Tags

**Flat Structure:**
- No hierarchy
- Section-scoped: Optional `section_id` for filtering by section
- Fields: name, slug, description, section_id

**Usage:**
- Posts: Autocomplete tag input with create-on-the-fly
- Pages: Autocomplete tag input with create-on-the-fly
- Media: Autocomplete tag input with create-on-the-fly (optional)

### Section-Scoped Filtering

**Section Taxonomy Config:**
- Links sections to taxonomy usage
- Configures which sections use categories/tags
- Allows filtering taxonomy items by section

**Staple Sections (Template Defaults; Not Deletable):**
- **CRM**, **PAGE**, **BLOG**, **ARTICLE**, **SNIPPET** — inherent to web application operation; part of the template and cannot be removed.
- **Media** (or equivalent) for media library taxonomy.
- These staple sections are always present; admins can add additional sections per client as needed.

**Technical Details:** See [prd-technical.md - Database Schema Reference](./prd-technical.md#2-database-schema-reference)

---

## API Endpoints

REST API endpoints (optional, for programmatic content access and automation):

### Public Content API
- `GET /api/pages` - List published pages (pagination, search)
- `GET /api/pages/[id]` - Get single page by ID or slug
- `GET /api/posts` - List published posts (pagination, search)
- `GET /api/posts/[id]` - Get single post by ID or slug
- `GET /api/galleries` - List all galleries
- `GET /api/galleries/[id]` - Get gallery with items by ID or slug
- `GET /api/media/[id]` - Get media item details
- `GET /api/events` - List events (supports date range filtering)
- `GET /api/events/[id]` - Get event by ID (or slug)
- `GET /api/events/ics` - iCalendar (ICS) subscription feed
- `POST /api/forms/[formId]/submit` - Submit form data
- `POST /api/cookies/consent` - Submit cookie consent preferences
- `GET /api/cookies/consent` - Get current cookie consent preferences
- `PUT /api/cookies/consent` - Update cookie consent preferences
- `GET /api/cookies/policy` - Get cookie policy content (public)

### Authenticated Admin API
- `POST /api/events` - Create event
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### MAG & Ecommerce Integration API
- `GET /api/mags` - List all MAGs
- `GET /api/mags/[id]` - Get MAG details
- `POST /api/mags/[id]/assign` - Assign MAG to user (API key required)
- `POST /api/mags/[id]/remove` - Remove MAG from user (API key required)
- `GET /api/members/[email]` - Get member details and MAG assignments (API key required)
- `POST /api/members/verify` - Verify member has specific MAG (API key required)
- `POST /api/webhooks/payment` - Receive payment notifications from ecommerce platforms
- `POST /api/webhooks/payment/[provider]` - Provider-specific webhook endpoints

### CRM API
- `GET /api/crm/contacts` - List contacts (filtering by status, tags, MAGs, DND)
- `GET /api/crm/contacts/[id]` - Get contact details
- `PUT /api/crm/contacts/[id]` - Update contact
- `POST /api/crm/contacts/[id]/push` - Manually push contact to external CRM
- `POST /api/crm/contacts/[id]/unsubscribe` - Unsubscribe (sets DND)
- `DELETE /api/crm/contacts/[id]` - Delete contact
- `POST /api/crm/contacts/[id]/tags` - Add/remove tags
- `POST /api/crm/contacts/[id]/mags` - Assign/remove MAGs
- `GET /api/crm/contacts/[id]/consents` - Get consent history
- `POST /api/crm/contacts/[id]/consents` - Record consent
- `POST /api/crm/contacts/[id]/consents/withdraw` - Withdraw consent

**Technical Details:** See [prd-technical.md - API Endpoints Reference](./prd-technical.md#5-api-endpoints-reference)

---

## Developer Workflow & Content Placeholders

### Overview

When launching a new site from the template, developers and clients work collaboratively to build the site:

1. **Dev Creates Layout**: Developer designs page layouts and components using placeholder content
2. **Placeholder Objects**: Dev creates "placeholder" status items in Media Library and Content (Posts/Pages) as placeholders
3. **Component Integration**: Dev uses placeholder items to build and style components
4. **Client Completes**: Client completes placeholder items with real content and images
5. **Tracking Checklist**: Admin dashboard shows completion checklist of all placeholder items

### Content Placeholders

**Placeholder Status**: All content types (media, and content items in the unified content table—posts, pages, etc.) support a `status: 'placeholder'` to mark items needing completion before launch.

**Placeholder Features:**
- Placeholder status indicates incomplete/required content that MUST be completed
- Not published/visible on public site
- Can be used in components for design/layout purposes (with placeholder data)
- Tracked in admin completion checklist
- Both dev and client can edit/complete placeholders
- Cannot launch site while placeholders remain (must be replaced with published content)

### Setup Checklist

**Location**: `/admin/dashboard` → "Setup Checklist" widget

**Features:**
- Displays all placeholder items needing completion
- Grouped by content type (Media, and content types from the unified model: Posts, Pages, etc.)
- Quick-link to each item for editing
- Completion progress tracking
- Marks items complete when status changes from placeholder to published

### Standby Page

While site is being built, `/` shows a standby/coming-soon page (switchable in site settings) until explicitly published.

---

## Project Lifecycle Management

### Archive & Restore

**Use Case**: When a client leaves but may return, archive their project for easy restoration.

**Features:**
- Archive project: Rename schema and storage bucket, create registry entry
- List archived projects: View all archived projects with metadata
- Restore project: Restore archived schema and bucket, reactivate project
- Archive metadata: Track client name, archive date, notes for restoration
- Backup option: Optional export for long-term storage/compliance

**Access**: `/admin/settings/archive` (admin-only)

### Reset to Template

**Use Case**: Reset a deployed instance to clean state for reuse as a new client template.

**Features:**
- Reset all content: Clear content (unified table), galleries, forms, submissions
- Reset design system: Restore fonts and colors to defaults
- Reset media: Option to clear or keep media library
- Full factory reset: Complete reset including settings
- Safety confirmations: Multiple confirmations required

**Access**: `/admin/settings/reset` (admin-only, requires explicit confirmation)

### New Client Setup

**Workflow:**
1. Fork the template repository to create the client repository
2. Run setup script: `pnpm setup-client <schema-name>`
3. Script creates schema, runs migrations, creates storage bucket
4. Set environment variables in Vercel
5. Deploy to Vercel
6. Configure design system in admin

**CLI Tools:**
- `pnpm setup-client <schema-name>` - Automated client setup
- `pnpm run reset` - Reset content to template state
- `pnpm run archive` - Archive current project

**Technical Details:** See [prd-technical.md - Client Setup Process](./prd-technical.md#3-client-setup-process)

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- Supabase account and project
- Supabase Auth enabled in your Supabase project

### Installation

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables (see `.env.example`)
4. Set up the database schema (see Client Setup Process)
5. Run the development server: `pnpm run dev`

**Technical Details:** See [prd-technical.md - Client Setup Process](./prd-technical.md#3-client-setup-process)

### Deployment

**Vercel Deployment:**
- Each client should be deployed as a separate Vercel project
- Fork the template repository for each client
- Set environment variables in Vercel dashboard
- Deploy to Vercel
- Configure domain: `clientdomain.com` (single domain, no subdomain needed)

**Database Setup per Client:**
- Create schema in Supabase
- Run migrations
- Create storage bucket
- Create auth users with proper metadata

**Technical Details:** See [prd-technical.md - Client Setup Process](./prd-technical.md#3-client-setup-process)

---

## Project Structure

```
website-cms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/          # Public website routes
│   │   ├── admin/             # Admin CMS routes (protected)
│   │   └── api/               # REST API endpoints
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── dashboard/         # Admin components
│   │   ├── editor/            # Rich text editor
│   │   ├── media/             # Media components
│   │   ├── forms/             # Form components
│   │   ├── crm/               # CRM management components
│   │   ├── memberships/       # Membership components
│   │   └── public/            # Public site components (reusable library)
│   ├── lib/
│   │   ├── supabase/          # Supabase client & schema utilities
│   │   ├── auth/              # Auth API integration
│   │   ├── api/               # API utilities
│   │   └── utils/             # Utility functions
│   ├── types/                 # TypeScript types
│   └── hooks/                 # React hooks
├── scripts/                   # Utility scripts
├── supabase/
│   └── migrations/            # Database migrations
└── docs/                      # Project documentation
```

---

## Development

### Type Checking
```bash
pnpm run type-check
```

### Linting
```bash
pnpm run lint
```

### Building
```bash
pnpm run build
```

---

## Key Differentiators from WordPress

1. **Simpler Interface**: Clean, modern admin UI designed for non-technical users
2. **Faster Performance**: Built on Next.js 15 with modern React patterns
3. **Essential Features Only**: Focused on core content management needs
4. **Modern Tech Stack**: TypeScript, Tailwind CSS, shadcn/ui components
5. **Better Developer Experience**: Type-safe, component-based architecture
6. **Single App Model**: No separate admin subdomain needed
7. **API-First**: Built-in REST API for programmatic access
8. **Multi-Schema Architecture**: Easy to fork and deploy per client
9. **Theme System**: Theme-tagged component library allows easy theme switching
10. **Custom Design Per Project**: Each site is custom-designed with theme selection and global font/color palette controls
11. **Unified Design System**: Admin and public site share the same fonts and colors
12. **Developer-Centric Components**: Reusable component library approach with theme support
13. **CI/CD Ready**: Designed for automated deployments and scalable maintenance
14. **Archive/Restore System**: Built-in project lifecycle management
15. **MAG Platform**: Built-in protected content system with granular access control

---

## Future Enhancements

For planned features and future enhancements, see [prd-planned.md](./prd-planned.md).

This includes:
- AI Chatbot with RAG (Retrieval-Augmented Generation)
- Digital Business Card Feature
- Customizable Banner Component
- SEO tools, analytics integration, content scheduling
- Multi-language support
- Membership system enhancements
- Developer Workflow with Content Placeholders (onboarding checklist)
- And other planned features

---

**Note:** Technical implementation details, database schemas, API specifications, and development patterns have been moved to [prd-technical.md](./prd-technical.md) to keep this document focused on product requirements and business logic.
