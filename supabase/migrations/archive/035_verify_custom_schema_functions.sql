-- Verify RPC functions exist in custom schema
-- Run this to check if migration 034 created the functions correctly

-- Check if functions exist in website_cms_template_dev schema
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_media_with_variants', 'get_media_by_id', 'generate_media_slug')
  AND n.nspname IN ('public', 'website_cms_template_dev')
ORDER BY n.nspname, p.proname;

-- Test calling the function directly from custom schema
SELECT * FROM website_cms_template_dev.get_media_with_variants();
