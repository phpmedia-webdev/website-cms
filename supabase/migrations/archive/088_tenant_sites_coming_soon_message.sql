-- File: 088_tenant_sites_coming_soon_message.sql
-- Add per-tenant custom message for the Coming Soon page (stored on tenant_sites).

ALTER TABLE public.tenant_sites
  ADD COLUMN IF NOT EXISTS coming_soon_message TEXT;

COMMENT ON COLUMN public.tenant_sites.coming_soon_message IS 'Optional custom message shown on the Coming Soon page when site_mode is coming_soon.';
