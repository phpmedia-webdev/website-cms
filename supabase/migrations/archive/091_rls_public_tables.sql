-- File: 091_rls_public_tables.sql
-- Enable RLS on public tables exposed to PostgREST. No policies = no access via anon/authenticated.
-- All app access to these tables uses the service role (server-side), which bypasses RLS.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

SET search_path TO public;

-- code_snippets: superadmin code library (server-only via service role)
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

-- feature_registry: feature slugs and metadata (server-only via service role)
ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;

-- admin_roles: role definitions (server-only via service role)
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- role_features: which features each role has (server-only via service role)
ALTER TABLE public.role_features ENABLE ROW LEVEL SECURITY;

-- tenant_sites: tenant/site registry (server-only via service role)
ALTER TABLE public.tenant_sites ENABLE ROW LEVEL SECURITY;

-- tenant_features: which features each tenant has (server-only via service role)
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- tenant_user_assignments: user-site-role assignments (server-only via service role)
ALTER TABLE public.tenant_user_assignments ENABLE ROW LEVEL SECURITY;

-- tenant_users: tenant user identity (server-only via service role)
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
