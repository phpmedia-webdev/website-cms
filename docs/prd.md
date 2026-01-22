# Website CMS - Product Requirements Document

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
- `/` - Homepage
- `/blog` - Blog listing page
- `/blog/[slug]` - Single blog post
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
- `/admin/posts` - Blog post management
- `/admin/galleries` - Gallery management
- `/admin/media` - Media library
- `/admin/forms` - Form registry (developer helper) and CRM management
- `/admin/crm` - CRM contacts and companies management
- `/admin/events` - Event calendar management
- `/admin/memberships` - Membership group management
- `/admin/members` - Member user management
- `/admin/members/[id]` - View member details and memberships
- `/admin/settings` - Site settings (including theme selection, design system: fonts and color palette)
- `/admin/settings/cookies` - Cookie consent configuration and policy management
- `/admin/settings/archive` - Archive/restore project management
- `/admin/settings/reset` - Reset content to template state

**Superadmin Routes (Protected, Superadmin + 2FA Required):**
- `/admin/super` - Superadmin dashboard/utilities
- `/admin/super/integrations` - Third-party integrations management (Google Analytics, VisitorTracking.com, SimpleCommenter.com)
- `/admin/super/components` - Component library reference (searchable component catalog with screenshots/wireframes)

**Standby / Coming Soon Route (Optional):**
- `/coming-soon` - Standby landing page used when the site is in "coming soon" mode (see Developer Workflow)

### Multi-Schema Strategy

Each client deployment uses:
- A dedicated Supabase schema (e.g., `client_abc123`)
- A dedicated storage bucket (`client-{schema-name}`)
- Environment variable `NEXT_PUBLIC_CLIENT_SCHEMA` to identify the schema
- Direct Supabase access for CMS operations
- REST API endpoints for programmatic content access (optional)

**Single Supabase Project Architecture:**
```
Supabase Project
├── auth.users (Supabase Auth - shared across all clients)
│   ├── Admin users: { tenant_id: "client_abc123", role: "admin", type: "admin" }
│   └── Member users: { tenant_id: "client_abc123", type: "member" }
├── public schema
│   └── archived_projects (registry for archived clients)
├── client_abc123 schema (Client 1 data)
│   ├── posts, galleries, media, forms, settings
│   ├── membership_groups, members, user_memberships
│   └── All client-specific tables
├── client_xyz789 schema (Client 2 data)
│   └── Isolated data for Client 2
└── client_... (Additional client schemas)
```

**Data Isolation:**
- Each client schema contains all their CMS data (posts, galleries, media, forms, settings)
- Users are associated with their tenant via `user_metadata.tenant_id`
- Application logic enforces schema boundaries - users can only access their designated schema
- Supabase client is configured per-request to use the correct schema based on environment variable
- No cross-schema data access possible

This provides:
- Complete data isolation between clients
- Shared infrastructure (single Supabase project)
- Shared authentication system (Supabase Auth)
- Easy schema management via migrations
- Cost-effective (single Supabase project for all clients)

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

**Standby Launch (“Coming Soon” Mode):**
- Purpose: allow early Vercel deployment, domain setup, and environment configuration while keeping the public site hidden until ready.
- Recommended approach: a single environment variable gate, for example:
  - `NEXT_PUBLIC_SITE_MODE=coming_soon|live`
- In `coming_soon` mode:
  - Public routes redirect/render to `/coming-soon`
  - `/admin/*` remains accessible for building/configuration
  - `/api/*` remains accessible for CMS operations and testing
  - Add `noindex`/`nofollow` and consider a temporary/maintenance response posture (e.g., 503) for SEO safety

**CI/CD (Continuous Integration / Continuous Deployment):**
- Deploy early with `coming_soon` enabled.
- Iterate via standard Git pushes to the client repo; Vercel builds/deploys on each push.
- Flip `NEXT_PUBLIC_SITE_MODE` to `live` when ready to launch.

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
│   │   │   ├── sections/  # Theme-specific sections (HeroSection, ServicesSection, etc.)
│   │   │   └── blocks/   # Theme-specific blocks
│   │   ├── classic/       # Theme: "classic" - Classic/traditional design
│   │   │   ├── sections/
│   │   │   └── blocks/
│   │   ├── minimal/      # Theme: "minimal" - Minimalist design
│   │   │   ├── sections/
│   │   │   └── blocks/
│   │   └── [theme-name]/ # Additional themes can be added
│   ├── shared/           # Theme-agnostic components (used by all themes)
│   │   ├── layout/       # Navigation/Header/Footer (generic, data-driven)
│   │   └── content/      # Renderers (RichTextRenderer, PostBody, etc.)
│   ├── sections/         # Legacy/default sections (fallback if theme missing component)
│   ├── blocks/           # Legacy/default blocks
│   ├── media/            # Public display components (GalleryGrid, MediaFigure, etc.)
│   └── index.ts          # Optional barrel exports (keep simple)
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
- **Example**: A `HeroSection` component defines its grid layout, padding, and border styles, but uses `text-foreground`, `bg-primary`, and font-family from the design system

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
- Reusable components in `src/components/public/**` must use semantic design tokens (no hard-coded colors like `bg-blue-600`)
- Theme-specific components must maintain the same API/props as other theme versions
- Avoid `"use client"` in public components unless interactivity truly requires it (keeps public site lightweight)
- Prefer prop-driven variants (e.g., `variant`, `tone`, `density`) over copy/paste "almost the same" components

**Naming Conventions (Prevent Near-Duplicates):**
- Use `NounVariant` names for sections and layouts (avoid `Hero2`, `NewTestimonials`)
  - Examples: `HeroCentered`, `HeroSplit`, `TestimonialsGrid`, `FAQAccordion`, `FooterColumns`, `NavigationBar`

**Image Storage Strategy (Local vs CDN):**

The application uses a **hybrid approach** for image storage, with clear guidelines for when to use local files vs CDN (Supabase Storage):

**Use Local Images (`public/` folder) for:**
- **Static brand assets**: Logo, favicon, default placeholders (< 50KB)
- **UI elements**: Icons, small graphics that never change
- **Critical path assets**: Above-the-fold assets that must load immediately
- **Small files**: Assets under 50KB that are rarely updated

**Use CDN (Supabase Storage) for:**
- **User-uploaded content**: All images uploaded via CMS admin (galleries, blog images, media library)
- **Dynamic content**: Images that change frequently without redeploys
- **Large files**: Images over 100KB that benefit from CDN caching
- **Member-uploaded content**: User avatars, member-submitted images

**Developer Decision Framework:**
- **Source**: User-uploaded (via CMS) → Always CDN
- **Source**: Static asset (in codebase) → Usually local (unless large/frequently changing)
- **Size**: Small (< 50KB), rarely changes → Local
- **Size**: Large (> 100KB) or changes often → CDN
- **Critical path**: Above-the-fold, critical → Consider local for reliability
- **Critical path**: Below-the-fold, optional → CDN is fine

**Implementation Pattern:**
- Helper utility `getImageUrl(path, size)` automatically determines source:
  - Paths starting with `media/`, `galleries/`, etc. → CDN with optimization
  - Other paths → Local assets from `public/` folder
- Components use helper utility for consistent image handling
- CMS admin automatically stores all uploads in Supabase Storage (CDN)
- Developer makes architectural decisions when building components

**Benefits:**
- Local assets: Versioned with code, no external dependency, faster initial load
- CDN assets: Edge caching globally, dynamic optimization, scalable storage
- Hybrid approach balances performance, cost, and maintainability

**Template → Client → Template Promotion Workflow (Forks + PRs):**
1. Start a new client site by forking `yourorg/website-cms-template` → `yourorg/website-cms-{client}`
2. Build new sections quickly under `src/components/site/experiments/` while iterating
3. When a component is reusable, promote it by moving/refactoring into `src/components/public/**`
   - Ensure it is data/prop driven (no client names/copy/assets hard-coded)
   - Ensure it uses design tokens (semantic Tailwind classes backed by CSS variables)
4. Create a focused branch (recommended: `promote/<component-or-section>`) and open a PR from the client repo back to the template repo
5. Merge into the template so future client forks start with the improved library

**Promotion Checklist (Before Opening a PR Back to the Template):**
- Component lives under `src/components/public/**` (not `src/components/site/**`)
- No client-specific branding: no client name/copy, logos, or assets baked into the component
- Uses semantic theme tokens (e.g., `bg-background`, `text-foreground`, `bg-primary`) rather than hard-coded colors
- Public components are server-first: avoid `"use client"` unless interactivity truly requires it
- Prop/data driven API (accepts data via props rather than importing client-specific config directly)
- Responsive + accessible by default (semantic HTML, keyboard/focus behavior when applicable)
- Change set is focused: PR includes only the reusable component + minimal supporting types/helpers

**Page Composition Model:**
- Pages are React components that compose sections
- Content comes from database (CMS managed)
- Layout structure is in code (developer control)
- Mix of standard pages (Home, About, Contact) and custom pages
- Developer can add project-specific custom components as needed

**Benefits:**
- Type-safe with TypeScript
- Version controlled in Git
- Hot reload during development
- Easy to test and iterate
- Reusable across projects
- Maintainable via CI/CD

### Component Library Reference System

A searchable component library reference in the superadmin area that auto-discovers components from the codebase and extracts metadata from header comments. This system helps developers find, understand, and reuse components across client projects, greatly aiding in deploying future client sites.

**Purpose:**
- **Library-First Development**: Component library is the starting point for component development - search first, create spec if needed, then build
- Enable quick component discovery and understanding
- Provide visual reference (screenshots/wireframes) for components
- Document component props, usage, and dependencies
- Support developer productivity and code reusability
- Maintain up-to-date component documentation automatically
- Track component development lifecycle (planned → in progress → complete)

**Component Metadata Format (JSDoc-style):**

Components use header comments for metadata extraction:

```typescript
  /**
   * @library_id abc123-def456-ghi789
   * @component HeroCentered
   * @category sections
   * @theme modern
   * @description A centered hero section with title, subtitle, and optional CTA button. 
   * Perfect for landing pages and homepage headers.
   * 
   * @props
   * - title: string (required) - Main headline text
   * - subtitle?: string - Supporting text below title
   * - ctaText?: string - Call-to-action button text
   * - ctaLink?: string - CTA button destination URL
   * - backgroundImage?: string - Optional background image URL
   * - variant?: 'default' | 'minimal' | 'gradient' - Visual style variant
   * 
   * @usage
   * ```tsx
   * <HeroCentered
   *   title="Welcome to Our Site"
   *   subtitle="Building amazing experiences"
   *   ctaText="Get Started"
   *   ctaLink="/signup"
   * />
   * ```
   * 
   * @example
   * Used on: Homepage, Landing pages
   * Design tokens: Uses bg-primary, text-foreground, spacing tokens
   * 
   * @dependencies
   * - Button component (from ui/)
   * - Image component (from media/)
   * 
   * @author Developer Name
   * @created 2026-01-20
   * @updated 2026-01-25
   */
```

**Database Schema:**

