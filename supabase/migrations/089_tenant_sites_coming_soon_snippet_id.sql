-- File: 089_tenant_sites_coming_soon_snippet_id.sql
-- Allow choosing a content-library snippet (content type "snippet") for the Coming Soon page.
-- Content lives in client schema; no FK. Store content UUID only.

ALTER TABLE public.tenant_sites
  ADD COLUMN IF NOT EXISTS coming_soon_snippet_id UUID NULL;

COMMENT ON COLUMN public.tenant_sites.coming_soon_snippet_id IS 'Optional content id (snippet type) from the tenant content library to show on the Coming Soon page. Resolved in client schema by id.';
