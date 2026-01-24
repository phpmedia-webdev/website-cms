# Planned Features & Future Enhancements

This document contains planned features and nice-to-have enhancements for the Website CMS project. These are features that are not part of the core MVP but are planned for future phases.

For the core product requirements and architecture, see [prd.md](./prd.md).

---

## Developer Workflow with Content Placeholders (Planned Feature)

### Overview

A comprehensive system enabling developers and clients to collaborate efficiently during site setup. Developers create placeholder content to design and build components while clients progressively complete those placeholders with real content. A dashboard checklist tracks all incomplete items, ensuring nothing is missed before launch.

### Problem Addressed

Currently, when launching a new site:
- Developer needs real content to design components
- Client is still deciding on content/images
- Hard to track what still needs completion
- No clear workflow for collaborative setup

This feature solves these challenges by enabling:
- Developers to create placeholders (Lorem Ipsum, dummy images)
- Seamless progression to real content without redesigning
- Clear visibility of completion status
- Collaborative setup workflow

### Features

**Placeholder Content Creation:**
- Create placeholder media items (with default thumbnail/placeholder image)
- Create placeholder posts and pages (with Lorem Ipsum text)
- Maintain full metadata structure (title, slug, description, tags, etc.)
- Mark items as "placeholder" for easy filtering and tracking
- Cannot be published - must be replaced with real content before launch

**Placeholder Usage in Components:**
- Components can use placeholder items during development
- Placeholder items have all the same properties as real content
- Full design/layout flexibility with placeholder data
- Seamless transition: replace placeholder with published content, layout stays the same

**Setup Checklist:**
- Dashboard widget showing all incomplete placeholder items
- Grouped by content type (Media, Posts, Pages, Forms, etc.)
- Item count and progress percentage
- Quick-link to edit each incomplete item
- Mark item complete when content is finalized and published
- Filter: "show only placeholders" toggle

**Status Tracking:**
- Each content item has `status: 'placeholder'` or `status: 'published'`
- Placeholder items hidden from public site (not published)
- Can have placeholder version and published version (separately tracked)
- Progress tracking: X of Y placeholder items completed
- Launch check: Site cannot be published while placeholder items remain

**Permissions:**
- Both developers and clients can create/edit placeholder items
- Both can complete placeholders (change from draft to published)
- Admin can see all items (draft + published)

### Technical Implementation

**Database Schema Updates:**

```sql
-- Add status column to content tables with 'placeholder' status
-- Placeholder = required content that MUST be completed before launch
-- Published = live content visible on site
ALTER TABLE website_cms_template_dev.posts ADD COLUMN IF NOT EXISTS
  status TEXT DEFAULT 'placeholder' CHECK (status IN ('placeholder', 'published', 'archived'));

ALTER TABLE website_cms_template_dev.pages ADD COLUMN IF NOT EXISTS
  status TEXT DEFAULT 'placeholder' CHECK (status IN ('placeholder', 'published', 'archived'));

ALTER TABLE website_cms_template_dev.media ADD COLUMN IF NOT EXISTS
  status TEXT DEFAULT 'placeholder' CHECK (status IN ('placeholder', 'published', 'archived'));

-- Create view for incomplete placeholder items (all content types)
CREATE OR REPLACE VIEW incomplete_placeholders AS
  SELECT 'post' as type, id, title, created_at FROM website_cms_template_dev.posts WHERE status = 'placeholder'
  UNION ALL
  SELECT 'page' as type, id, title, created_at FROM website_cms_template_dev.pages WHERE status = 'placeholder'
  UNION ALL
  SELECT 'media' as type, id, name as title, created_at FROM website_cms_template_dev.media WHERE status = 'placeholder'
  ORDER BY created_at ASC;

-- RPC to get setup checklist (placeholders that need completion)
CREATE OR REPLACE FUNCTION public.get_setup_checklist()
RETURNS TABLE (
  type TEXT,
  total_placeholder_count INTEGER,
  published_count INTEGER,
  items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.content_type,
    COUNT(*) FILTER (WHERE t.status = 'placeholder')::INTEGER as placeholder_count,
    COUNT(*) FILTER (WHERE t.status = 'published')::INTEGER as published,
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status,
        'is_placeholder', t.status = 'placeholder',
        'created_at', t.created_at
      )
    ) as items
  FROM (
    SELECT 'post'::TEXT as content_type, id, title, status, created_at FROM website_cms_template_dev.posts
    UNION ALL
    SELECT 'page'::TEXT as content_type, id, title, status, created_at FROM website_cms_template_dev.pages
    UNION ALL
    SELECT 'media'::TEXT as content_type, id, name as title, status, created_at FROM website_cms_template_dev.media
  ) t
  GROUP BY t.content_type;
END;
$$;
```