```sql
CREATE TABLE component_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Component identification
  name TEXT NOT NULL, -- Component name (e.g., "HeroCentered")
  library_entry_id UUID UNIQUE, -- Unique ID for this library entry (used in component code @library_id)
  file_path TEXT, -- Relative path from src/components/ (null if not yet created)
  full_path TEXT, -- Full file system path (null if not yet created)
  import_path TEXT, -- How to import (e.g., "@/components/public/sections/HeroCentered")
  
  -- Categorization
  category TEXT NOT NULL, -- 'sections', 'blocks', 'layout', 'media', 'ui', 'content'
  theme TEXT, -- 'modern', 'classic', 'minimal', null for shared
  location TEXT NOT NULL, -- 'public', 'site', 'ui'
  subdirectory TEXT, -- 'sections', 'blocks', 'layout', etc.
  
  -- Metadata
  description TEXT, -- Component description
  props_schema JSONB, -- Extracted props with types, required, descriptions
  usage_examples JSONB, -- Code examples array
  dependencies TEXT[], -- Array of component dependencies
  design_tokens TEXT[], -- Design tokens used (e.g., ['bg-primary', 'text-foreground'])
  
  -- Documentation
  usage_notes TEXT, -- Additional usage guidance
  example_use_cases TEXT[], -- Where component is used (e.g., ['Homepage', 'Landing pages'])
  
  -- Visual Reference
  screenshot_url TEXT, -- URL to screenshot (stored in Supabase Storage)
  screenshot_media_id UUID REFERENCES media(id) ON DELETE SET NULL, -- Link to media library
  wireframe_url TEXT, -- URL to wireframe/mockup (stored in Supabase Storage)
  wireframe_media_id UUID REFERENCES media(id) ON DELETE SET NULL, -- Link to media library
  preview_images JSONB, -- Array of additional preview images: [{url, type: 'screenshot'|'wireframe'|'example', caption}]
  requirements_screenshot_url TEXT, -- Screenshot/wireframe uploaded before development (spec)
  requirements_text TEXT, -- Developer prompt/requirements (spec)
  
  -- Development Workflow
  development_status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'complete', 'deprecated'
  is_linked_to_file BOOLEAN DEFAULT false, -- True when component file exists
  assigned_to TEXT, -- Developer name/ID (optional)
  priority TEXT, -- 'high', 'medium', 'low'
  estimated_complexity TEXT, -- 'simple', 'medium', 'complex'
  
  -- Development Timeline
  planned_at TIMESTAMPTZ, -- When component was planned/requested
  started_at TIMESTAMPTZ, -- When development started
  completed_at TIMESTAMPTZ, -- When component was completed
  
  -- Metadata
  author TEXT,
  created_at DATE,
  updated_at DATE,
  last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN DEFAULT true, -- Component still exists in codebase
  is_promotable BOOLEAN DEFAULT false, -- In public/ directory (promotable)
  is_client_specific BOOLEAN DEFAULT false, -- In site/ directory (client-specific)
  
  -- Search optimization
  search_text TSVECTOR, -- Full-text search index (description + props + usage)
  
  UNIQUE(file_path) WHERE file_path IS NOT NULL,
  INDEX idx_category (category),
  INDEX idx_theme (theme),
  INDEX idx_location (location),
  INDEX idx_status (development_status),
  INDEX idx_search (search_text)
);
```

**Image Storage Strategy:**

- Images stored in Supabase Storage bucket: `component-library/`
- Path structure: `component-library/{component-name}/screenshot.{ext}`
- Alternative: Link to existing media library entries (if uploaded via CMS)
- Supported image types:
  - **Screenshot**: Live component render (captured from running app or external tool)
  - **Wireframe**: Design mockup/wireframe (uploaded from design tools)
  - **Example**: Multiple usage examples (different props/variants)
- Formats: PNG, JPG/JPEG, SVG, WebP (with automatic optimization)

**Auto-Discovery System:**

**Component Scanner:**
- Scans `src/components/` directory recursively
- Identifies React/TypeScript component files (`.tsx`, `.ts`)
- Extracts metadata from header comments using regex/parser
- Parses JSDoc-style comments for structured data
- Detects component location (public/ vs site/)
- Identifies theme (from directory path: `themes/[theme-name]/`)
- Extracts props from TypeScript interfaces/types
- Updates database on scan

**Scan Triggers:**
- Manual scan button in admin UI
- Automatic scan on deployment (CI/CD hook)
- Scheduled scan (daily/weekly)
- On component file change (file watcher in dev mode)

**Superadmin UI (`/admin/super/components`):**

**Component Library Interface:**

1. **Search & Filter Bar:**
   - Full-text search (name, description, props, usage)
   - Filter by category (sections, blocks, layout, etc.)
   - Filter by theme (modern, classic, minimal, shared)
   - Filter by location (public, site, ui)
   - Filter by promotable status
   - Sort by: name, category, last updated, usage frequency

2. **Component Grid/List View:**
   - Card view showing:
     - Thumbnail image (screenshot or wireframe)
     - Component name
     - Category badge
     - Theme badge (if theme-specific)
     - Location indicator (public/site)
     - Brief description
     - Key props preview
   - Click to view full details

3. **Component Detail View:**
   - **Overview:**
     - Full description
     - File path (clickable to open in editor)
     - Import path (copy button)
     - Category, theme, location
     - Author and dates
   
   - **Visual Reference:**
     - Primary screenshot/wireframe display (large preview)
     - Thumbnail grid of additional images
     - Click to view full-size in modal/lightbox
     - Image type badges (Screenshot, Wireframe, Example)
     - Upload/manage images (screenshot, wireframe, examples)
   
   - **Props Table:**
     - Prop name
     - Type (string, number, boolean, object, etc.)
     - Required/Optional
     - Default value
     - Description
     - Example values
   
   - **Usage Examples:**
     - Code snippets with syntax highlighting
     - Multiple examples for different use cases
     - Copy-to-clipboard functionality
   
   - **Dependencies:**
     - List of components this depends on
     - Links to dependency component pages
   
   - **Design Tokens:**
     - List of design tokens used
     - Visual preview of token values
   
   - **Use Cases:**
     - Where component is used (pages, contexts)
     - Related components
   
   - **Actions:**
     - "View Source" (opens file in editor/IDE)
     - "Copy Import" (copies import statement)
     - "Copy Example" (copies usage example)

4. **Statistics Dashboard:**
   - Total components count
   - Components by category
   - Components by theme
   - Promotable vs client-specific breakdown
   - Recently added/updated components
   - Most used components
   - Development queue (planned components)
   - Components by status (planned, in progress, complete)

5. **"Create New Component" Button (Library-First Workflow):**
   - Prominent button in library interface
   - Opens component spec form:
     - Component name
     - Category, theme, location
     - Description/requirements
     - Upload screenshot/wireframe (requirements spec)
     - Add text prompt/requirements
     - Set priority and complexity
     - Assign to developer (optional)
   - Creates library entry with status "planned"
   - Generates unique `library_entry_id` for linking

6. **Development Status View:**
   - Filter by status: Planned, In Progress, Complete, Deprecated
   - Kanban board view (optional):
     - Planned → In Progress → Complete
     - Drag-and-drop status updates
   - Development queue: List of planned components
   - Component spec page (before development):
     - Shows requirements screenshot/prompt
     - Lists requirements
     - "Start Development" button:
       - Creates component file template
       - Links file to library entry
       - Updates status to "In Progress"
       - Opens file in editor

7. **Linked Component Development:**
   - Component file header includes library reference:
     ```typescript
     /**
      * @library_id abc123-def456
      * @component TestimonialsSlider
      * @status in_progress
      * ...
      */
     ```
   - Library entry shows:
     - "Component file: src/components/public/sections/TestimonialsSlider.tsx"
     - "View Source" button
     - "Open in Editor" button
     - Development progress indicator
   - Status updates:
     - Manual: Developer updates status in library UI
     - Automatic: Scanner detects component file and updates status
     - Workflow: Planned → In Progress (when file created) → Complete (when component has all required props/metadata)

**Library-First Development Workflow:**

**Step 1: Search First (Prevent Duplication)**
- Developer needs a new component
- First action: Search library for existing components
- Review existing components
- Decision: Use existing OR create new variant

**Step 2: Create Library Entry (If New Component Needed)**
- Click "Create New Component Entry"
- Fill in component spec:
  - Component name, category, theme, location
  - Description/requirements
  - Upload screenshot/wireframe (from design tool)
  - Add text prompt/requirements
  - Set priority, complexity, assign to developer
- Status set to "Planned"
- Library entry becomes component specification

**Step 3: Develop Component (Linked to Library Entry)**
- Click "Start Development" on library entry
- System creates component file template with:
  - Library entry ID in header (`@library_id`)
  - Basic component structure
  - Props interface (from requirements)
  - Placeholder implementation
- Component file automatically linked to library entry
- Status updates: "Planned" → "In Progress"
- Developer builds component using spec (screenshot/prompt) as reference

**Step 4: Library Entry Updates Automatically**
- Scanner detects new/updated component file
- Links to library entry via `@library_id` or file_path match
- Updates metadata from component code
- Status: "In Progress" → "Complete" (when component has all required props/metadata)
- Screenshot can be updated with live component render

**Component File Template Generation:**
- "Start Development" creates file with:
  - Library entry ID in header
  - Basic component structure
  - Props interface (from requirements)
  - Placeholder implementation
  - File path based on category/location/theme

**Automatic Linking:**
- Scanner matches library entries to files by:
  - `@library_id` in component header (preferred)
  - Component name match (fallback)
  - File path pattern match
- Two-way reference: file → library, library → file

**Image Upload/Management:**
- **Upload Screenshot**: File upload or drag-and-drop (PNG, JPG, JPEG, WebP)
- **Upload Wireframe**: File upload (PNG, JPG, SVG, WebP)
- **Add Example Images**: Multiple images showing different variants with captions
- **Image Actions**: Replace, delete, set as primary, add caption, link to media library
- **Storage**: Images stored in Supabase Storage `component-library/` bucket with automatic optimization

**Benefits:**
- **Library-First Development**: Prevents duplicate work by searching library first, creates component specs before coding, tracks development lifecycle
- **Developer Productivity**: Quick component discovery, understand props without reading source, copy-paste examples
- **Code Reusability**: Discover existing components before creating new ones, understand component capabilities
- **Documentation**: Self-documenting via header comments, always up-to-date (auto-scanned), searchable and filterable
- **Team Collaboration**: Shared component knowledge, consistent usage patterns, onboarding reference, component request system
- **Maintenance**: Track component usage, identify unused components, monitor component updates
- **Visual Reference**: See component appearance before reading code, compare similar components visually, design reference (wireframes vs screenshots)
- **Requirements Capture**: Screenshot/prompt documents requirements before coding, clear spec during development, visual reference throughout
- **Development Tracking**: Track what's planned vs built, see development queue, monitor progress, ensure requirements met

**Integration with Component Structure:**
- **Public Components** (`src/components/public/`): Marked as `is_promotable: true`, highlighted as "reusable"
- **Site Components** (`src/components/site/`): Marked as `is_client_specific: true`, still searchable for reference
- **UI Components** (`src/components/ui/`): Base shadcn/ui components, categorized separately
- **Theme Components** (`src/components/public/themes/[theme]/`): Theme-specific variants, filterable by theme

**Future Enhancements:**
- Component usage tracking (which pages use which components)
- Automatic screenshot generation (render component with sample props programmatically)
- Component versioning (track changes over time)
- Component deprecation warnings
- Integration with design system tokens (visual token reference)
- Component testing status
- Performance metrics (bundle size, render time)
- Animated previews (GIF/Video support for interactive components)
- Design tool integration (direct import from Figma/Sketch)

**Status**: Planned for future phase (after core CMS features are complete). This is a nice-to-have feature that greatly aids in deploying future client sites but is not critical for MVP.

### Archive & Restore System

To support client lifecycle management, the system includes an archive/restore feature for when clients leave and may return.

#### Archive Strategy

**Schema-Based Archiving (Primary Method):**
- Active schema renamed to `archived_{schema_name}` (e.g., `archived_client_abc123`)
- Storage bucket renamed to `archived-client-{schema-name}`
- Registry entry created in `public.archived_projects` table
- Data remains in Supabase but isolated and marked as archived
- Quick to archive and restore without data migration

