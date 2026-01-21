-- Check if there's a settings table in public schema that might be conflicting
-- When multiple schemas are exposed, PostgREST might find the wrong table

-- Check for settings table in public schema
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE tablename = 'settings'
ORDER BY schemaname;

-- If there's a settings table in public schema, we might need to:
-- 1. Use schema-qualified names in queries
-- 2. Or remove/rename the public.settings table
-- 3. Or adjust the search_path

-- Check current search_path for the database
SHOW search_path;
