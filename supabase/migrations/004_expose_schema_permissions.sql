-- Migration: Grant permissions for custom schema to Supabase API roles
-- This allows PostgREST to access tables in the custom schema
-- Run this in Supabase SQL Editor AFTER exposing the schema in Dashboard → Settings → API → Exposed Schemas

-- Replace 'website_cms_template_dev' with your actual schema name
-- Or use the schema name from your NEXT_PUBLIC_CLIENT_SCHEMA environment variable

-- Step 1: Grant USAGE on the schema to API roles (anon and authenticated)
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON SCHEMA website_cms_template_dev TO authenticated;

-- Step 2: Grant SELECT, INSERT, UPDATE, DELETE on all existing tables in the schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO authenticated;

-- Step 3: Grant USAGE on all sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO authenticated;

-- Step 4: Set default privileges for future tables (optional but recommended)
-- This ensures new tables created in the schema will automatically have permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
  GRANT USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
  GRANT USAGE ON SEQUENCES TO authenticated;

-- Verify permissions (optional - run to check)
-- SELECT 
--   grantee, 
--   privilege_type, 
--   table_name 
-- FROM information_schema.table_privileges 
-- WHERE table_schema = 'website_cms_template_dev' 
--   AND grantee IN ('anon', 'authenticated')
-- ORDER BY table_name, grantee;