**Frontend Components:**

- **Setup Checklist Widget** (`/admin/dashboard`):
  - Summary card showing completion percentage
  - Grouped sections by content type
  - Item list with status badge
  - Quick-edit button (modal or link to editor)
  - "Mark Complete" button (updates status to published)

- **Content Editor Updates** (Posts, Pages, Media):
  - Status selector (Draft / Published)
  - Placeholder toggle (optional UI for "is_placeholder" flag)
  - Preview info: "This is draft content, not visible on site"

- **Dashboard Summary**:
  - "X items need completion" card
  - Progress bar showing % complete
  - Link to full checklist view

**API Endpoints:**

```sql
-- Get setup checklist summary (all placeholders that need completion)
GET /api/setup-checklist/summary
Response: {
  total_placeholders: 7,
  completed_count: 3,
  remaining_placeholders: 4,
  by_type: { posts: 2, pages: 1, media: 1 },
  site_ready_to_launch: false  // true only when remaining_placeholders = 0
}

-- Get detailed incomplete placeholders by type
GET /api/setup-checklist/placeholders?type=post
GET /api/setup-checklist/placeholders?type=page
GET /api/setup-checklist/placeholders?type=media

-- Replace placeholder with published content (completes checklist item)
POST /api/setup-checklist/[type]/[id]/complete
Payload: { status: 'published', ... }  // Update placeholder to published
```

**Placeholder Content Defaults:**

- **Placeholder Posts/Pages**: Use Lorem Ipsum body text
- **Placeholder Media**: Use default placeholder image (e.g., gray rectangle with text)
- **Titles/Slugs**: Developer provides (e.g., "Team Bio - Sarah", "Product Image - Feature")
- **Metadata**: Empty/optional until client fills in

### Workflow Example

1. **Dev starts new site from template**
   - Dashboard shows empty checklist
   - Standby page active (not published)

2. **Dev creates placeholder items**
   - Creates post: "Team Bio - Sarah" (placeholder status, Lorem Ipsum body)
   - Creates media: "Hero Image" (placeholder status, default placeholder image)
   - Creates page: "Services" (placeholder status, Lorem Ipsum content)
   - Creates form: "Contact Form" (placeholder status, placeholder fields)

3. **Dev builds components**
   - Uses placeholder posts in "Team Section" component
   - Uses placeholder media in "Gallery Component"
   - Designs and styles with placeholder content

4. **Dev shares with client**
   - Client sees dashboard with setup checklist
   - 4 placeholder items requiring completion before launch
   - Client progress: 0 of 4 completed

5. **Client fills in real content**
   - Client clicks "Team Bio - Sarah" → Opens editor
   - Client replaces Lorem Ipsum with real bio
   - Client uploads real photo (replaces placeholder image)
   - Client changes status from "placeholder" to "published"
   - Checklist updates: 1 of 4 completed

6. **Repeat for all placeholder items**
   - Client completes remaining placeholders
   - Checklist reaches 100%

7. **Launch**
   - All placeholder items completed (replaced with published content)
   - No remaining placeholders
   - Site marked ready to launch
   - Standby page removed, live site goes public

### Benefits

