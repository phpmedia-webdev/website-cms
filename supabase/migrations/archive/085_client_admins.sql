-- File: 085_client_admins.sql
-- Admin identity and per-tenant role assignment (public schema).
-- Links Supabase auth.users to client_tenants via role (admin, editor, creator, viewer).

SET search_path TO public;

-- Admin profile: one row per person who can access tenant admin (synced from auth.users).
CREATE TABLE IF NOT EXISTS public.client_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_admins_user_id ON public.client_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_client_admins_email ON public.client_admins(email);
CREATE INDEX IF NOT EXISTS idx_client_admins_status ON public.client_admins(status);

CREATE OR REPLACE FUNCTION public.client_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_admins_updated_at ON public.client_admins;
CREATE TRIGGER client_admins_updated_at
  BEFORE UPDATE ON public.client_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.client_admins_updated_at();

-- Which admins are on which tenant, with which role (admin, editor, creator, viewer).
CREATE TABLE IF NOT EXISTS public.client_admin_tenants (
  admin_id UUID NOT NULL REFERENCES public.client_admins(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.client_tenants(id) ON DELETE CASCADE,
  role_slug TEXT NOT NULL REFERENCES public.admin_roles(slug) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_client_admin_tenants_tenant_id ON public.client_admin_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_admin_tenants_role_slug ON public.client_admin_tenants(role_slug);

COMMENT ON TABLE public.client_admins IS 'Admin identity records; user_id links to auth.users. One row per person with tenant access.';
COMMENT ON TABLE public.client_admin_tenants IS 'Assigns admins to tenants with a role (admin, editor, creator, viewer).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_admin_tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_admins TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_admin_tenants TO service_role;