**Archive Registry Table** (in `public` schema):
```sql
CREATE TABLE archived_projects (
  id UUID PRIMARY KEY,
  original_schema_name TEXT NOT NULL,
  archived_schema_name TEXT NOT NULL,
  client_name TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by TEXT, -- User ID who archived
  restore_notes TEXT,
  metadata JSONB -- Additional archive metadata
);
```

**Archive Process:**
1. Admin initiates archive from `/admin/settings/archive`
2. System renames schema: `client_abc123` → `archived_client_abc123`
3. System renames storage bucket: `client-client_abc123` → `archived-client-client_abc123`
4. Registry entry created with metadata
5. Confirmation and archive summary provided

**Restore Process:**
1. Admin views archived projects list
2. Selects project to restore
3. System renames schema back: `archived_client_abc123` → `client_abc123`
4. System renames storage bucket back
5. Registry entry updated (restored_at timestamp)
6. Project reactivated and accessible

**Backup Option (Optional):**
- Export data to SQL/JSON dump for long-term storage
- Export storage bucket contents to backup location
- Stored separately for compliance/long-term archival

### CI/CD & Maintenance Strategy

The architecture is designed for scalable, maintainable deployments via CI/CD.

#### CI/CD Workflow

**Git-Based Deployment:**
```
Git Repository → CI/CD Pipeline:
  ├── Run tests (TypeScript, unit tests)
  ├── Run linting
  ├── Build Next.js application
  ├── Deploy to Vercel
  └── Run database migrations (if needed)
```

**Component Library Maintenance:**
- Shared components: Update once in library, deploy to all (or specific) clients
- Project-specific components: Update per project repository as needed
- Design system: Global CSS variables, updates apply automatically
- Database migrations: Run per client schema as needed

**Update Strategies:**
- **Universal Updates**: Bug fixes in shared components → deploy to all clients
- **Selective Updates**: Feature additions → deploy to specific clients
- **Project-Specific**: Custom components → update per project repository
- **Design System**: Admin setting changes → immediate via CSS variables (no deploy needed)

**Scalability Benefits:**
- Add new clients by forking the template repository
- Create new schema per client
- Share component library across all deployments
- Independent versioning per client project
- Easy rollbacks via Git/Vercel

#### New Client Setup Workflow

1. Fork the template repository (`yourorg/website-cms-template`) into a new client repo (`yourorg/website-cms-{client}`)
2. Create new Supabase schema (`client_newname`)
3. Run migrations in new schema
4. Create storage bucket (`client-newname`)
5. Set environment variables (including `NEXT_PUBLIC_CLIENT_SCHEMA`)
6. Deploy to Vercel
7. Configure design system (fonts/colors) in admin
8. Customize components as needed per project

#### Component Library Growth

**Reusable Components:**
- Build once, use across multiple projects
- Stored in Git for version control
- Can be extracted to npm package later if needed
- Type-safe and well-documented

**Maintenance:**
- Bug fixes in components → update library → deploy to affected clients
- New components → add to library → use in new projects
- Component improvements → iterative updates → shared benefits

This architecture enables:
- **Scalability**: Easy to add new clients
- **Maintainability**: Shared components, isolated data
- **Flexibility**: Project-specific customization when needed
- **Developer Experience**: Type-safe, hot reload, easy iteration
- **CI/CD Ready**: Automated deployments, version control

## Content Types

### 1. Blog Posts
- Rich text content (Tiptap JSONB)
- Featured images
- Draft/published states
- SEO metadata (title, description)
- Excerpt/summary
- Categories/tags (future enhancement)

### 2. Galleries
- Named gallery collections
- Multiple images/videos per gallery
- Drag-and-drop reordering
- Gallery cover images
- Captions for gallery items

### 3. Media Library
- Image uploads to Supabase Storage
- Video URL management (Vimeo, YouTube, Adilo)
- Media metadata (alt text, captions)
- Search and filtering
- **Image Optimization System**: Automatic generation of multiple image variants (thumbnail, small, medium, large) on upload
  - Original image stored in Supabase Storage
  - Variants generated server-side during upload process
  - Variants stored in organized paths: `/media/{id}/original.{ext}`, `/media/{id}/large.webp`, `/media/{id}/medium.webp`, `/media/{id}/small.webp`, `/media/{id}/thumb.webp`
  - Metadata stored in database (width, height, format, variant paths)
  - WebP format used for variants (with fallback to original format if needed)
  - Standard sizes: Thumbnail (150×150), Small (400px width), Medium (800px width), Large (1200px width)
  - Supabase Storage Image Transformations available as fallback for ad-hoc sizes

### 4. Forms & CRM (Customer Relationship Management)

A CRM-first system where forms are developer-authored components that map to CRM fields. All form submissions are stored directly in the CRM, providing a unified contact and company management system optimized for B2B use cases while supporting B2C. The system includes comprehensive consent management and DND (Do Not Disturb) status tracking for ICANN, GDPR, and TCPA compliance.

**Core Philosophy:**
- **CRM as source of truth**: All contact data lives in CRM tables, not in separate form submission storage
- **Developer-authored forms**: No visual form builder; developers create form components that reference CRM fields
- **Company-centric**: Companies are first-class entities with robust data for B2B marketing
- **Direct storage**: Form submissions create/update CRM records immediately (no staging table)
- **Compliance-first**: Built-in consent management and DND tracking for marketing compliance

**Database Schema:**

**CRM Fields (Staple + Custom):**
```sql
-- Staple CRM fields (built-in, always available as columns in crm_contacts):
-- firstname, lastname, fullname, category

-- Custom CRM fields (per tenant, defined by admin)
CREATE TABLE crm_custom_fields (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL, -- 'company_size', 'budget_range', 'referral_source'
  label TEXT NOT NULL, -- Display label
  type TEXT NOT NULL, -- 'text', 'email', 'phone', 'select', 'number', 'textarea', 'checkbox'
  validation_rules JSONB, -- { required: false, minLength: 2, pattern: '...', options: [...] }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Companies Table:**
```sql
CREATE TABLE crm_companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  -- Company details
  email TEXT, -- Company email (for marketing)
  industry TEXT,
  category TEXT, -- Company category/classification
  tags TEXT[], -- Array of tags for email segmentation
  company_size TEXT, -- '1-10', '11-50', '51-200', '201-1000', '1000+'
  website TEXT,
  description TEXT,
  -- Location
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  -- Custom fields
  custom_data JSONB,
  -- Metadata
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'prospect', 'customer', 'partner'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Contacts Table (with relational emails/phones):**
```sql
CREATE TABLE crm_contacts (
  id UUID PRIMARY KEY,
  -- Staple fields
  firstname TEXT,
  lastname TEXT,
  fullname TEXT,
  category TEXT, -- 'lead', 'customer', 'partner', etc.
  -- Custom fields stored in JSONB
  custom_data JSONB,
  -- DND (Do Not Disturb) status
  dnd_status TEXT, -- NULL (no restriction), 'email', 'phone', 'all'
  -- Metadata
  source TEXT, -- 'contact_form', 'newsletter', 'manual_entry'
  form_id UUID REFERENCES forms(id),
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'archived'
  duplicate_status TEXT, -- NULL, 'needs_review' (if potential duplicate detected)
  potential_duplicate_of UUID REFERENCES crm_contacts(id), -- Link to potential duplicate
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relational emails (multiple per contact)
CREATE TABLE crm_contact_emails (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  type TEXT, -- 'primary', 'work', 'personal'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, email)
);

-- Relational phones (multiple per contact)
CREATE TABLE crm_contact_phones (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  type TEXT, -- 'primary', 'work', 'mobile', 'home'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, phone)
);
```

**Contact-Company Relationship (Many-to-Many):**
```sql
CREATE TABLE crm_contact_companies (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
  role TEXT, -- 'CEO', 'Marketing Manager', 'Decision Maker', etc.
  department TEXT,
  is_primary BOOLEAN DEFAULT false, -- Primary company for this contact
  start_date DATE,
  end_date DATE, -- NULL = current relationship
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, company_id)
);
```

