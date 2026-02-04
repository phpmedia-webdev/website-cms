-- File: 081_feature_registry_and_roles.sql
-- Feature registry + admin role feature mapping (public schema).

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.feature_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.feature_registry(id) ON DELETE SET NULL,
  group_slug TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_core BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_registry_parent_id ON public.feature_registry(parent_id);
CREATE INDEX IF NOT EXISTS idx_feature_registry_group_slug ON public.feature_registry(group_slug);

CREATE OR REPLACE FUNCTION public.feature_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_registry_updated_at ON public.feature_registry;
CREATE TRIGGER feature_registry_updated_at
  BEFORE UPDATE ON public.feature_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.feature_registry_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_roles (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.admin_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_roles_updated_at ON public.admin_roles;
CREATE TRIGGER admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_roles_updated_at();

CREATE TABLE IF NOT EXISTS public.role_features (
  role_slug TEXT NOT NULL REFERENCES public.admin_roles(slug) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.feature_registry(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_slug, feature_id)
);

INSERT INTO public.admin_roles (slug, label, description)
VALUES
  ('admin', 'Admin', 'Full tenant admin access.'),
  ('editor', 'Editor', 'Content editing and publishing access.'),
  ('creator', 'Creator', 'Content submissions only.'),
  ('viewer', 'Viewer', 'Read-only access where permitted.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.feature_registry (slug, label, description, group_slug, display_order, is_core)
VALUES
  ('dashboard', 'Dashboard', 'Admin dashboard home.', 'admin', 10, true),
  ('content', 'Content', 'Unified content management.', 'admin', 20, true),
  ('galleries', 'Galleries', 'Gallery management.', 'admin', 30, false),
  ('media', 'Media', 'Media library and uploads.', 'admin', 40, true),
  ('crm', 'CRM', 'Contacts, notes, and CRM tools.', 'crm', 50, true),
  ('crm_chat', 'CRM Chat', 'Embedded conversations for CRM.', 'crm', 60, false),
  ('forms', 'Forms', 'Form registry and submissions.', 'admin', 70, true),
  ('memberships', 'Memberships', 'MAGs and membership tools.', 'admin', 80, true),
  ('settings', 'Settings', 'Site settings and configuration.', 'admin', 90, true),
  ('superadmin', 'Superadmin', 'Platform-wide tools.', 'superadmin', 100, true)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.feature_registry
SET parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm')
WHERE slug = 'crm_chat' AND parent_id IS NULL;

COMMENT ON TABLE public.feature_registry IS 'Superadmin-managed feature registry with optional hierarchy for granular access control.';
COMMENT ON TABLE public.admin_roles IS 'System admin roles used for feature access control.';
COMMENT ON TABLE public.role_features IS 'Role-to-feature mapping for access control.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_registry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_features TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_registry TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_features TO service_role;