- **Parallel Work**: Dev and client work simultaneously
- **No Redesign**: Placeholder content seamlessly becomes real content
- **Progress Tracking**: Clear visibility of setup completion
- **Reduced Back-and-Forth**: Dev doesn't need to ask client for content
- **Professional Setup**: Structured onboarding process
- **Flexible**: Works for any content type

### Implementation Phases

**Phase 1: Status Tracking**
- Add `status` column to content tables
- Create RPC for incomplete items query
- Update editors to show/set status

**Phase 2: Setup Checklist Dashboard**
- Build checklist widget on dashboard
- Show incomplete items by type
- Quick-links to editors

**Phase 3: Placeholder Helpers**
- Placeholder image generation/defaults
- Lorem Ipsum text templates
- "Create placeholder" quick-action

**Phase 4: Analytics & Refinement**
- Track setup completion time
- Monitor which content types are bottlenecks
- Optional: Automated reminders for incomplete items

### Future Enhancements

- **Workflow Automation**: Automatically assign incomplete items to specific team members
- **Deadline Tracking**: Set target completion dates for placeholders
- **Notifications**: Notify team members of incomplete items
- **Bulk Actions**: Mark multiple items complete at once
- **Completion Reports**: Export setup progress report
- **Client Onboarding Guide**: Interactive tutorial showing placeholders → completion

### Access & Permissions

- **View Checklist**: Admin, Developer, Client role
- **Edit Placeholder Items**: Admin, Developer, Client role
- **Mark Complete**: Admin, Developer, Client role (any role can complete items)
- **View Details**: Can see all incomplete items in dashboard

### Integration Points

- Admin dashboard (checklist widget)
- Content editors (Posts, Pages, Media)
- Status tracking system (status column)
- Database queries (RPC functions for incomplete items)
- Supabase storage (placeholder image defaults)

**Status**: Planned nice-to-have feature for future phase (after Media Library is complete)

---

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
- **Color Palette Promotion System**: Superadmin can promote exceptional client-created palettes to the global preset library
- **AI Chatbot with RAG (Retrieval-Augmented Generation)**:
  - Custom AI chatbot powered by CMS content as knowledge base
  - RAG architecture using Supabase PGVector for vector search
  - Content indexing: posts, pages, galleries (descriptions), events, forms (descriptions)
  - Chat widget component for public-facing pages
  - Admin interface for chatbot configuration and training
  - Conversation history stored in Supabase
  - Integration with CRM/membership system
  - Support for protected content (membership-aware responses)

---

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
- **Pages**: Title, content (rich text), metadata (all static pages including homepage)
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

---

## Digital Business Card Feature (Planned Feature)

### Overview

A digital business card (digicard) system that allows admins to create and manage profiles for themselves and their team members. Each team member receives a progressive web app (PWA) digicard that can be shared and allows recipients to download contact information directly to their mobile devices.

### Features

**Admin Management:**
- Admins can create and modify profiles for themselves and team members
- Profile management interface in admin dashboard
- Support for multiple team members per organization
- Profile fields: name, title, company, contact information, social links, bio, photo