**Consent Management (ICANN/GDPR/TCPA Compliance):**
```sql
CREATE TABLE crm_consents (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'email_marketing', 'phone_marketing', 'sms', 'postal'
  consented BOOLEAN NOT NULL, -- true = consented, false = withdrawn
  -- Audit trail for compliance
  method TEXT, -- 'form_submission', 'unsubscribe_link', 'manual_admin', 'api', 'import'
  source TEXT, -- Form ID, URL, admin user, etc.
  ip_address INET, -- For proof of consent (GDPR requirement)
  user_agent TEXT, -- Browser/device info
  consent_text TEXT, -- What text was shown when consent was given
  -- Timestamps
  consented_at TIMESTAMPTZ, -- When consent was given
  withdrawn_at TIMESTAMPTZ, -- When consent was withdrawn (NULL if active)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**DND (Do Not Disturb) History:**
```sql
CREATE TABLE crm_dnd_history (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  dnd_status TEXT NOT NULL, -- 'email', 'phone', 'all'
  reason TEXT, -- 'unsubscribed', 'requested', 'bounced', 'complaint', 'manual'
  method TEXT, -- 'unsubscribe_link', 'form_checkbox', 'manual_admin', 'api', 'bounce_handler'
  source TEXT, -- URL, form ID, admin user, etc.
  set_by UUID REFERENCES auth.users(id), -- Admin who set it (if manual)
  set_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

**Form Registry (Developer Helper + Settings):**
```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL, -- 'Contact Form', 'Newsletter Signup'
  slug TEXT UNIQUE,
  -- Developer helper: Available field mappings (for copy/paste reference)
  field_mappings JSONB, -- [
  --   { field_id: "email", field_name: "email", required: true, label: "Email Address" },
  --   { field_id: "firstname", field_name: "firstname", required: true },
  --   { field_id: "custom_field_123", field_name: "company_size", required: false }
  -- ]
  -- Form settings
  settings JSONB, -- {
  --   success_message: "Thanks! We'll be in touch.",
  --   redirect_url: "/thank-you",
  --   notifications: { email: "admin@example.com" }
  -- }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Form Submission Workflow:**

1. **Developer creates form component** referencing CRM fields:
   - Developer accesses Form Registry (`/admin/crm/forms`) to view available CRM fields
   - Copies field IDs/names for use in components
   - Creates form component mapping inputs to CRM fields
   - Includes consent checkboxes for email/phone marketing (opt-in, not pre-checked)

2. **Form submission** → `POST /api/forms/[formId]/submit`:
   - Receives JSON with CRM field values + consent flags
   - Validates against CRM field validation rules
   - Performs duplicate detection (see logic below)
   - Creates/updates CRM contact record directly
   - Creates email/phone records in relational tables
   - Links to company if provided (or creates new company if name doesn't exist)
   - Processes consents and creates `crm_consents` records with audit trail (IP, user agent, timestamp)
   - Sets DND status based on consent (no consent = DND for that channel)
   - Sends email notification to admin if configured

3. **Duplicate Detection Logic:**
   - **Perfect Match**: (firstname + lastname) OR fullname AND (email OR phone) all match
     - Action: Update existing contact record (keep original `created_at`, update `updated_at`)
     - Merge new data into existing record (emails, phones, company relationships)
   - **Partial Match**: Any key field matches (email OR phone OR (firstname + lastname) OR fullname) but not all
     - Action: Create new contact with `duplicate_status: 'needs_review'` and `potential_duplicate_of` link
     - Admin can review and merge manually in CRM
   - **No Match**: No key fields match
     - Action: Create new contact normally

4. **Company Handling in Forms:**
   - Company field is optional in forms
   - If provided: Contact selects existing company (autocomplete/dropdown)
   - If company name doesn't exist: Create new company record, then link contact
   - If not provided: Contact created without company; can be added later in CRM
   - Company is NOT required for contact records (supports B2C use cases)

**Consent Management (ICANN/GDPR/TCPA Compliance):**

**Consent Collection:**
- **Email Marketing Consent**: Required checkbox on forms with clear language
  - Example: "I consent to receive marketing emails" (must be opt-in, not pre-checked)
  - Stored in `crm_consents` with `consent_type: 'email_marketing'`
  - Tracks IP address, timestamp, consent text, user agent for audit trail
- **Phone Marketing Consent** (TCPA/GDPR):
  - Separate checkbox for phone/SMS marketing
  - Example: "I consent to receive marketing calls/texts"
  - Stored with `consent_type: 'phone_marketing'` or `'sms'`
- **Consent Withdrawal**:
  - Unsubscribe links in emails (one-click)
  - Updates `crm_consents` record: `consented: false`, `withdrawn_at: NOW()`
  - Automatically sets DND status if all marketing consents withdrawn

**DND (Do Not Disturb) Status Management:**

**Automatic DND (Recommended Best Practice):**
- **On Unsubscribe**: When contact clicks unsubscribe link → Set `dnd_status: 'email'` (or add to existing)
- **On Form Submission**: If contact unchecks consent or explicitly opts out → Set DND for that channel
- **On Bounce**: If email bounces (hard bounce) → Auto-set `dnd_status: 'email'`
- **On Complaint**: If contact marks email as spam → Auto-set `dnd_status: 'all'`
- All DND changes logged in `crm_dnd_history` with reason and method

**Manual DND (Admin Override):**
- Admin can manually set DND status in CRM
- Useful for: customer requests, compliance issues, data quality
- Tracks who set it and why in `crm_dnd_history`

**DND Enforcement:**
- Email marketing: Check `dnd_status` before sending (must not be 'email' or 'all')
- Phone marketing: Check `dnd_status` before calling (must not be 'phone' or 'all')
- API endpoints: Return DND status when querying contacts
- Export filters: Option to exclude DND contacts from marketing exports

**CRM Features:**

**Contact Management:**
- View all contacts with filtering/search
- Contact detail view showing:
  - All email addresses and phone numbers (relational)
  - All company relationships (with roles/departments, primary company marked)
  - Consent history (with audit trail)
  - DND status and history
  - Interaction history
  - Custom field values
- Merge duplicate contacts (admin action)
- Status management (new, contacted, archived)
- Export capabilities (CSV, with DND/consent filters)
- Notes and follow-up tracking

**Company Management:**
- Company list with filtering (industry, size, status, tags)
- Company detail view showing:
  - All contacts at company (with roles, primary contact indicator)
  - Company email, industry, category, tags
  - Location data
  - Custom field values
  - Notes
- Company-based email marketing (send to all contacts at company, respecting DND)
- Company segmentation (by industry, size, tags, status)
- Company analytics (engagement, contact count, etc.)

**Developer Workflow:**

1. **Access Form Registry** (`/admin/crm/forms`):
   - View available CRM fields (staple + custom)
   - Copy field IDs/names for use in components
   - See field validation rules and types
   - View suggested fields for common form types (e.g., Contact Form)

2. **Create Form Component**:
   - Reference CRM fields by ID/name
   - Map form inputs to CRM fields
   - Include consent checkboxes (email_marketing, phone_marketing)
   - Use form registry settings for messages/redirects

3. **Form Registry as Helper**:
   - Shows which fields are available
   - Provides copy/paste field references
   - Stores form settings (not field definitions)
   - Suggests common field combinations for form types

**Compliance Features:**

**Consent Management UI:**
- Show all consents per contact (with history)
- Visual indicators: ✅ Consented, ❌ Withdrawn
- Consent timeline (when given, when withdrawn, method, IP address)
- Ability to manually record consent (for phone/offline interactions)
- Export consent audit trail (for GDPR requests)

**DND Status Display:**
- Clear badge/indicator on contact record
- DND history timeline (when set, why, who set it)
- Easy to toggle DND status (with reason tracking)
- Bulk DND operations (e.g., mark all bounced emails as DND)

**Compliance Reports:**
- Export consent audit trail (for GDPR requests)
- Show proof of consent (IP, timestamp, consent text, user agent)
- DND status reports
- Consent withdrawal history

**Email Marketing Integration:**
- Company email field for company-level marketing
- Contact email addresses (primary + additional)
- Tags on companies for segmentation
- Industry/category for targeting
- Export contacts/companies for email campaigns (with DND/consent filters)
- Automatic DND enforcement (no emails to DND contacts)

**Cookie Consent Management (GDPR/ePrivacy Compliance):**

A cookie notification and consent system that complies with GDPR, ePrivacy Directive, and similar regulations. Cookie consent is stored both in the browser (localStorage) and optionally in the database when a user is identified (linked to CRM contact).

**Cookie Categories:**
- **Essential Cookies**: Required for site functionality (authentication, security, session management)
  - Always enabled, cannot be disabled
  - No consent required (legitimate interest)
- **Analytics Cookies**: Track website usage and performance (Google Analytics, etc.)
  - Requires explicit consent
  - Can be disabled by user
- **Marketing Cookies**: Used for advertising and marketing tracking
  - Requires explicit consent
  - Can be disabled by user
- **Functional Cookies**: Enhance user experience (preferences, language, etc.)
  - Requires explicit consent
  - Can be disabled by user
- **Custom Categories**: Admin can define additional cookie categories per client

**Cookie Consent Storage:**

**Browser Storage (Primary):**
- Consent preferences stored in `localStorage` (key: `cookie_consent`)
- Format: `{ essential: true, analytics: false, marketing: false, functional: false, timestamp: '2026-01-20T...', version: 1 }`
- Persists across sessions until user changes preferences
- Used to control cookie setting/loading on client-side

**Database Storage (Optional, when user identified):**
- If user submits a form or is logged in, consent is also stored in database
- Links to CRM contact record if contact exists (via email or user ID)
- Provides audit trail and compliance reporting
- Enables consent management in CRM UI

**Cookie Consent Database Schema:**
```sql
CREATE TABLE cookie_consents (
  id UUID PRIMARY KEY,
  -- Optional link to CRM contact (if user identified)
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  -- Optional link to member user (if logged in)
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  -- Consent preferences (JSONB for flexibility)
  preferences JSONB NOT NULL, -- {
  --   essential: true,
  --   analytics: false,
  --   marketing: false,
  --   functional: false,
  --   custom_category_1: true
  -- }
  -- Consent version (for tracking policy updates)
  consent_version INTEGER DEFAULT 1,
  -- Audit trail
  ip_address INET,
  user_agent TEXT,
  -- Timestamps
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Session/device identifier (for anonymous users)
  session_id TEXT, -- Anonymous session identifier
  UNIQUE(contact_id, consent_version), -- One consent record per contact per version
  UNIQUE(member_id, consent_version), -- One consent record per member per version
  UNIQUE(session_id, consent_version) -- One consent record per session per version
);
```

**Cookie Consent UI:**

**Cookie Banner Component:**
- Appears on first visit (if no consent stored in localStorage)
- Shows brief message with "Accept All", "Reject All", and "Customize" options
- Links to cookie policy page
- Dismissible (stores "reject all" if dismissed without action)
- Responsive design (mobile-friendly)
- Themeable via design tokens

**Cookie Preferences Modal/Page:**
- Detailed view showing all cookie categories
- Toggle switches for each category (except essential)
- Description of what each category does
- List of specific cookies/services used (if configured)
- "Save Preferences" button
- Link to cookie policy

**Cookie Policy Page:**
- Public page (`/cookie-policy` or `/privacy-policy#cookies`)
- Lists all cookie categories
- Describes purpose of each cookie
- Lists specific cookies/services used
- Explains how to manage preferences
- Admin-editable content (via CMS)

**Consent Workflow:**

1. **First Visit:**
   - Cookie banner appears
   - User can: Accept All, Reject All, or Customize
   - Consent stored in localStorage
   - If user identified (form submission, login), also stored in database

2. **Subsequent Visits:**
   - Check localStorage for existing consent
   - If consent exists and version matches, respect preferences
   - If consent version outdated, show banner again (policy updated)

3. **User Changes Preferences:**
   - User clicks "Cookie Settings" link (typically in footer)
   - Opens preferences modal/page
   - User toggles categories
   - Saves preferences → Updates localStorage and database (if identified)

4. **Policy Updates:**
   - Admin updates cookie policy or adds new categories
   - Increment `consent_version` in database
   - Banner reappears for all users (requires re-consent)

**Integration with CRM:**

**When User Submits Form:**
- If form includes email, check if contact exists in CRM
- If contact exists, link cookie consent to contact record
- Store consent preferences in `cookie_consents` table with `contact_id`
- Enables viewing cookie consent history per contact in CRM

**When User Logs In:**
- If member user logs in, link cookie consent to member record
- Store consent preferences with `member_id`
- Sync preferences from database to localStorage (if database version is newer)

**CRM UI Integration:**
- Contact detail view shows cookie consent status
- Display consent preferences per contact
- Show consent history (when given, when updated, version)
- Export consent data for GDPR requests

**Cookie Management (Technical Implementation):**

**Client-Side Cookie Control:**
- Before setting any non-essential cookie, check localStorage consent
- Only set cookies for categories user has consented to
- Essential cookies always set (no check needed)
- Third-party scripts (analytics, marketing) only load if consent given

**Server-Side Cookie Control:**
- API endpoints can check consent via request headers or session
- Respect consent preferences when setting cookies server-side
- Essential cookies (session, auth) always set

**Cookie Script Loading:**
- Analytics scripts (Google Analytics, etc.) only load if `analytics: true`
- Marketing scripts (Facebook Pixel, etc.) only load if `marketing: true`
- Functional scripts (chat widgets, etc.) only load if `functional: true`
- Use dynamic script loading based on consent preferences

**Admin Configuration:**

**Cookie Settings** (`/admin/settings/cookies`):
- Enable/disable cookie consent banner
- Configure cookie categories (add/edit/remove)
- Set cookie descriptions and purposes
- Configure third-party services (Google Analytics, Facebook Pixel, etc.)
- Set cookie policy page URL
- Configure consent expiration (how long consent is valid)
- Set consent version (increment when policy changes)

**Cookie Policy Content:**
- Editable via CMS (rich text editor)
- Can be separate page or section of privacy policy
- Should list all cookie categories and specific cookies used
- Should explain how to manage preferences

**Compliance Features:**

**GDPR Compliance:**
- Explicit consent required (no pre-checked boxes)
- Granular consent (per category)
- Easy withdrawal (user can change preferences anytime)
- Audit trail (IP, timestamp, user agent, consent text)
- Data export (consent data included in GDPR requests)

**ePrivacy Directive Compliance:**
- Consent required before setting non-essential cookies
- Clear information about cookie purposes
- Easy opt-out mechanism
- Consent must be specific and informed

**Consent Withdrawal:**
- User can withdraw consent anytime via cookie settings
- Withdrawal immediately stops non-essential cookies
- Existing cookies may need manual deletion (browser-dependent)
- Withdrawal logged in database (if user identified)

**API Endpoints:**
- `POST /api/cookies/consent` - Submit cookie consent preferences
  - Body: `{ preferences: { analytics: true, marketing: false, ... }, contact_id?: UUID, member_id?: UUID }`
  - Stores consent in localStorage (client-side) and database (if user identified)
  - Returns: `{ success: true, version: 1 }`
- `GET /api/cookies/consent` - Get current consent preferences (if user identified)
  - Returns: `{ preferences: {...}, version: 1, consented_at: '...' }`
- `PUT /api/cookies/consent` - Update consent preferences
- `GET /api/cookies/policy` - Get cookie policy content (public)

**API Endpoints:**
- `POST /api/forms/[formId]/submit` - Submit form data (creates/updates CRM contact, processes consents)
- `GET /api/crm/contacts` - List contacts (admin, with DND/consent filters)
- `GET /api/crm/contacts/[id]` - Get contact details (includes consents, DND history)
- `POST /api/crm/contacts/[id]/merge` - Merge duplicate contacts (admin)
- `POST /api/crm/contacts/[id]/unsubscribe` - Unsubscribe endpoint (sets DND, records consent withdrawal)
- `GET /api/crm/companies` - List companies (admin)
- `GET /api/crm/companies/[id]` - Get company details

### 5. Membership Platform

A protected content system allowing members-only access to content, pages, and resources. Supports multiple membership groups/tiers with different access levels.

**Membership Groups (Access Groups):**
- Named membership tiers (e.g., "Basic", "Premium", "VIP", "Enterprise")
- Hierarchical tier levels (numeric tier for access comparison)
- Description and benefits for each group
- Unlimited membership groups per client
- Group-specific access permissions
- **Ecommerce Integration** (Simple Tag Reference):
  - **Ecommerce Tag**: Simple tag/reference field (e.g., "premium-membership", "product-123")
  - This tag is matched by the ecommerce platform when processing payments
  - All payment details are stored in the ecommerce platform (not duplicated here)
  - Auto-assignment flag (automatically grant membership when webhook matches tag)

**Member Users:**
- Separate user accounts from admin users (uses Supabase Auth)
- Member registration and login on public site
- Member profiles with display names
- Membership status (active, inactive, suspended)
- Multiple membership groups per member (many-to-many relationship)
- Optional expiration dates per membership assignment

**Content Protection:**
- Posts, galleries, and pages can be marked as protected
- Three access levels:
  - `public` - Accessible to all visitors
  - `members` - Requires any active membership
  - `group` - Requires specific membership group
- Content-level access control (select required membership group)
- Protected content preview (teaser content for non-members)

**Key Features:**
- Member registration and login (separate from admin login)
- Member dashboard/profile area
- Content gating with automatic redirects
- **Easy Admin CRM Management**: Client admins can easily log in and manage memberships
  - View all members and their group assignments
  - Assign/remove memberships with simple interface
  - Update member status (active, inactive, suspended)
  - Set expiration dates
  - Bulk operations for efficiency
- Member directory (optional, admin-configurable)
- Membership expiration tracking
- **Simple Ecommerce Integration**:
  - Simple tag-based reference system (no duplicate payment data)
  - Webhook support for automatic membership assignment
  - All payment details remain in ecommerce platform
  - Secure API authentication for webhook endpoints

**Admin Management:**
- Create and manage membership groups
- Assign members to groups
- View all members and their group assignments
- Member status management (activate, suspend, remove)
- View member activity and access history (future enhancement)

### 6. Event Calendar

A public-facing event calendar module with an admin-managed event list. Events are viewable on the front end in multiple calendar modes, and can be subscribed to by end users via an iCalendar (ICS) feed.

**Front-End Calendar Views:**
- View modes: day / week / month / agenda (list)
- Clicking an event opens a modal with event details
- Responsive UX across desktop and mobile

**Admin (CMS) Event Management:**
- Create, edit, publish/unpublish, and delete events
- Event fields (initial scope): title, description, start/end date-time, all-day, location, optional external link

**Subscriptions (Add to End-User Calendars):**
- Publish an iCalendar (ICS) subscription feed for the site calendar (URL-based subscription)

**Automation & Sync (Planned Capability; design to be finalized later):**
- Events can be created/updated via API for automation use cases
- Optional one-way sync/import from external calendars (e.g., client meeting calendars) to keep the site calendar up to date

## Design System & Branding

### Custom Design Per Project

Unlike WordPress, this CMS does not use traditional theme templates. Each project is custom-designed per client requirements. However, the CMS provides:

1. **Theme System**: A theme-tagged component library system that allows clients to switch between different design aesthetics (modern, classic, minimal, etc.) while maintaining the same component structure
2. **Global Design System Controls**: Font and color palette management accessible from the admin settings
3. **Component Customization**: Developers can create custom components or modify theme components per project as needed

The theme system provides the convenience of theme switching (like WordPress) while maintaining the flexibility of custom component development.

### Font & Color Palette Management

The admin settings include a **Design System** section (`/admin/settings`) that allows configuration of:

- **Theme Selection**:
  - Select active theme from available themes (e.g., `modern`, `classic`, `minimal`)
  - Theme change applies immediately across all pages
  - Preview theme before applying
  - Theme setting stored in database (settings table)

- **Font Selection**: 
  - Primary font family (headings)
  - Secondary font family (body text)
  - Font size presets
  - Font weight options
  - Google Fonts integration

- **Color Palette**:
  - Primary brand color
  - Secondary brand color
  - Accent colors
  - Background colors
  - Text colors (foreground, muted)
  - Link colors
  - Button colors

These settings have **global reach** across the entire application:
- Applied to all public-facing pages
- Used consistently throughout the site
- Stored in database settings table
- Applied via CSS custom properties (CSS variables)
- Can be previewed in real-time in the admin
- Theme selection determines which component library is used (theme-tagged components)

### Admin Interface Styling

The admin area uses the **same design system** (fonts and colors) as the public site, but with a **dark theme** to provide visual distinction between the public website and the admin interface. This ensures:
- Consistent branding experience
- Clear visual separation (dark admin vs. light public site)
- Same typography and color palette, different theme application
- Professional, cohesive appearance

## Third-Party Integrations & Head Section Management

The application includes a head section management system for integrating third-party scripts, analytics, chatbots, and tracking codes. This allows superadmins to configure vendor-specific identifiers and ensures scripts are properly embedded in the HTML `<head>` section of all public-facing pages.

### Head Section Script Management

**Purpose:**
- Embed analytics tracking codes (Google Analytics, etc.)
- Integrate visitor tracking services
- Add chatbot and communication tools
- Support custom tracking and integration scripts
- Centralized management of all third-party scripts

**Implementation:**
- Scripts are injected into the `<head>` section of the root layout (`src/app/layout.tsx`)
- Scripts load on all public-facing pages (not in admin area)
- Configuration stored in database (settings table or dedicated integrations table)
- Managed exclusively by superadmins (platform-level configuration)

### Required Third-Party Scripts

The following scripts are **always present** and configured via superadmin settings:

**1. Google Analytics**
- **Purpose**: Website analytics and visitor tracking
- **Configuration Field**: Google Analytics Measurement ID (e.g., `G-XXXXXXXXXX`)
- **Script Type**: Google Analytics 4 (GA4) gtag.js
- **Location**: Injected in `<head>` section
- **Scope**: All public pages

**2. VisitorTracking.com**
- **Purpose**: Visitor tracking and analytics service
- **Configuration Field**: VisitorTracking.com Vendor UID
- **Script Type**: Custom tracking script from VisitorTracking.com
- **Location**: Injected in `<head>` section
- **Scope**: All public pages

**3. SimpleCommenter.com**
- **Purpose**: Comment system integration
- **Configuration Field**: SimpleCommenter.com Vendor UID
- **Script Type**: Custom script from SimpleCommenter.com
- **Location**: Injected in `<head>` section
- **Scope**: All public pages

### Superadmin Settings Interface

**Route**: `/admin/super/integrations` (superadmin-only)

**Features:**
- **Third-Party Integrations Section**:
  - Google Analytics: Input field for Measurement ID
  - VisitorTracking.com: Input field for Vendor UID
  - SimpleCommenter.com: Input field for Vendor UID
  - Save/Update functionality
  - Test/Preview mode (optional - to verify scripts load correctly)
- **Script Status Indicators**:
  - Show which scripts are configured (green) vs. not configured (gray)
  - Display current vendor UIDs/IDs
  - Enable/disable toggle for each script (optional)
- **Additional Scripts** (Future Enhancement):
  - Ability to add custom script snippets
  - Script ordering/priority
  - Conditional loading (specific pages only)

### Database Schema

**Settings Table Integration:**
```sql
-- Add to settings table (or create dedicated integrations table)
ALTER TABLE settings ADD COLUMN integrations JSONB DEFAULT '{}';

-- Example structure:
{
  "google_analytics": {
    "enabled": true,
    "measurement_id": "G-XXXXXXXXXX"
  },
  "visitor_tracking": {
    "enabled": true,
    "vendor_uid": "your-vendor-uid"
  },
  "simple_commenter": {
    "enabled": true,
    "vendor_uid": "your-vendor-uid"
  }
}
```

**Alternative: Dedicated Integrations Table** (if preferred):
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'google_analytics', 'visitor_tracking', 'simple_commenter'
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL, -- Vendor-specific configuration (UID, ID, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Script Injection Implementation

**Root Layout** (`src/app/layout.tsx`):
- Load integration settings from database
- Conditionally inject scripts based on configuration
- Use Next.js `<Script>` component for optimal loading
- Scripts load only on public pages (not `/admin/*` routes)

**Script Loading Strategy:**
- **Google Analytics**: Load with `strategy="afterInteractive"` (after page becomes interactive)
- **VisitorTracking.com**: Load with `strategy="afterInteractive"`
- **SimpleCommenter.com**: Load with `strategy="lazyOnload"` (defer loading)

**Example Implementation:**
```typescript
// In src/app/layout.tsx
import Script from 'next/script';
import { getIntegrations } from '@/lib/supabase/integrations';

export default async function RootLayout({ children }) {
  const integrations = await getIntegrations();
  
  return (
    <html>
      <head>
        {integrations.google_analytics?.enabled && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${integrations.google_analytics.measurement_id}`}
            strategy="afterInteractive"
          />
        )}
        {/* Additional scripts... */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Access Control

- **Superadmin Only**: Only users with `user_metadata.type = "superadmin"` can access `/admin/super/integrations`
- **2FA Required**: Access to superadmin settings requires `aal2` (2FA verified)
- **Client Admins**: Cannot modify third-party integrations (platform-level configuration)

### Future Enhancements

- **Custom Scripts**: Allow superadmins to add additional custom script snippets
- **Page-Specific Scripts**: Configure scripts to load only on specific pages
- **Script Ordering**: Control the order in which scripts load
- **Performance Monitoring**: Track script load times and impact
- **A/B Testing Integration**: Support for experimentation platforms
- **Cookie Consent Integration**: Integration with cookie consent tools

## Authentication

The application uses **Supabase Auth** for authentication, providing a native, integrated authentication solution within the Supabase ecosystem.

### Supabase Auth Integration

- **Native Authentication**: Built-in Supabase Auth handles all authentication flows
- **Email/Password**: Primary authentication method with password reset functionality
- **OAuth Providers**: Support for Google, GitHub, and other OAuth providers (optional)
- **Session Management**: Automatic session management with refresh tokens
- **JWT Tokens**: Secure JWT-based authentication
- **Role-based Access**: Custom roles stored in user metadata (admin, editor, viewer, and more)

### Role Types

The system formalizes **four primary user types**:

**1) Superadmin (Platform Admin / Developer Team)**
- **Who**: You (developer) and your internal team members
- **Scope**: Cross-client (can access **all** client deployments / schemas)
- **Purpose**: Platform-wide settings, diagnostics, client lifecycle tooling, and emergency access
- **Access**: Superadmin-only system area (route to be implemented; recommended: `/admin/super`)

