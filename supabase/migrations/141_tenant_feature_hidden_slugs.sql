-- File: 141_tenant_feature_hidden_slugs.sql
-- Gate system: hide vs ghost. Slugs listed here are hidden from sidebar (not shown at all).
-- When Display is OFF we also remove from tenant_feature_slugs (sync Gate OFF). Run in Supabase SQL Editor.

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.tenant_feature_hidden_slugs (
  tenant_id uuid NOT NULL REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
  feature_slug text NOT NULL,
  PRIMARY KEY (tenant_id, feature_slug),
  CONSTRAINT tenant_feature_hidden_slugs_feature_slug_non_empty CHECK (trim(feature_slug) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tenant_feature_hidden_slugs_tenant_id ON public.tenant_feature_hidden_slugs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_hidden_slugs_feature_slug ON public.tenant_feature_hidden_slugs(feature_slug);

COMMENT ON TABLE public.tenant_feature_hidden_slugs IS 'Feature slugs hidden from sidebar per tenant. Display OFF = hidden + gate OFF (sync).';

ALTER TABLE public.tenant_feature_hidden_slugs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_feature_hidden_slugs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_feature_hidden_slugs TO service_role;