**Digital Business Cards (Digicards):**
- Each team member has a unique digicard accessible via shareable URL
- Progressive Web App (PWA) functionality for mobile installation
- Responsive design optimized for mobile and desktop viewing
- Customizable appearance (branded with organization's design system)

**Sharing Capabilities:**
- Shareable links for easy distribution
- QR code generation for each digicard
- Social media sharing integration
- Email sharing with pre-filled contact information

**Contact Information Download:**
- One-tap download of contact information to mobile devices
- vCard (.vcf) format support for iOS and Android
- Direct integration with device contacts app
- Cross-platform compatibility

### Technical Implementation

**Database Schema:**
```sql
-- Team member profiles
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL, -- References client schema
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  photo_url TEXT,
  social_links JSONB, -- {linkedin, twitter, github, etc.}
  digicard_slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_digicard_slug (digicard_slug)
);

-- Digicard views/analytics (optional)
CREATE TABLE digicard_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  INDEX idx_team_member_id (team_member_id),
  INDEX idx_viewed_at (viewed_at)
);
```

**PWA Implementation:**
- Service worker for offline functionality
- Web app manifest for mobile installation
- App icons and splash screens
- Push notifications (optional, for future enhancements)

**API Endpoints:**
- `GET /api/digicard/[slug]` - Public digicard view
- `GET /api/digicard/[slug]/vcard` - Download vCard
- `POST /api/admin/team-members` - Create team member
- `PUT /api/admin/team-members/[id]` - Update team member
- `DELETE /api/admin/team-members/[id]` - Delete team member

### Benefits

- **Professional Networking**: Easy way to share contact information at events, meetings, or online
- **Brand Consistency**: Digicards use organization's design system and branding
- **Mobile-First**: Optimized for mobile devices with PWA capabilities
- **Contact Management**: Recipients can instantly save contact information to their devices
- **Analytics**: Track digicard views and engagement (optional)
- **Cost-Effective**: Digital alternative to physical business cards

### Implementation Considerations

**Phase Planning:**
- **Phase 1**: Basic profile creation and digicard display
- **Phase 2**: PWA functionality and mobile optimization
- **Phase 3**: Sharing capabilities and QR code generation
- **Phase 4**: Contact download (vCard) and analytics

**Dependencies:**
- Design system integration for branded appearance
- PWA service worker implementation
- vCard generation library
- QR code generation library
- Image upload/storage for team member photos

**Design Considerations:**
- Responsive layout for all screen sizes
- Fast loading times for mobile networks
- Accessible design (WCAG compliance)
- Customizable templates for different industries/roles

**Status**: Nice-to-have feature for future phase (after core CMS features are complete)

---

## Customizable Banner Component (Planned Feature)

### Overview

A flexible banner system that allows tenant admins to create and manage announcement banners for important messages such as holiday announcements, sales promotions, system maintenance notices, or other time-sensitive communications. The banner component automatically collapses and disappears when no active banner is configured, ensuring a clean UI when not in use.

### Features

**Banner Management:**
- Tenant admins can create, edit, and delete banners
- Support for multiple banner types (info, warning, success, promotion)
- Rich text content support with basic formatting
- Optional call-to-action (CTA) button with custom link
- Image/icon support for visual enhancement

**Display Control:**
- Banners automatically collapse and disappear when no active banner exists
- Conditional display based on page selection (homepage, specific pages, all pages)
- Date-based scheduling (start date, end date)
- Priority system for multiple active banners (show highest priority)
- Dismissible banners with user preference storage (optional)

**Customization:**
- Color scheme integration with design system
- Customizable banner styles (top bar, bottom bar, modal overlay)
- Responsive design for mobile and desktop
- Animation options (slide-in, fade-in, etc.)

### Technical Implementation

**Database Schema:**
```sql
-- Banners table
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL, -- References client schema
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Rich text content
  banner_type TEXT NOT NULL CHECK (banner_type IN ('info', 'warning', 'success', 'promotion', 'custom')),
  style_config JSONB, -- Custom styling options
  cta_text TEXT, -- Call-to-action button text
  cta_link TEXT, -- Call-to-action button URL
  image_url TEXT, -- Optional banner image/icon
  display_location TEXT NOT NULL DEFAULT 'top', -- 'top', 'bottom', 'modal'
  page_targets JSONB, -- Array of page paths or 'all' for all pages
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  is_dismissible BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_is_active (is_active),
  INDEX idx_dates (start_date, end_date)
);

-- User banner dismissals (optional, for dismissible banners)
CREATE TABLE banner_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID REFERENCES banners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(banner_id, user_id),
  INDEX idx_banner_id (banner_id),
  INDEX idx_user_id (user_id)
);
```

**Component Structure:**
- Banner component in public layout (conditionally rendered)
- Admin interface for banner management (`/admin/banners`)
- Banner preview in admin dashboard
- API endpoints for banner CRUD operations

**API Endpoints:**
- `GET /api/banners` - Get active banners for current page (public)
- `GET /api/admin/banners` - List all banners (admin)
- `POST /api/admin/banners` - Create banner (admin)
- `PUT /api/admin/banners/[id]` - Update banner (admin)
- `DELETE /api/admin/banners/[id]` - Delete banner (admin)
- `POST /api/banners/[id]/dismiss` - Dismiss banner (user preference, optional)

**Display Logic:**
- Query active banners filtered by:
  - `is_active = true`
  - Current date between `start_date` and `end_date` (if set)
  - Current page path matches `page_targets` or `page_targets` contains 'all'
  - User hasn't dismissed (if dismissible and user logged in)
- Sort by priority (highest first)
- Display highest priority banner if multiple active

### Benefits

- **Flexible Communication**: Easy way to communicate important messages to site visitors
- **Time-Sensitive Promotions**: Support for date-based scheduling of sales, events, announcements
- **Clean UI**: Automatic collapse when no banner active, no empty space
- **Brand Consistency**: Integrates with design system for consistent appearance
- **User Control**: Optional dismissible banners respect user preferences
- **Targeted Messaging**: Display banners on specific pages or site-wide

### Implementation Considerations

**Phase Planning:**
- **Phase 1**: Basic banner creation and display (top bar, simple text)
- **Phase 2**: Rich text content, CTA buttons, image support
- **Phase 3**: Page targeting, date scheduling, priority system
- **Phase 4**: Dismissible banners, user preferences, analytics

**Dependencies:**
- Design system integration for styling
- Rich text editor component (if not already available)
- Image upload/storage for banner images
- Date/time handling for scheduling
- Page routing system for page targeting

**Design Considerations:**
- Non-intrusive placement (top or bottom of page)
- Accessible design (ARIA labels, keyboard navigation)
- Mobile-responsive layout
- Smooth animations for show/hide
- Clear visual hierarchy (doesn't compete with main content)

**Integration Points:**
- Public layout component (conditional rendering)
- Admin dashboard (banner management UI)
- Design system (color schemes, typography)
- User authentication (for dismissible banners)

**Status**: Nice-to-have feature for future phase (after core CMS features are complete)

---

## Color Palette Promotion System (Planned Feature)

### Overview

A superadmin feature that allows exceptional client-created color palettes to be promoted to the global preset library. This enables the platform to curate and share high-quality palettes across all client deployments, enriching the template with community-contributed designs while maintaining attribution to the original creator.

### Features

**Superadmin Palette Management:**
- Browse custom palettes across all client schemas
- View palette details (all 15 colors, tags, creation date, client name)
- Preview palettes before promotion
- Edit name/description/tags before promoting (optional)
- Promote palettes to global preset library with one click
- Track promotion history and attribution

**Promotion Workflow:**
- Superadmin reviews custom palettes from any client
- System copies palette from client schema to `public.color_palettes`
- Original palette remains in client's schema (no data loss)
- Promoted palette becomes available to all clients as a preset
- Metadata tracks which client created it and who promoted it

**Attribution & Metadata:**
- Track original client/schema
- Record superadmin who promoted it
- Promotion timestamp
- Original palette reference (optional)
- Optional tags like "community" or "featured"

### Technical Implementation

**Database Schema Enhancement:**
```sql
-- Add metadata columns to public.color_palettes for promoted palettes
ALTER TABLE public.color_palettes ADD COLUMN IF NOT EXISTS
  created_by_client TEXT,        -- Which client schema created it (e.g., "client_abc123")
  promoted_by UUID,              -- Superadmin user ID who promoted it
  promoted_at TIMESTAMPTZ,       -- When it was promoted
  original_palette_id UUID,      -- Reference to original custom palette (optional)
  promotion_notes TEXT;          -- Optional notes about why it was promoted
```

**RPC Function:**
```sql
-- Promote a custom palette from client schema to global preset library
CREATE OR REPLACE FUNCTION public.promote_palette_to_global(
  source_schema TEXT,
  palette_id UUID,
  promoted_by_user_id UUID,
  new_name TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_tags TEXT[] DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promoted_id UUID;
  source_palette RECORD;
BEGIN
  -- Fetch palette from source schema
  EXECUTE format('
    SELECT id, name, description, colors, tags, created_at
    FROM %I.color_palettes
    WHERE id = $1
  ', source_schema) INTO source_palette USING palette_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Palette not found in schema %', source_schema;
  END IF;
  
  -- Insert into public.color_palettes
  INSERT INTO public.color_palettes (
    name,
    description,
    colors,
    is_predefined,
    tags,
    created_by_client,
    promoted_by,
    promoted_at,
    original_palette_id
  ) VALUES (
    COALESCE(new_name, source_palette.name),
    COALESCE(new_description, source_palette.description),
    source_palette.colors,
    true, -- Mark as predefined
    COALESCE(new_tags, source_palette.tags),
    source_schema,
    promoted_by_user_id,
    NOW(),
    source_palette.id
  ) RETURNING id INTO promoted_id;
  
  RETURN promoted_id;
END;
$$;
```

**Superadmin UI:**
- New section in `/admin/super/palettes` or `/admin/super/color-palettes`
- Browse interface showing custom palettes from all client schemas
- Filter by client, date, tags
- Preview modal showing all 15 colors
- Promotion form with optional name/description/tag editing
- Confirmation dialog before promotion
- Success notification with link to promoted palette

**Query Function:**
```sql
-- Get all custom palettes across all client schemas (for superadmin browsing)
CREATE OR REPLACE FUNCTION public.get_all_custom_palettes()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  colors JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  client_schema TEXT,
  client_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Query all client schemas for custom palettes
  -- This would iterate through known client schemas
  -- Implementation depends on schema discovery method
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.description,
    cp.colors,
    cp.tags,
    cp.created_at,
    'client_schema_name'::TEXT as client_schema,
    'Client Name'::TEXT as client_name
  FROM client_schema_name.color_palettes cp
  WHERE cp.is_predefined = false
  ORDER BY cp.created_at DESC;
END;
$$;
```

### Benefits

- **Curated Library**: Only exceptional palettes become global presets
- **Community Contribution**: Clients can contribute to the platform
- **Attribution**: Track which client created each promoted palette
- **Quality Control**: Superadmin reviews before promotion
- **Client Recognition**: Recognition for creating exceptional designs
- **Template Enrichment**: Global library grows over time with quality additions
- **No Data Loss**: Original custom palette remains in client's schema

### Implementation Considerations

**Phase Planning:**
- **Phase 1**: Superadmin UI to browse custom palettes across schemas
- **Phase 2**: Promotion function and metadata tracking
- **Phase 3**: Enhanced filtering, search, and preview features
- **Phase 4**: Optional client submission system ("submit for review")

**Dependencies:**
- Superadmin access system (already exists)
- Cross-schema query capability
- Palette preview component (already exists)
- Metadata tracking in `public.color_palettes`

**Access Control:**
- Only superadmin users can promote palettes
- Regular admins cannot promote their own palettes
- Read-only access to other clients' custom palettes for superadmin

**Naming Conflicts:**
- Check if palette name already exists in global library
- Auto-rename with suffix or prompt superadmin to rename
- Prevent duplicate promotions of same palette

**Versioning:**
- If client updates their custom palette, global version doesn't auto-update
- Superadmin can promote updated version as new entry if desired
- Original promotion remains in history

### Future Enhancements

- **Client Submission System**: Clients can "submit for review" to request promotion
- **Voting/Rating System**: Track which promoted palettes are most popular across clients
- **Categories**: "Featured", "Community", "Professional", etc. for promoted palettes
- **Analytics**: Track usage of promoted palettes across all client deployments
- **Bulk Promotion**: Promote multiple palettes at once
- **Promotion Reversal**: Ability to remove promoted palettes (with audit trail)

### Integration Points

- Superadmin dashboard (`/admin/super`)
- Global palette library (`public.color_palettes`)
- Client schema palette tables (`{client_schema}.color_palettes`)
- Palette preview component (reuse existing modal)
- User authentication (superadmin role check)

**Status**: Nice-to-have feature for future phase (after core CMS features are complete)