**2) Client Admin (Site Admin)**
- **Who**: The client’s administrators and staff
- **Scope**: Single-client (their specific client schema only)
- **Purpose**: Day-to-day site administration: media, posts, galleries, forms/CRM, events, memberships, site settings
- **Access**: `/admin/*` (standard CMS)

**3) GPU (General Public User)**
- **Who**: Any site visitor (anonymous or logged-out)
- **Scope**: Public website only
- **Purpose**: Browse public pages and content
- **Access**: Public routes only (no auth required)

**4) GPUM (General Public User - Member)**
- **Who**: End users who register/login and have **membership status**
- **Scope**: Public site + protected member content (based on membership groups)
- **Purpose**: Access protected pages/content and member dashboard
- **Access**: `/login`, `/register`, `/members/*`, plus gated content routes

**Core Distinction (Important):**
- **Admin roles** control **what CMS features** an authenticated admin can access (platform + client admin).
- **Membership groups** control **what protected content** a GPUM can access on the public site.

### Multi-Client Authentication Strategy

**Note**: The terms "tenant" and "client" are interchangeable in this system. "Client" is the preferred user-facing term, while "tenant" may appear in technical contexts (e.g., `tenant_id` in user metadata).

Since all clients share a single Supabase project but use separate schemas, authentication works as follows:

