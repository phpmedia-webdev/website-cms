# Headless CMS - Product Requirements Document

## Project Overview

A WordPress-style CMS application built with Next.js 15, designed as a lightweight alternative to WordPress focused on essential features for basic business websites. The application serves both as the public-facing website and the content management system in a single deployment. Each client instance is cloneable and deployed separately on Vercel but shares a single Supabase project using separate schemas for data isolation.

**Goal**: Create a WordPress killer replacement that narrows down to just the essentials for a basic business website - simpler, faster, and easier to use than WordPress while maintaining similar functionality.

## Technology Stack

- **Frontend/App Framework:** Next.js 15 with App Router
- **Language:** TypeScript 5
- **Development Environment:** Cursor IDE
- **Version Control:** GitHub
- **Backend/Database:** Supabase (PostgreSQL with multi-schema architecture)
- **Authentication:** Supabase Auth (native multi-tenant support)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Rich Text Editor:** Tiptap
- **Form Builder:** Custom React DnD implementation
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
- `/login` - Member login/registration
- `/register` - Member registration (or combined with /login)
- `/members` - Member dashboard (protected)
- `/members/profile` - Member profile page (protected)
- `/members/account` - Account settings (protected)
- Other public pages as needed

**Admin Routes (Protected):**
- `/admin` - Redirects to `/admin/dashboard` or `/admin/login`
- `/admin/login` - Admin login page
- `/admin/dashboard` - Dashboard home
- `/admin/posts` - Blog post management
- `/admin/galleries` - Gallery management
- `/admin/media` - Media library
- `/admin/forms` - Form builder and submissions
- `/admin/memberships` - Membership group management
- `/admin/members` - Member user management
- `/admin/members/[id]` - View member details and memberships
- `/admin/settings` - Site settings (including design system: fonts and color palette)
- `/admin/settings/archive` - Archive/restore project management
- `/admin/settings/reset` - Reset content to template state

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
- Each deployment = separate GitHub repository clone (or branch)
- Shared Supabase project with schema isolation
- Single domain deployment: `clientdomain.com` (no subdomain needed)
- Admin access via `/admin` route (discreet login link in footer)

### Developer-Centric Component Architecture

The application uses a **developer-centric component library approach** rather than a visual page builder. This provides maximum flexibility and maintainability.

#### Component Library System

**Reusable Component Library:**
- Components are built as React/TypeScript components in the codebase
- Stored in `src/components/public/` directory structure
- Components are themeable via CSS variables from the design system
- Library grows over time as reusable patterns are identified
- Components can be shared across all client projects

**Component Structure:**
```
src/components/public/
├── sections/              # Reusable page sections
│   ├── Hero.tsx          # Hero section (uses design system)
│   ├── TextBlock.tsx     # Text content block
│   ├── ImageBlock.tsx    # Image with caption
│   ├── GalleryBlock.tsx  # Embedded gallery display
│   ├── FormBlock.tsx     # Embedded form
│   ├── CTASection.tsx    # Call-to-action section
│   └── ...               # Growing library of reusable sections
├── pages/                # Full page-level components
│   ├── HomePage.tsx      # Homepage composition
│   ├── AboutPage.tsx     # About page template
│   └── ContactPage.tsx   # Contact page template
└── layout/               # Layout components
    ├── Header.tsx        # Site header (customizable per project)
    ├── Footer.tsx        # Site footer
    └── Navigation.tsx    # Navigation menu
```

**Design System Integration:**
- Components consume global font and color settings via CSS variables
- Design system values stored in database (settings table)
- Applied dynamically via CSS custom properties
- Components automatically inherit themeable properties
- Example: `var(--font-heading)`, `var(--color-primary)`, etc.

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
- Add new clients by cloning repository
- Create new schema per client
- Share component library across all deployments
- Independent versioning per client project
- Easy rollbacks via Git/Vercel

#### New Client Setup Workflow

1. Clone repository template
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
- Image optimization

### 4. Forms
- Visual form builder (drag-and-drop fields)
- Field types: text, email, phone, textarea, select, checkbox
- Form submission storage in database
- Lightweight CRM view for submissions
- Status tracking (new, contacted, archived)
- Export capabilities (CSV)
- Notes and follow-up tracking

### 5. Membership Platform

A protected content system allowing members-only access to content, pages, and resources. Supports multiple membership groups/tiers with different access levels.

**Membership Groups (Access Groups):**
- Named membership tiers (e.g., "Basic", "Premium", "VIP", "Enterprise")
- Hierarchical tier levels (numeric tier for access comparison)
- Description and benefits for each group
- Unlimited membership groups per client
- Group-specific access permissions

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
- Membership management in admin
- Member directory (optional, admin-configurable)
- Membership expiration tracking
- Subscription/renewal tracking (optional, for future payment integration)

**Admin Management:**
- Create and manage membership groups
- Assign members to groups
- View all members and their group assignments
- Member status management (activate, suspend, remove)
- View member activity and access history (future enhancement)

