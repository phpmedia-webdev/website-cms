-- File: 206_project_members_role_slug.sql
--
-- =============================================================================
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- Replace website_cms_template_dev with your client schema if different.
--
-- What it does:
--   Replaces project_members.role_term_id (FK → taxonomy_terms) with role_slug (text),
--   aligned with Customizer scope `project_role` (Settings → Customizer → Projects).
--   Backfills slug from taxonomy_terms.slug via legacy role_term_id.
--
-- Requires: project_members table (migration 168 or equivalent).
-- =============================================================================

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.project_members
  ADD COLUMN IF NOT EXISTS role_slug text;

UPDATE website_cms_template_dev.project_members pm
SET role_slug = lower(trim(tt.slug))
FROM website_cms_template_dev.taxonomy_terms tt
WHERE tt.id = pm.role_term_id
  AND (pm.role_slug IS NULL OR trim(pm.role_slug) = '');

ALTER TABLE website_cms_template_dev.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_term_id_fkey;

DROP INDEX IF EXISTS idx_project_members_role_term_id;

ALTER TABLE website_cms_template_dev.project_members
  DROP COLUMN IF EXISTS role_term_id;

CREATE INDEX IF NOT EXISTS idx_project_members_role_slug
  ON website_cms_template_dev.project_members(role_slug)
  WHERE role_slug IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.project_members.role_slug IS
  'Optional member role: Customizer scope project_role slug (e.g. owner, member, viewer).';

COMMENT ON TABLE website_cms_template_dev.project_members IS
  'Project members: team (user_id) or CRM contact (contact_id). Optional role_slug from Customizer project_role.';