1. **User Metadata**: Each user in Supabase Auth has metadata containing:
   - `tenant_id`: The client schema they belong to (e.g., `client_abc123`) — required for client admins and members (note: field name uses "tenant" for technical consistency with Supabase conventions)
   - `type`: `superadmin | admin | member`
   - `role`: Role for admin authorization within the CMS (examples: `client_admin`, `editor`, `viewer`; `superadmin` for platform admins)
   - `allowed_schemas`: Optional array for cross-client access (used by superadmins)

2. **Schema Association**: When a user logs in, their `tenant_id` from metadata is matched with the `NEXT_PUBLIC_CLIENT_SCHEMA` environment variable to ensure they can only access their designated schema.

3. **Access Control**: 
   - Middleware validates user session and checks client association
   - Database queries are automatically scoped to the correct schema
   - Users cannot access data from other client schemas

**Superadmin Bypass Rules:**
- If `user_metadata.type = "superadmin"` and `role = "superadmin"`, middleware can permit access regardless of `NEXT_PUBLIC_CLIENT_SCHEMA`
- Superadmins may optionally carry `allowed_schemas: ["*"]` or a concrete schema allowlist

### Authentication Flow

1. User visits `/admin/login`
2. Enters email/password or uses OAuth
3. Supabase Auth validates credentials
4. User metadata is checked:
   - **Client Admin**: `tenant_id` must match the deployment's `NEXT_PUBLIC_CLIENT_SCHEMA`
   - **Superadmin**: may bypass `tenant_id` match (platform access, cross-client)
5. Session is established with JWT token
6. Middleware protects all `/admin/*` routes
7. User is redirected to `/admin/dashboard`

### Route Protection

- **Next.js Middleware**: Validates Supabase Auth sessions
- **Protected Routes**: All `/admin/*` routes (except `/admin/login`) require authentication
- **Session Validation**: JWT tokens validated on each request
- **Automatic Refresh**: Supabase handles token refresh automatically
- **Login Page**: `/admin/login` with Supabase Auth UI components
- **Discreet Admin Link**: Admin link in public site footer for easy access

### Two-Factor Authentication (2FA/MFA)

The application implements **Multi-Factor Authentication (MFA)** using Supabase Auth's built-in MFA capabilities to enhance security for elevated admin roles.

#### Development Mode Bypass

For development convenience, 2FA requirements can be bypassed while keeping authentication active:

- **Environment Variable**: Set `NEXT_PUBLIC_DEV_BYPASS_2FA=true` in `.env.local` (development only)
- **Behavior**: 
  - Authentication is still required (users must log in)
  - 2FA/MFA checks are skipped in development mode
  - Only works when `NODE_ENV=development`
  - Automatically disabled in production (no bypass possible)
- **Purpose**: Faster development iteration without needing to enter 2FA codes repeatedly
- **Security**: Production deployments always enforce 2FA for required roles

#### MFA Methods

**Primary Method: TOTP (Time-Based One-Time Password)**
- **Implementation**: TOTP via authenticator apps (Google Authenticator, Authy, 1Password, etc.)
- **Enrollment**: Users enroll via `supabase.auth.mfa.enroll()` - generates QR code or secret
- **Verification**: Challenge → verify with code from authenticator app
- **Advantages**: 
  - No external provider setup required (works out-of-the-box)
  - No per-message costs
  - More reliable (no delivery delays)
  - Works offline
  - Faster verification
  - Better security (no SIM swapping risk)
- **Status**: Implemented as primary 2FA method

**Planned Method: SMS/Phone-Based Codes**
- **Implementation**: SMS or WhatsApp verification codes via Supabase Auth
- **Provider Requirement**: Requires external SMS provider account (Twilio, MessageBird, Vonage, or Textlocal)
- **Setup**: Configure SMS provider credentials in Supabase Dashboard
- **Use Case**: Optional backup/second factor, or for users who cannot use authenticator apps
- **Status**: Planned for future implementation (not required for initial release)

#### Authenticator Assurance Levels (AAL)

Supabase uses **Authenticator Assurance Levels** in JWT tokens to indicate authentication strength:

- **`aal1`**: Password/social login only (no 2FA verified)
- **`aal2`**: Password + successful 2FA verification

The JWT `aal` claim is checked in middleware and API routes to enforce access requirements.

#### 2FA Requirements by Role

**Superadmin (Always Required)**
- **Requirement**: Must have `aal2` (2FA verified) for all superadmin routes
- **Enrollment**: Required on first login after account creation
- **Method**: TOTP (authenticator app) - primary and required
- **Enforcement**: Middleware blocks access to `/admin/super/*` routes if `aal !== 'aal2'`
- **Recovery**: Multiple factors can be enrolled for backup (up to 10 factors per user)

**Client Admin (Required for Sensitive Operations)**
- **Requirement**: Must have `aal2` for sensitive operations:
  - Settings changes (`/admin/settings`)
  - User/member management (`/admin/members`, `/admin/memberships`)
  - Archive/reset operations (`/admin/settings/archive`, `/admin/settings/reset`)
  - API key management
- **Optional**: Basic content editing (posts, galleries, media) may work with `aal1` (configurable)
- **Enrollment**: Prompted on first login, can be deferred for basic operations
- **Method**: TOTP (authenticator app) - primary and required
- **Enforcement**: Middleware checks `aal` for sensitive routes

**Member Users (GPUM) - Optional**
- **Requirement**: Optional 2FA enrollment
- **Access**: Can enable 2FA in account settings (`/members/account`)
- **Method**: TOTP (authenticator app) - optional
- **Enforcement**: Not required for member content access

#### MFA Enrollment Flow

1. **First Login After Account Creation**:
   - User logs in with password (achieves `aal1`)
   - System detects role requires 2FA (superadmin/client admin)
   - User is redirected to `/admin/mfa/enroll`
   - QR code displayed for TOTP enrollment
   - User scans QR code with authenticator app
   - User verifies enrollment with code from app
   - Session upgraded to `aal2`
   - User granted full access

2. **Subsequent Logins**:
   - User logs in with password (achieves `aal1`)
   - System checks role and route requirements
   - If `aal2` required: User redirected to `/admin/mfa/challenge`
   - User enters code from authenticator app
   - Session upgraded to `aal2`
   - User granted access

3. **Multiple Factors**:
   - Users can enroll multiple TOTP factors (up to 10)
   - Useful for backup/recovery
   - All enrolled factors shown during challenge

#### MFA Challenge Flow

1. **After Password Login**:
   - User successfully authenticates (password/OAuth)
   - Session has `aal = 'aal1'`
   - Middleware checks if route requires `aal2`
   - If required: Redirect to `/admin/mfa/challenge`

2. **Challenge Page** (`/admin/mfa/challenge`):
   - Lists all enrolled factors
   - User selects factor to use (if multiple enrolled)
   - User enters code from authenticator app
   - System verifies code via `supabase.auth.mfa.verify()`
   - Session upgraded to `aal2`
   - User redirected to intended destination

3. **Session Management**:
   - `aal2` sessions persist until logout or expiration
   - Token refresh maintains `aal2` status
   - Re-login requires new 2FA challenge

#### Middleware Enforcement

**Superadmin Routes** (`/admin/super/*`):
```typescript
// Always require aal2
if (userRole === 'superadmin' && aal !== 'aal2') {
  return redirect('/admin/mfa/challenge');
}
```

**Client Admin Sensitive Routes**:
```typescript
// Require aal2 for sensitive operations
const sensitiveRoutes = ['/admin/settings', '/admin/members', '/admin/memberships'];
if (userRole === 'client_admin' && sensitiveRoutes.includes(pathname) && aal !== 'aal2') {
  return redirect('/admin/mfa/challenge');
}
```

#### MFA Management UI

**Admin Settings** (`/admin/settings/security`):
- View enrolled factors
- Enroll new TOTP factor (QR code)
- Remove enrolled factors
- View enrollment dates
- Manage backup factors

**Member Account Settings** (`/members/account/security`):
- Optional 2FA enrollment
- Manage enrolled factors
- Enable/disable 2FA

#### Recovery & Edge Cases

**Lost Authenticator Access**:
- Users with multiple enrolled factors can use backup factor
- Superadmin recovery: Requires separate support process (manual verification)
- Client admin recovery: Can be handled by superadmin or support process

**Unenrollment**:
- Superadmin: Cannot unenroll if it's their only factor (must enroll backup first)
- Client admin: Can unenroll if multiple factors exist
- System prevents leaving user without required 2FA

**Session Expiration**:
- `aal2` status persists in session until logout
- Token refresh maintains `aal2`
- Re-authentication requires new 2FA challenge

#### Database/RLS Integration

**Row-Level Security (RLS) Policies**:
- Sensitive tables can check `aal` claim in JWT
- Require `aal2` for superadmin operations
- Example: Archive/restore operations require `aal2`

**API Route Protection**:
- API routes check `aal` claim for sensitive operations
- Admin API endpoints require `aal2` for destructive operations

#### Future Enhancements (SMS/Phone-Based 2FA)

**Planned Implementation**:
- SMS provider integration (Twilio, MessageBird, Vonage, or Textlocal)
- Phone number enrollment flow
- SMS code verification
- Backup/second factor option
- Regional SMS provider selection

**Requirements**:
- External SMS provider account setup
- Provider credentials configuration in Supabase Dashboard
- Per-message costs (handled by provider)
- Regional compliance considerations

**Status**: Planned for future release (not required for initial implementation)

## Membership System Architecture

### Dual Authentication System

The application supports two distinct user types using Supabase Auth:

1. **Admin Users** - Access CMS at `/admin/*`
   - Two admin classes:
     - **Superadmin**: `user_metadata.type = "superadmin"`, `user_metadata.role = "superadmin"` (cross-tenant)
     - **Client Admin**: `user_metadata.type = "admin"`, `user_metadata.role = "client_admin" | "editor" | "viewer" | ...` (single-tenant)
   - Client admins require `user_metadata.tenant_id` matching the deployment’s `NEXT_PUBLIC_CLIENT_SCHEMA`
   - Authenticate at `/admin/login`
   - Manage content and site settings (scope depends on admin role)

2. **Member Users** - Access protected content on public site
   - Stored in Supabase Auth with `user_metadata.type = "member"` (GPUM)
   - Have `user_metadata.tenant_id` (for multi-client isolation)
   - Authenticate at `/login` or `/register`
   - Profile stored in `members` table in client schema
   - Can belong to multiple membership groups

### Membership Groups vs Roles

