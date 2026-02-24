-- File: 114_enable_rls_public_auth_and_mfa_tables.sql
-- Enable RLS on public tables that are exposed to PostgREST but currently have RLS disabled.
-- Fixes Supabase linter: rls_disabled_in_public, sensitive_columns_exposed.
-- No policies = no access via anon/authenticated; app uses service role (bypasses RLS).
-- Run in Supabase SQL Editor: copy this file and execute.

SET search_path TO public;

-- Auth/roles (e.g. PHP-Auth–related or shared schema)
ALTER TABLE IF EXISTS public.auth_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permission_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_role_features ENABLE ROW LEVEL SECURITY;

-- MFA: one-time tokens / challenge sessions (sensitive: access_token, refresh_token)
ALTER TABLE IF EXISTS public.mfa_challenge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mfa_upgrade_tokens ENABLE ROW LEVEL SECURITY;
