-- File: 164_project_status_and_type_as_taxonomy.sql
-- Project status and project type as taxonomy (category terms with color).
-- Adds project_status and project_type sections; status_term_id and project_type_term_id on projects; backfill; drop status column; update RPCs.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Project status section and terms (category type)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('project_status', 'Project status', 'project_status', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES
  ('New', 'new', 'category', ARRAY['project_status']),
  ('Active', 'active', 'category', ARRAY['project_status']),
  ('Closed', 'closed', 'category', ARRAY['project_status']),
  ('Perpetual', 'perpetual', 'category', ARRAY['project_status'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('project_status' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['project_status']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();

-- 2. Project type section and terms (category type)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('project_type', 'Project type', 'project_type', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES
  ('Standard', 'standard', 'category', ARRAY['project_type']),
  ('Support', 'support', 'category', ARRAY['project_type'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('project_type' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['project_type']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();

-- 3. Add new columns to projects (nullable for backfill)
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS status_term_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE RESTRICT;
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS project_type_term_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE SET NULL;

-- 4. Backfill status_term_id from status
UPDATE website_cms_template_dev.projects p
SET status_term_id = (
  SELECT id FROM website_cms_template_dev.taxonomy_terms tt
  WHERE tt.type = 'category' AND tt.slug = p.status
  LIMIT 1
)
WHERE p.status_term_id IS NULL AND p.status IS NOT NULL;

-- 5. Backfill project_type_term_id: Support where contact_id set, else Standard
UPDATE website_cms_template_dev.projects p
SET project_type_term_id = (
  SELECT id FROM website_cms_template_dev.taxonomy_terms tt
  WHERE tt.type = 'category' AND tt.slug = CASE WHEN p.contact_id IS NOT NULL THEN 'support' ELSE 'standard' END
  LIMIT 1
)
WHERE p.project_type_term_id IS NULL;

-- 6. Default any still null status to new
UPDATE website_cms_template_dev.projects p
SET status_term_id = (SELECT id FROM website_cms_template_dev.taxonomy_terms WHERE type = 'category' AND slug = 'new' LIMIT 1)
WHERE p.status_term_id IS NULL;

-- 7. Set NOT NULL for status_term_id and drop status column
ALTER TABLE website_cms_template_dev.projects ALTER COLUMN status_term_id SET NOT NULL;
ALTER TABLE website_cms_template_dev.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE website_cms_template_dev.projects DROP COLUMN IF EXISTS status;
DROP INDEX IF EXISTS website_cms_template_dev.idx_projects_status;

CREATE INDEX IF NOT EXISTS idx_projects_status_term_id ON website_cms_template_dev.projects(status_term_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_type_term_id ON website_cms_template_dev.projects(project_type_term_id) WHERE project_type_term_id IS NOT NULL;

-- ----- Public schema: update RPCs to return status_term_id and project_type_term_id; filter by status_term_id -----
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_projects_dynamic(text, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_project_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_projects_dynamic(
  schema_name text,
  status_term_id_filter uuid DEFAULT NULL,
  required_mag_id_filter uuid DEFAULT NULL,
  include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
  proposed_start_date date,
  proposed_end_date date,
  end_date_extended boolean,
  potential_sales numeric,
  required_mag_id uuid,
  contact_id uuid,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format(
    'SELECT p.id, p.name, p.description, p.status_term_id, p.project_type_term_id, p.proposed_start_date, p.proposed_end_date,
            p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p
     WHERE 1=1
       AND ($1::uuid IS NULL OR p.status_term_id = $1)
       AND ($2::uuid IS NULL OR p.required_mag_id = $2)
       AND ($3::boolean IS TRUE OR p.archived_at IS NULL)
     ORDER BY p.created_at DESC',
    schema_name
  );
  RETURN QUERY EXECUTE q USING status_term_id_filter, required_mag_id_filter, include_archived;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_by_id_dynamic(
  schema_name text,
  project_id_param uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
  proposed_start_date date,
  proposed_end_date date,
  end_date_extended boolean,
  potential_sales numeric,
  required_mag_id uuid,
  contact_id uuid,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format(
    'SELECT p.id, p.name, p.description, p.status_term_id, p.project_type_term_id, p.proposed_start_date, p.proposed_end_date,
            p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p WHERE p.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING project_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_projects_dynamic(text, uuid, uuid, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