**Roles** (Admin Users):
- Define what CMS features a user can access
- Set in `user_metadata.role` (superadmin, client_admin, editor, viewer, and more)
- Examples: "Can this admin user delete posts?", "Can they edit settings?"

**Membership Groups** (Member Users):
- Define what protected content members can access
- Stored in `membership_groups` table in client schema
- Members assigned via `user_memberships` junction table
- Examples: "Can this member view premium blog posts?", "Can they access VIP gallery?"

### Database Schema

**Membership Tables** (in each client schema):
```sql
-- Membership groups (e.g., "Basic", "Premium", "VIP")
CREATE TABLE membership_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  tier INTEGER DEFAULT 0, -- For hierarchical access (0=free, 1=basic, 2=premium, etc.)
  -- Simple ecommerce integration (tag reference only)
  ecommerce_tag TEXT, -- Simple tag/reference from ecommerce platform (e.g., "premium-membership")
  auto_assign_on_payment BOOLEAN DEFAULT false, -- Auto-grant membership when webhook matches tag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_ecommerce_tag (ecommerce_tag) -- For quick webhook lookups
);

-- Member profiles (extends Supabase auth.users)
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User membership assignments (many-to-many)
CREATE TABLE user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_group_id UUID NOT NULL REFERENCES membership_groups(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ, -- Optional expiration
  assigned_via TEXT DEFAULT 'manual' CHECK (assigned_via IN ('manual', 'webhook', 'api')), -- Simple tracking of assignment method
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, membership_group_id)
);

-- Note: All payment/transaction details are stored in the ecommerce platform.
-- This system only tracks membership assignments, not payment details.
```

**Content Protection Fields** (added to existing tables):
```sql
-- Add to posts table
ALTER TABLE posts ADD COLUMN access_level TEXT DEFAULT 'public' 
  CHECK (access_level IN ('public', 'members', 'group'));
ALTER TABLE posts ADD COLUMN required_membership_group_id UUID 
  REFERENCES membership_groups(id) ON DELETE SET NULL;

-- Add to galleries table
ALTER TABLE galleries ADD COLUMN access_level TEXT DEFAULT 'public'
  CHECK (access_level IN ('public', 'members', 'group'));
ALTER TABLE galleries ADD COLUMN required_membership_group_id UUID 
  REFERENCES membership_groups(id) ON DELETE SET NULL;

-- Future: Add to custom pages table when implemented
```

### Access Control Flow

**Content Access Check:**
1. User requests protected content (post, gallery, page)
2. Check content `access_level`:
   - `public` → Allow access
   - `members` → Verify user is authenticated member (any active membership)
   - `group` → Verify user belongs to `required_membership_group_id`
3. If access denied → Redirect to `/login` with redirect URL
4. If member but wrong group → Show upgrade message or teaser content

**Member Authentication:**
1. Member registers/logs in at `/login`
2. Supabase Auth creates user with `user_metadata.type = "member"`
3. Member profile created in `members` table
4. Member assigned to default membership group (optional)
5. Session established for public site access

### Middleware & Route Protection

**Public Route Protection:**
- Member routes (`/members/*`) require member authentication
- Protected content routes check membership before rendering
- Redirect unauthenticated users to `/login` with return URL

**Component-Level Gating:**
- `<ProtectedContent>` wrapper component for gated sections
- Accepts `requiredMembershipGroup` prop
- Shows teaser or redirect based on membership status

### Ecommerce Integration & Payment-to-Membership Flow

**Architecture:**
The CMS integrates with external ecommerce platforms (Stripe, Shopify, WooCommerce, etc.) through a robust API system that automatically grants membership access upon successful payment.

**Payment-to-Membership Flow (Simplified):**

1. **Product Configuration**:
   - Membership group in CMS is configured with an `ecommerce_tag` (e.g., "premium-membership")
   - `auto_assign_on_payment` flag is enabled if automatic assignment is desired
   - Ecommerce platform product is tagged with the same tag value

2. **Customer Purchase** (external ecommerce platform):
   - Customer purchases membership product on external ecommerce site
   - Payment is processed and stored entirely in the ecommerce platform
   - Ecommerce platform triggers webhook to CMS with tag and customer email

3. **Webhook Processing** (CMS):
   - CMS receives webhook at `/api/webhooks/payment/[provider]`
   - Webhook signature is verified for security
   - CMS extracts: customer email and product tag
   - CMS looks up membership group by matching `ecommerce_tag`
   - If `auto_assign_on_payment` is enabled:
     - Member profile is created/updated (if email exists)
     - Membership is assigned to user via `user_memberships` table
     - `assigned_via` is set to 'webhook'

4. **Member Access Granted**:
   - Member can immediately access protected content
   - Membership appears in member dashboard
   - Expiration date set (if configured in membership group)

**Admin Management** (Primary Method):
- Client admins log in to `/admin/members`
- Simple interface to view all members and their memberships
- One-click assign/remove memberships
- Update member status and expiration dates
- All payment details remain in ecommerce platform (no duplication)

**Manual Assignment via API** (for custom integrations):
- External system calls `POST /api/memberships/[id]/assign` with email
- CMS validates API key and processes assignment
- Simple assignment without payment data duplication

### Integration Points

1. **Content Editor**: 
   - Access level dropdown when creating/editing posts/galleries
   - Membership group selector when `access_level = "group"`
   - Preview option to see member view

2. **Member Dashboard**:
   - Display current memberships
   - Show membership expiration dates
   - List accessible content categories
   - Account settings
   - View payment history (if applicable)

3. **Admin Dashboard** (CRM Integration):
   - Membership statistics (total members, by group)
   - Recent member registrations
   - Membership activity overview
   - Payment transaction log
   - Failed assignment alerts

4. **API Endpoints**:
   - Member authentication endpoints
   - Protected content endpoints with membership validation
   - Member profile endpoints
   - **Ecommerce Integration API**: Robust API for external ecommerce modules
     - Payment webhook endpoints for automatic membership assignment
     - Membership management API (assign, remove, check status)
     - Transaction logging and verification
     - Secure API key authentication for external systems

## API Endpoints

REST API endpoints (optional, for programmatic content access and automation):

### Public Content API
- `GET /api/posts` - List published posts (pagination, search)
- `GET /api/posts/[id]` - Get single post by ID or slug
- `GET /api/galleries` - List all galleries
- `GET /api/galleries/[id]` - Get gallery with items by ID or slug
- `GET /api/media/[id]` - Get media item details
- `POST /api/forms/[formId]/submit` - Submit form data (creates/updates CRM contact, processes consents, handles duplicate detection)
- `GET /api/events` - List events (supports date range filtering)
- `GET /api/events/[id]` - Get event by ID (or slug)
- `GET /api/events/ics` - iCalendar (ICS) subscription feed for the calendar
- `POST /api/cookies/consent` - Submit cookie consent preferences (stores in localStorage and database if user identified)
- `GET /api/cookies/consent` - Get current cookie consent preferences (if user identified)
- `PUT /api/cookies/consent` - Update cookie consent preferences
- `GET /api/cookies/policy` - Get cookie policy content (public)

### Authenticated Admin API (for automation and admin tooling)
- `POST /api/events` - Create event
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### Membership & Ecommerce Integration API

**Membership Management API** (Simple API for external integrations):
- `GET /api/memberships` - List all membership groups (public or API key auth)
- `GET /api/memberships/[id]` - Get membership group details (public or API key auth)
- `POST /api/memberships/[id]/assign` - Assign membership to user (API key required)
  - Body: `{ "email": "user@example.com" }`
  - Returns: Membership assignment confirmation
- `POST /api/memberships/[id]/remove` - Remove membership from user (API key required)
  - Body: `{ "email": "user@example.com" }`
- `GET /api/members/[email]` - Get member details and memberships (API key required)
- `POST /api/members/verify` - Verify member has specific membership (API key required)

**Payment Webhook API** (Simple tag-based matching):
- `POST /api/webhooks/payment` - Receive payment notifications from ecommerce platforms
  - Accepts webhook payloads from external systems (Stripe, Shopify, WooCommerce, etc.)
  - Expected payload: `{ "email": "user@example.com", "tag": "premium-membership" }`
  - Validates webhook signature (configurable per provider)
  - Looks up membership group by matching `ecommerce_tag`
  - Automatically assigns membership if `auto_assign_on_payment` is enabled
  - Returns success/failure status
- `POST /api/webhooks/payment/[provider]` - Provider-specific webhook endpoints
  - `/api/webhooks/payment/stripe` - Stripe webhook handler (extracts tag from payload)
  - `/api/webhooks/payment/shopify` - Shopify webhook handler
  - `/api/webhooks/payment/woocommerce` - WooCommerce webhook handler

### CRM API (Admin & Automation)

**Contact Management API:**
- `GET /api/crm/contacts` - List contacts (admin, supports filtering by status, DND, consent, company)
- `GET /api/crm/contacts/[id]` - Get contact details (includes emails, phones, companies, consents, DND history)
- `POST /api/crm/contacts/[id]/merge` - Merge duplicate contacts (admin)
- `POST /api/crm/contacts/[id]/unsubscribe` - Unsubscribe endpoint (sets DND, records consent withdrawal)
- `PUT /api/crm/contacts/[id]` - Update contact (admin)
- `DELETE /api/crm/contacts/[id]` - Delete contact (admin)

**Company Management API:**
- `GET /api/crm/companies` - List companies (admin, supports filtering by industry, size, status, tags)
- `GET /api/crm/companies/[id]` - Get company details (includes all contacts at company)
- `POST /api/crm/companies` - Create company (admin)
- `PUT /api/crm/companies/[id]` - Update company (admin)
- `DELETE /api/crm/companies/[id]` - Delete company (admin)

**Consent & DND API:**
- `GET /api/crm/contacts/[id]/consents` - Get consent history for contact
- `POST /api/crm/contacts/[id]/consents` - Record consent (admin or via form submission)
- `POST /api/crm/contacts/[id]/consents/withdraw` - Withdraw consent (sets DND automatically)
- `GET /api/crm/contacts/[id]/dnd-history` - Get DND history for contact
- `PUT /api/crm/contacts/[id]/dnd-status` - Update DND status (admin)

**API Authentication:**
- **API Key Authentication**: External ecommerce modules use API keys for authentication
  - API keys stored in database (settings table or dedicated `api_keys` table)
  - Simple key-based authentication for webhook endpoints
  - Rate limiting per API key (configurable)
- **Webhook Security**: 
  - Signature verification for webhook payloads (provider-specific)
  - IP allowlist (optional, for additional security)
  - Idempotency handling (prevent duplicate processing based on email+tag combination)

All API endpoints include:
- Rate limiting (100 requests per minute for public, configurable for API keys)
- Response caching headers (where appropriate)
- JSON responses
- Error handling with consistent error format

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- Supabase account and project
- Supabase Auth enabled in your Supabase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd website-cms
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_CLIENT_SCHEMA=client_default
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (template): SMTP settings for form submission email notifications (Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Website <no-reply@example.com>"
```

**Note**: Supabase Auth credentials are included in the `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No separate auth API is needed.

4. Set up the database schema:
   - Create a new schema in your Supabase project (e.g., `client_default`)
   - Run the migration from `supabase/migrations/001_initial_schema.sql` in that schema
   - Create a storage bucket named `client-{schema-name}` (e.g., `client-client_default`)

5. Run the development server:
```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

Each client should be deployed as a separate Vercel project:

1. Fork the template repository for each client (creates a new client repo)
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_CLIENT_SCHEMA` - Unique schema name for this client (e.g., `client_abc123`)
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (includes auth capabilities)
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)
   - `SMTP_*` - SMTP credentials (only required if enabling form submission notifications)
   - `NEXT_PUBLIC_APP_URL` - Your deployment URL (e.g., `https://clientdomain.com`)

