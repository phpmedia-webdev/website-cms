-- Verify color_palettes table exists and check PostgREST visibility
-- Run this in Supabase SQL Editor (replace schema name)
-- 
-- This is a diagnostic script for troubleshooting table access issues.
-- Keep for reference but not needed for normal operations.

-- 1. Check if table exists
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev'
  AND table_name = 'color_palettes';

-- 2. Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'website_cms_template_dev'
  AND table_name = 'color_palettes'
  AND grantee IN ('anon', 'authenticated', 'postgres');

-- 3. Count palettes
SELECT COUNT(*) as palette_count 
FROM website_cms_template_dev.color_palettes;

-- 4. Refresh PostgREST cache (run this)
NOTIFY pgrst, 'reload schema';

-- 5. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'website_cms_template_dev'
  AND tablename = 'color_palettes';
