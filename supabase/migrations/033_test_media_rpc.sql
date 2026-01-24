-- Test RPC function directly to verify it works
-- Run this in Supabase SQL Editor to verify the function exists and returns data

-- Test 1: Check if function exists
SELECT 
  routine_name, 
  routine_schema,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_media_with_variants'
  AND routine_schema = 'public';

-- Test 2: Check permissions
SELECT 
  grantee, 
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_media_with_variants'
  AND routine_schema = 'public';

-- Test 3: Call the function directly (should work if function exists)
SELECT * FROM public.get_media_with_variants();

-- Test 4: Check if PostgREST can see the function
-- This queries the pg_catalog which PostgREST uses
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_media_with_variants'
  AND n.nspname = 'public';
