-- File: 084_tenant_features.sql
-- Per-tenant feature toggles (public schema). Effective access = tenant_features ∩ role_features.

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.tenant_features (
  tenant_id UUID NOT NULL REFERENCES public.client_tenants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.feature_registry(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant_id ON public.tenant_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_feature_id ON public.tenant_features(feature_id);

COMMENT ON TABLE public.tenant_features IS 'Features enabled for each tenant. Effective access = tenant_features ∩ role_features.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_features TO service_role;