## Design System & Branding

### Custom Design Per Project

Unlike WordPress, this CMS does not use theme templates. Each project is custom-designed per client requirements. However, the CMS provides global design system controls accessible from the admin settings.

### Font & Color Palette Management

The admin settings include a **Design System** section (`/admin/settings`) that allows configuration of:

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

### Admin Interface Styling

The admin area uses the **same design system** (fonts and colors) as the public site, but with a **dark theme** to provide visual distinction between the public website and the admin interface. This ensures:
- Consistent branding experience
- Clear visual separation (dark admin vs. light public site)
- Same typography and color palette, different theme application
- Professional, cohesive appearance

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

**Admin Roles** (for CMS access):
- `admin` - Full access to all CMS features and settings
- `editor` - Can create and edit content, but cannot manage settings
- `viewer` - Read-only access to CMS
- Additional roles can be added as needed (stored in `user_metadata.role`)

**Member Users** (for public site access):
- Separate authentication from admin users
- No CMS access
- Access controlled via membership groups
- Type stored in `user_metadata.type = "member"`
- Can belong to multiple membership groups simultaneously

**Distinction:**
- **Roles**: Admin user permissions within the CMS (who can edit content)
- **Membership Groups**: Member access levels for protected content (what content members can view)
- Admin users are for content management; member users are for consuming protected content

### Multi-Tenant Authentication Strategy

Since all clients share a single Supabase project but use separate schemas, authentication works as follows:

1. **User Metadata**: Each user in Supabase Auth has metadata containing:
   - `tenant_id`: The client schema they have access to (e.g., `client_abc123`)
   - `role`: User role within that tenant (admin, editor, viewer)
   - `allowed_schemas`: Array of schemas user can access (for cross-tenant admins if needed)

2. **Schema Association**: When a user logs in, their `tenant_id` from metadata is matched with the `NEXT_PUBLIC_CLIENT_SCHEMA` environment variable to ensure they can only access their designated schema.

3. **Access Control**: 
   - Middleware validates user session and checks tenant association
   - Database queries are automatically scoped to the correct schema
   - Users cannot access data from other client schemas

### Authentication Flow

1. User visits `/admin/login`
2. Enters email/password or uses OAuth
3. Supabase Auth validates credentials
4. User metadata is checked for `tenant_id` matching the deployment's schema
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

## Membership System Architecture

### Dual Authentication System

The application supports two distinct user types using Supabase Auth:

1. **Admin Users** - Access CMS at `/admin/*`
   - Stored in Supabase Auth with `user_metadata.type = "admin"` (or absent)
   - Have `user_metadata.tenant_id` and `user_metadata.role`
   - Authenticate at `/admin/login`
   - Manage content and site settings

2. **Member Users** - Access protected content on public site
   - Stored in Supabase Auth with `user_metadata.type = "member"`
   - Have `user_metadata.tenant_id` (for multi-tenant isolation)
   - Authenticate at `/login` or `/register`
   - Profile stored in `members` table in client schema
   - Can belong to multiple membership groups

### Membership Groups vs Roles

**Roles** (Admin Users):
- Define what CMS features a user can access
- Set in `user_metadata.role` (admin, editor, viewer, and more)
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, membership_group_id)
);
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

3. **Admin Dashboard**:
   - Membership statistics (total members, by group)
   - Recent member registrations
   - Membership activity overview

4. **API Endpoints**:
   - Member authentication endpoints
   - Protected content endpoints with membership validation
   - Member profile endpoints

## API Endpoints

Public REST API endpoints (optional, for programmatic access):
- `GET /api/posts` - List published posts (pagination, search)
- `GET /api/posts/[id]` - Get single post by ID or slug
- `GET /api/galleries` - List all galleries
- `GET /api/galleries/[id]` - Get gallery with items by ID or slug
- `GET /api/media/[id]` - Get media item details
- `POST /api/forms/[formId]/submit` - Submit form data

All API endpoints include:
- Rate limiting (100 requests per minute)
- Response caching headers
- JSON responses

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

1. Clone the repository for each client
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_CLIENT_SCHEMA` - Unique schema name for this client (e.g., `client_abc123`)
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (includes auth capabilities)
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)
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
│   │   │   ├── forms/         # Form builder
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
│   │   ├── forms/             # Form components
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
1. Clone repository from template
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
8. **Multi-Schema Architecture**: Easy to clone and deploy per client
9. **Custom Design Per Project**: No theme system - each site is custom-designed, with global font and color palette controls
10. **Unified Design System**: Admin and public site share the same fonts and colors, with admin using a dark theme for distinction
11. **Developer-Centric Components**: Reusable component library approach, not visual page builder
12. **CI/CD Ready**: Designed for automated deployments and scalable maintenance
13. **Archive/Restore System**: Built-in project lifecycle management
14. **Membership Platform**: Built-in protected content system with membership groups

## Future Enhancements

- SEO tools and sitemap generation
- Analytics integration
- Email notifications for form submissions
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