**Important**: Create users in Supabase Auth with `user_metadata` containing `tenant_id` matching the `NEXT_PUBLIC_CLIENT_SCHEMA` value for each deployment.

3. Deploy to Vercel:
```bash
vercel
```

4. Configure domain: `clientdomain.com` (single domain, no subdomain needed)

### Database Setup per Client

For each client deployment:

1. **Create Schema**: Create a new schema in Supabase (e.g., `client_abc123`)
2. **Run Migrations**: Run the migration SQL in that schema
3. **Create Storage Bucket**: Create storage bucket named `client-{schema-name}` (e.g., `client-client_abc123`)
4. **Configure Storage**: Set bucket to public or configure policies as needed
5. **Create Auth Users**: Create users in Supabase Auth with metadata:
   ```json
   {
     "tenant_id": "client_abc123",
     "role": "admin"
   }
   ```
   - Users can be created via Supabase Dashboard → Authentication → Users
   - Or programmatically via Supabase Admin API
   - Each user must have `tenant_id` matching the schema name

## Project Structure

```
website-cms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/          # Public website routes
│   │   │   ├── page.tsx       # Homepage
│   │   │   ├── blog/          # Blog pages
│   │   │   └── layout.tsx     # Public layout
│   │   ├── admin/             # Admin CMS routes (protected)
│   │   │   ├── login/         # Login page
│   │   │   ├── dashboard/     # Dashboard
│   │   │   ├── posts/         # Post management
│   │   │   ├── galleries/     # Gallery management
│   │   │   ├── media/         # Media library
│   │   │   ├── forms/         # Form registry (developer helper)
│   │   │   ├── crm/           # CRM contacts and companies management
│   │   │   ├── memberships/   # Membership group management
│   │   │   ├── members/       # Member user management
│   │   │   ├── settings/      # Settings
│   │   │   │   ├── archive/   # Archive/restore management
│   │   │   │   └── reset/     # Reset to template
│   │   │   └── layout.tsx     # Admin layout
│   │   ├── (public)/          # Public website routes
│   │   │   ├── login/         # Member login/registration
│   │   │   ├── members/       # Member dashboard routes
│   │   └── api/               # REST API endpoints
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── dashboard/         # Admin components
│   │   ├── editor/            # Rich text editor
│   │   ├── media/             # Media components
│   │   ├── forms/             # Form components (developer-authored, map to CRM fields)
│   │   ├── crm/               # CRM management components (contacts, companies, consents)
│   │   ├── memberships/       # Membership components
│   │   └── public/            # Public site components (reusable library)
│   │       ├── sections/      # Reusable page sections
│   │       ├── pages/         # Page-level components
│   │       └── layout/        # Layout components (Header, Footer, Nav)
│   ├── lib/
│   │   ├── supabase/          # Supabase client & schema utilities
│   │   │   ├── client.ts      # Schema-aware client
│   │   │   ├── schema.ts      # Schema utilities
│   │   │   ├── migrations.ts  # Migration utilities
│   │   │   ├── archive.ts     # Archive/restore utilities
│   │   │   ├── reset.ts       # Reset utilities
│   │   │   └── memberships.ts # Membership utilities
│   │   ├── auth/              # Auth API integration
│   │   ├── api/               # API utilities
│   │   └── utils/             # Utility functions
│   ├── types/                 # TypeScript types
│   └── hooks/                 # React hooks
├── scripts/                   # Utility scripts
│   ├── setup-new-client.ts    # CLI script for new client setup
│   ├── reset-content.ts       # Reset all content utility
│   └── archive-project.ts     # Archive project utility
├── supabase/
│   └── migrations/            # Database migrations
│       └── 001_initial_schema.sql
└── docs/                      # Project documentation
```

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
- Reset all content: Clear posts, galleries, forms, submissions
- Reset design system: Restore fonts and colors to defaults
- Reset media: Option to clear or keep media library
- Full factory reset: Complete reset including settings
- Safety confirmations: Multiple confirmations required

**Access**: `/admin/settings/reset` (admin-only, requires explicit confirmation)

### New Client Setup

**Workflow:**
1. Fork the template repository to create the client repository
2. Run setup script: `pnpm run setup --schema client_newproject`
3. Script creates schema, runs migrations, creates storage bucket
4. Set environment variables in Vercel
5. Deploy to Vercel
6. Configure design system in admin

**CLI Tools:**
- `pnpm run setup` - Interactive setup for new client
- `pnpm run reset` - Reset content to template state
- `pnpm run archive` - Archive current project

## Key Differentiators from WordPress

1. **Simpler Interface**: Clean, modern admin UI designed for non-technical users
2. **Faster Performance**: Built on Next.js 15 with modern React patterns
3. **Essential Features Only**: Focused on core content management needs
4. **Modern Tech Stack**: TypeScript, Tailwind CSS, shadcn/ui components
5. **Better Developer Experience**: Type-safe, component-based architecture
6. **Single App Model**: No separate admin subdomain needed
7. **API-First**: Built-in REST API for programmatic access
8. **Multi-Schema Architecture**: Easy to fork and deploy per client
9. **Theme System**: Theme-tagged component library allows easy theme switching (modern, classic, minimal, etc.) while maintaining custom design flexibility
10. **Custom Design Per Project**: Each site is custom-designed with theme selection and global font/color palette controls
11. **Unified Design System**: Admin and public site share the same fonts and colors, with admin using a dark theme for distinction
12. **Developer-Centric Components**: Reusable component library approach with theme support, not visual page builder
13. **CI/CD Ready**: Designed for automated deployments and scalable maintenance
14. **Archive/Restore System**: Built-in project lifecycle management
15. **Membership Platform**: Built-in protected content system with membership groups

## Future Enhancements

- SEO tools and sitemap generation
- Analytics integration
- Content scheduling
- Multi-language support
- **Membership System:**
  - Payment integration for paid memberships
  - Subscription management and renewals
  - Member activity tracking and analytics
  - Automated membership expiration reminders
  - Member referral system
  - Member directory with privacy controls
- User roles and permissions refinement (additional admin roles)
- Advanced design system controls (spacing, border radius, shadows)
- Design system presets/templates for quick setup
- Component library documentation site
- Component versioning and changelog
- Automated backup scheduling for archives
- **AI Chatbot with RAG (Retrieval-Augmented Generation)**:
  - Custom AI chatbot powered by CMS content as knowledge base
  - RAG architecture using Supabase PGVector for vector search
  - Content indexing: posts, pages, galleries (descriptions), events, forms (descriptions)
  - Chat widget component for public-facing pages
  - Admin interface for chatbot configuration and training
  - Conversation history stored in Supabase
  - Integration with CRM/membership system
  - Support for protected content (membership-aware responses)

## AI Chatbot with RAG (Planned Feature)

### Overview

A custom AI-powered chatbot that uses the CMS content as a Retrieval-Augmented Generation (RAG) knowledge base. The chatbot answers user questions by retrieving relevant content from the site's posts, pages, galleries, events, and other CMS-managed content, then generating contextual responses using an LLM.

### Architecture

**RAG (Retrieval-Augmented Generation) System:**
- **Knowledge Base**: All CMS content (posts, pages, galleries, events, forms) serves as the training/knowledge source
- **Vector Database**: Supabase PGVector extension for storing and searching content embeddings
- **Embedding Generation**: Content is converted to vector embeddings (using OpenAI, Anthropic, or open-source models)
- **Retrieval**: User queries are embedded and matched against content vectors using similarity search
- **Generation**: LLM generates responses based on retrieved context + user query
- **Response**: Chatbot provides answers grounded in actual CMS content

### Content Indexing

**Indexed Content Types:**
- **Blog Posts**: Title, content (rich text), excerpt, metadata
- **Pages**: Title, content, metadata
- **Galleries**: Name, description, captions
- **Events**: Title, description, location, date information
- **Forms**: Name, description, field labels
- **Media**: Alt text, captions, descriptions

**Indexing Process:**
- Content is automatically indexed when created/updated
- Text content is extracted and chunked into manageable segments
- Embeddings are generated and stored in vector database
- Index is updated in real-time as content changes
- Admin can trigger manual re-indexing if needed

### Chatbot Features

**Public-Facing Chat Widget:**
- Embedded chat widget on public pages
- Responsive design matching site design system
- Conversation history (session-based)
- Typing indicators and smooth UX
- Optional: Chat history saved for logged-in members

**AI Capabilities:**
- Answers questions about site content
- Provides information about events, posts, galleries
- Can guide users to relevant content
- Understands context from conversation history
- Respects content access levels (public vs. member-only content)

**Membership-Aware Responses:**
- Can reference protected content if user has appropriate membership
- Redirects non-members to login/registration for protected content
- Understands membership tiers and access levels

### Admin Interface

**Chatbot Configuration** (`/admin/settings/chatbot`):
- Enable/disable chatbot
- Configure LLM provider (OpenAI, Anthropic, local model)
- Set system prompts and behavior
- Configure response style and tone
- Set conversation context window
- View conversation analytics

**Content Indexing Management**:
- View indexed content status
- Trigger manual re-indexing
- View embedding statistics
- Monitor index health
- Exclude specific content types from indexing

**Conversation Management**:
- View conversation history
- Link conversations to member profiles (if user logged in)
- Export conversations for analysis
- Moderate conversations (if needed)
- Train/improve responses based on feedback

### Technical Implementation

**Database Schema:**
```sql
-- Vector embeddings table (using PGVector)
CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'post', 'page', 'gallery', 'event', etc.
  content_id UUID NOT NULL, -- Reference to original content
  chunk_index INTEGER, -- For chunked content
  text_content TEXT NOT NULL, -- Original text chunk
  embedding vector(1536), -- Vector embedding (dimension depends on model)
  metadata JSONB, -- Additional metadata (title, url, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_content_type_id (content_type, content_id),
  INDEX idx_embedding USING ivfflat (embedding vector_cosine_ops) -- Vector similarity index
);

-- Chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL, -- Session identifier
  member_id UUID REFERENCES members(id) ON DELETE SET NULL, -- If user logged in
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_session_id (session_id),
  INDEX idx_member_id (member_id)
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  retrieved_context JSONB, -- References to content used in RAG
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_conversation_id (conversation_id)
);
```

**Integration Points:**
- **Content Updates**: Automatically re-index content when posts/pages are created/updated
- **Vector Search**: Use Supabase PGVector for similarity search
- **LLM Integration**: Connect to OpenAI, Anthropic, or self-hosted models
- **CRM Integration**: Link conversations to member profiles
- **Analytics**: Track conversation metrics and popular queries

### Benefits

- **Content-Driven**: Answers are always based on actual site content
- **Self-Improving**: As content is added/updated, chatbot knowledge improves
- **No External Knowledge Base**: CMS content IS the knowledge base
- **Cost-Effective**: Uses existing content, no separate content management needed
- **Integrated**: Deep integration with membership and CRM systems
- **Customizable**: Full control over behavior, responses, and training

### Implementation Considerations

**Phase Planning:**
- **Phase 1**: Basic RAG setup with content indexing
- **Phase 2**: Chat widget UI and basic conversation flow
- **Phase 3**: Membership-aware responses and CRM integration
- **Phase 4**: Advanced features (analytics, training, moderation)

**Dependencies:**
- Supabase PGVector extension enabled
- LLM provider API access (OpenAI, Anthropic, etc.)
- Embedding model access
- Vector similarity search implementation

**Cost Considerations:**
- LLM API costs (per query)
- Embedding generation costs (per content piece)
- Vector storage (minimal with Supabase)
- Hosting/infrastructure for chat widget

**Status**: Planned for future phase (after core CMS features are complete)