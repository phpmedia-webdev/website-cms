# Supabase Custom Schema Setup

## Issue

Supabase's PostgREST API doesn't support custom schemas via the `db.schema` client option. When using custom schemas (like `website_cms_template_dev`), you must expose them to PostgREST.

**Important**: When a schema is exposed, PostgREST searches all exposed schemas for table names. Use just the table name (e.g., `"settings"`) in queries - do NOT use `schema.table` format, as PostgREST will incorrectly interpret it as `public.schema.table`.

## Solution: Expose Custom Schema to PostgREST

### Step 1: Expose Schema in Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Settings** → **API** → **Exposed Schemas**
4. Add your custom schema name (e.g., `website_cms_template_dev`) to the list
5. Save changes
6. The schema cache will refresh automatically

### Step 2: Grant Permissions to API Roles

**Important**: Exposing the schema isn't enough - you must also grant permissions!

Run the migration script: `supabase/migrations/004_expose_schema_permissions.sql`

Or manually run these SQL commands in the Supabase SQL Editor:

```sql
-- Grant USAGE on the schema
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON SCHEMA website_cms_template_dev TO authenticated;

-- Grant permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO authenticated;

-- Grant permissions on sequences (for auto-increment IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
  GRANT USAGE ON SEQUENCES TO anon, authenticated;
```

**Note**: Replace `website_cms_template_dev` with your actual schema name.

## Alternative: Use Public Schema

If you prefer to keep everything in the `public` schema:
- Move all tables from your custom schema to `public`
- Update `NEXT_PUBLIC_CLIENT_SCHEMA` to `public` (or remove it)
- This is simpler but loses schema isolation

## Current Setup

- Custom schema: `website_cms_template_dev` (from `NEXT_PUBLIC_CLIENT_SCHEMA`)
- Tables are in the custom schema
- Schema must be exposed to PostgREST for queries to work

## Step 3: Refresh PostgREST Schema Cache

After exposing the schema and granting permissions, refresh the PostgREST cache:

Run this in Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

Or restart your Supabase project from the dashboard.

## Verification

After completing all steps, test by:
1. Restart your dev server
2. Visit `http://localhost:3000`
3. Check browser console - settings queries should work
4. Verify design system loads from database

## Troubleshooting

If you still see errors after exposing the schema and granting permissions:

1. **Verify schema is exposed**: Check Dashboard → Settings → API → Exposed Schemas
2. **Verify permissions**: Run this query to check:
   ```sql
   SELECT grantee, privilege_type, table_name 
   FROM information_schema.table_privileges 
   WHERE table_schema = 'website_cms_template_dev' 
     AND grantee IN ('anon', 'authenticated')
     AND table_name = 'settings';
   ```
3. **Refresh schema cache**: Run `NOTIFY pgrst, 'reload schema';`
4. **Check table exists**: Verify the settings table exists in your schema
5. **Check server logs**: Look at the detailed error message in the server console (not browser console)
