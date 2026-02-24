-- File: 115_tenant_feature_slugs.sql
-- M5 C5: Tenant feature gating by PHP-Auth feature slug.
-- Enables GET feature-registry from PHP-Auth (scope website-cms) and store enabled slugs per tenant.
-- Effective features = tenant_feature_slugs ∩ role's features (by slug). Run in Supabase SQL Editor.

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.tenant_feature_slugs (
  tenant_id uuid NOT NULL REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
  feature_slug text NOT NULL,
  PRIMARY KEY (tenant_id, feature_slug),
  CONSTRAINT tenant_feature_slugs_feature_slug_non_empty CHECK (trim(feature_slug) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tenant_feature_slugs_tenant_id ON public.tenant_feature_slugs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_slugs_feature_slug ON public.tenant_feature_slugs(feature_slug);

COMMENT ON TABLE public.tenant_feature_slugs IS 'Features enabled per tenant by PHP-Auth feature slug. Effective = tenant_feature_slugs ∩ role features (by slug).';

ALTER TABLE public.tenant_feature_slugs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_feature_slugs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_feature_slugs TO service_role;
