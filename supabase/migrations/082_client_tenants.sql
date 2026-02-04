-- File: 082_client_tenants.sql
-- Superadmin site registry: one row per tenant/site (public schema).

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.client_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL UNIQUE,
  deployment_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  site_mode TEXT NOT NULL DEFAULT 'coming_soon',
  site_mode_locked BOOLEAN NOT NULL DEFAULT false,
  site_mode_locked_by UUID,
  site_mode_locked_at TIMESTAMPTZ,
  site_mode_locked_reason TEXT,
  github_repo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_tenants_slug ON public.client_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_client_tenants_schema_name ON public.client_tenants(schema_name);
CREATE INDEX IF NOT EXISTS idx_client_tenants_status ON public.client_tenants(status);

CREATE OR REPLACE FUNCTION public.client_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_tenants_updated_at ON public.client_tenants;
CREATE TRIGGER client_tenants_updated_at
  BEFORE UPDATE ON public.client_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.client_tenants_updated_at();

COMMENT ON TABLE public.client_tenants IS 'Superadmin: registry of tenant/site deployments (schema, URL, description).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tenants TO service_role;
