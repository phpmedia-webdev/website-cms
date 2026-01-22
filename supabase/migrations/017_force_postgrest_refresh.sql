-- Force PostgREST to completely reload its schema cache
-- This is a more aggressive approach to ensure PostgREST recognizes new tables
-- Run this in Supabase SQL Editor

-- Method 1: Standard cache refresh notification
NOTIFY pgrst, 'reload schema';

-- Method 2: Verify schema is accessible
-- Check if PostgREST can see the schema
DO $$
BEGIN
  -- This will fail if schema doesn't exist, which helps diagnose
  PERFORM 1 FROM information_schema.schemata 
  WHERE schema_name = 'website_cms_template_dev';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schema website_cms_template_dev does not exist';
  END IF;
END $$;

-- Method 3: Verify table exists and has correct permissions
SELECT 
  'Table exists: ' || tablename as status
FROM pg_tables 
WHERE schemaname = 'website_cms_template_dev' 
  AND tablename = 'color_palettes';

-- Method 4: Verify permissions are granted
SELECT 
  grantee,
  privilege_type,
  'Permission granted' as status
FROM information_schema.table_privileges 
WHERE table_schema = 'website_cms_template_dev' 
  AND table_name = 'color_palettes'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- Method 5: Another cache refresh (sometimes needs multiple attempts)
SELECT pg_sleep(1); -- Wait 1 second
NOTIFY pgrst, 'reload schema';

-- Output confirmation
SELECT 'PostgREST cache refresh completed. Wait 10-30 seconds before testing.' as message;
