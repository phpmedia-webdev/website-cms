-- Verify and ensure color_palettes table permissions are correct
-- This migration ensures PostgREST can find the table in the exposed schema
-- Run this AFTER exposing the schema in Dashboard → Settings → API → Exposed Schemas

-- Step 1: Ensure USAGE on schema is granted (should already be done by 004, but verify)
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON SCHEMA website_cms_template_dev TO authenticated;

-- Step 2: Explicitly grant permissions on color_palettes table (redundant but ensures it's set)
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.color_palettes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.color_palettes TO authenticated;

-- Step 3: Grant USAGE on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO authenticated;

-- Step 4: Refresh PostgREST schema cache
-- This forces PostgREST to reload its schema cache and recognize the new table
NOTIFY pgrst, 'reload schema';

-- Verification query (optional - uncomment to check)
-- SELECT 
--   grantee, 
--   privilege_type, 
--   table_name 
-- FROM information_schema.table_privileges 
-- WHERE table_schema = 'website_cms_template_dev' 
--   AND table_name = 'color_palettes'
--   AND grantee IN ('anon', 'authenticated')
-- ORDER BY grantee, privilege_type;
