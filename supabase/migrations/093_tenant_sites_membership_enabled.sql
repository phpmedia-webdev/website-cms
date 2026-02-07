-- File: 093_tenant_sites_membership_enabled.sql
-- Master switch: when OFF, no membership sync on public/member pages and no content protection (optimized speed for sites without gated content).

ALTER TABLE public.tenant_sites
  ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tenant_sites.membership_enabled IS 'When true: membership sync and content protection run. When false: no sync, no gating (all content public). Toggle on /admin/crm/memberships.';
