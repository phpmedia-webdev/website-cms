# Client Setup Checklist

This checklist guides you through setting up a new client deployment from the template.

## Prerequisites

- Template repository cloned/deployed
- Supabase project access
- Vercel account (or hosting platform)
- Client schema name decided (e.g., `client_acme_corp`)
- Environment variables configured (`.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## Quick Start: Automated Setup (Recommended)

**Use the automated script for fastest setup:**

```bash
pnpm setup-client <schema-name>
```

**Or directly:**
```bash
pnpm tsx scripts/setup-client-schema.ts <schema-name>
```

**Example:**
```bash
pnpm setup-client client_acme_corp
```

**What it does:**
- ✅ Creates the schema
- ✅ Runs all migrations (with schema name replacement)
- ✅ Grants permissions
- ✅ Creates RPC functions
- ✅ Inserts default settings
- ✅ Enables RLS and policies
- ✅ Creates storage bucket
- ✅ Refreshes PostgREST cache

**After running the script:**
1. Expose schema in Supabase Dashboard (Step 3 below)
2. Set environment variables (Step 5 below)
3. Create superadmin user (Step 6 below)
4. Deploy application (Step 7 below)

**Note**: The script uses `exec_sql` RPC which may not be available in all Supabase projects. If the script fails, use the manual steps below.

---

## Manual Setup (If Automated Script Fails)

### Step 1: Create Client Schema in Supabase

1. Open Supabase Dashboard → SQL Editor
2. Run the schema creation script:

```sql
-- Replace 'client_acme_corp' with your actual client schema name
CREATE SCHEMA IF NOT EXISTS client_acme_corp;
```

**Note**: Schema names must use underscores, not hyphens (e.g., `client_acme_corp` not `client-acme-corp`)

---

## Step 2: Run Core Migrations

Run these migrations in order in Supabase SQL Editor, **replacing `website_cms_template_dev` with your client schema name**:

### 2.1: Create Tables
- **File**: `supabase/migrations/000_create_schema_and_tables.sql`
- **Action**: Replace `website_cms_template_dev` with your client schema name
- **Run**: Copy entire file, replace schema name, execute

### 2.2: Grant Permissions
- **File**: `supabase/migrations/004_expose_schema_permissions.sql`
- **Action**: Replace `website_cms_template_dev` with your client schema name
- **Run**: Copy entire file, replace schema name, execute

### 2.3: Create RPC Functions
- **File**: `supabase/migrations/008_create_settings_rpc.sql`
- **Action**: Replace `website_cms_template_dev` with your client schema name (in 3 places: SET search_path and FROM clauses)
- **Run**: Copy entire file, replace schema name, execute
- **Note**: These functions are schema-specific. You need to create them for each client schema.
- **Alternative**: See `008b_create_dynamic_settings_rpc.sql` for dynamic functions (requires code changes)

### 2.4: Insert Default Settings
- **File**: `supabase/migrations/009_insert_default_settings.sql`
- **Action**: Replace `website_cms_template_dev` with your client schema name
- **Run**: Copy entire file, replace schema name, execute

### 2.5: Enable RLS and Create Policies
- **File**: `supabase/migrations/010_enable_rls_and_policies.sql`
- **Action**: Replace `website_cms_template_dev` with your client schema name (in all ALTER TABLE and CREATE POLICY statements)
- **Run**: Copy entire file, replace schema name, execute
- **Note**: This satisfies Supabase security requirements for exposed schemas

### 2.6: Fix Function Search Path
- **File**: `supabase/migrations/011_fix_function_search_path.sql`
- **Action**: Replace `website_cms_template_dev` with your client schema name
- **Run**: Copy entire file, replace schema name, execute
- **Note**: Fixes security warning about mutable search_path

---

## Step 3: Expose Schema in Supabase Dashboard

1. Go to Supabase Dashboard → **Settings** → **API** → **Exposed Schemas**
2. Add your client schema name (e.g., `client_acme_corp`)
3. Click **Save**
4. Refresh PostgREST cache:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

## Step 4: Create Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Create a new bucket named: `client-{schema_name}` (e.g., `client-client_acme_corp`)
3. Set bucket to **Public** (if needed for media)
4. Configure CORS if needed

---

## Step 5: Configure Environment Variables

Set these in your deployment platform (Vercel, etc.):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_CLIENT_SCHEMA=client_acme_corp
NEXT_PUBLIC_APP_URL=https://clientdomain.com
NEXT_PUBLIC_SITE_NAME=Client Site Name
```

---

## Step 6: Create Superadmin User

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Create a new user (or use existing)
3. Update user metadata using the script:

```sql
-- Replace values with actual user ID and schema
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'type', 'superadmin',
  'role', 'superadmin',
  'tenant_id', 'client_acme_corp',
  'allowed_schemas', ARRAY['client_acme_corp']
)
WHERE id = 'user-uuid-here';
```

Or use the script: `scripts/update-user-metadata.ts`

---

## Step 7: Deploy Application

1. Push code to repository
2. Deploy to Vercel (or your platform)
3. Set environment variables in deployment platform
4. Verify deployment is live

---

## Step 8: Verify Setup

### 8.1: Test Authentication
- Visit `https://clientdomain.com/admin/login`
- Login with superadmin credentials
- Verify dashboard loads

### 8.2: Test Design System
- Check browser console for errors
- Verify CSS variables are loading
- Check Google Fonts are loading

### 8.3: Test Database Access
- Try creating a blog post
- Upload media
- Verify data is in correct schema

---

## Step 9: Post-Setup Configuration

1. **Configure Design System** (Admin → Settings)
   - Set fonts
   - Set color palette
   - Set site name/description

2. **Configure Third-Party Integrations** (Superadmin → Integrations)
   - Google Analytics
   - VisitorTracking.com
   - SimpleCommenter.com

3. **Set Up 2FA** (Admin → Settings → Security)
   - Enroll TOTP authenticator
   - Test login flow

---

## Troubleshooting

### Schema Not Found Errors
- Verify schema is exposed in Dashboard → Settings → API → Exposed Schemas
- Run: `NOTIFY pgrst, 'reload schema';`
- Check permissions were granted (Step 2.2)

### Settings Not Loading
- Verify RPC functions exist: `SELECT * FROM get_settings(ARRAY['design_system.theme']);`
- Check settings table has data: `SELECT * FROM {schema}.settings;`
- Verify schema name in environment variables matches actual schema

### Authentication Issues
- Verify user metadata is set correctly (Step 6)
- Check middleware is allowing routes
- Verify Supabase keys are correct

---

## Quick Reference: Schema Name Replacement

When setting up a new client, you need to replace `website_cms_template_dev` with your client schema name in:

1. `000_create_schema_and_tables.sql` - All table references (search & replace)
2. `004_expose_schema_permissions.sql` - Schema name in GRANT statements (1 place)
3. `008_create_settings_rpc.sql` - Schema name in:
   - `SET search_path = website_cms_template_dev, public` (3 places)
   - `FROM website_cms_template_dev.settings` (3 places)
4. `009_insert_default_settings.sql` - Schema name in INSERT statements (1 place)
5. `010_enable_rls_and_policies.sql` - Schema name in:
   - `ALTER TABLE website_cms_template_dev.*` (8 places)
   - `ON website_cms_template_dev.*` (8 places in CREATE POLICY)
6. Environment variable: `NEXT_PUBLIC_CLIENT_SCHEMA`

**Pro Tip**: Use your editor's "Find and Replace" feature to replace all instances at once.

---

## Automation Ideas (Future)

Consider creating:
- CLI script to automate schema creation
- Migration script that accepts schema name as parameter
- Setup wizard in superadmin panel
- Template deployment script

---

## Notes

- Each client gets their own isolated schema
- RPC functions are created per schema (or can be made dynamic)
- Storage buckets are per client
- Environment variables are per deployment
- Superadmin users can access multiple schemas via `allowed_schemas` metadata

---

## Adding New Tables After Initial Setup

**IMPORTANT:** When adding new tables after the initial schema setup, PostgREST may not find them even if the schema is exposed. 

**Solution:** Use RPC functions in the `public` schema (same approach as `settings` and `color_palettes`).

**See:** `docs/ADDING_NEW_TABLES.md` for complete guide and checklist.

**Quick Checklist:**
1. Create table migration with permissions
2. Enable RLS and create policies
3. **Create RPC functions in `public` schema** (CRITICAL)
4. Use RPC functions in TypeScript (`.rpc()` not `.from()`)
5. Test write operations with `.from()` first, create RPC if needed
