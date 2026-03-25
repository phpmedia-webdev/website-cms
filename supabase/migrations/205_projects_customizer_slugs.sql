-- File: 205_projects_customizer_slugs.sql
--
-- =============================================================================
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- Replace website_cms_template_dev with your client schema if different.
--
-- What it does:
--   Stores project status and type as Customizer-aligned text slugs (scopes
--   project_status, project_type) — same pattern as tasks (187_tasks_customizer_slugs).
--   Drops projects.status_term_id / projects.project_type_term_id (taxonomy_terms FKs).
--   Updates get_projects_dynamic / get_project_by_id_dynamic to return slugs and filter
--   by project_status_slug (text) instead of status_term_id (uuid).
--
-- Requires: Run after 204 (or any migration whose RPC signature matches 204).
-- Until this runs, the app expects legacy columns; after it runs, use code that matches 205.
-- =============================================================================

SET search_path TO website_cms_template_dev, public;

-- 1. Add slug columns (nullable for backfill)
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS project_status_slug text,
  ADD COLUMN IF NOT EXISTS project_type_slug text;

-- 2. Backfill from legacy taxonomy term ids
UPDATE website_cms_template_dev.projects p
SET project_status_slug = lower(trim(tt.slug))
FROM website_cms_template_dev.taxonomy_terms tt
WHERE tt.id = p.status_term_id
  AND p.project_status_slug IS NULL;

UPDATE website_cms_template_dev.projects p
SET project_type_slug = lower(trim(tt.slug))
FROM website_cms_template_dev.taxonomy_terms tt
WHERE p.project_type_term_id IS NOT NULL
  AND tt.id = p.project_type_term_id
  AND p.project_type_slug IS NULL;

-- 3. Fallback for any row still missing status (should not happen if status_term_id was NOT NULL)
UPDATE website_cms_template_dev.projects
SET project_status_slug = 'new'
WHERE project_status_slug IS NULL OR trim(project_status_slug) = '';

-- 4. Normalize to lowercase (app also normalizes on write)
UPDATE website_cms_template_dev.projects
SET project_status_slug = lower(trim(project_status_slug))
WHERE project_status_slug IS NOT NULL;

UPDATE website_cms_template_dev.projects
SET project_type_slug = CASE
  WHEN project_type_slug IS NULL OR trim(project_type_slug) = '' THEN NULL
  ELSE lower(trim(project_type_slug))
END;

-- 5. Drop FKs and legacy columns
ALTER TABLE website_cms_template_dev.projects
  DROP CONSTRAINT IF EXISTS projects_status_term_id_fkey;

ALTER TABLE website_cms_template_dev.projects
  DROP CONSTRAINT IF EXISTS projects_project_type_term_id_fkey;

ALTER TABLE website_cms_template_dev.projects
  DROP COLUMN IF EXISTS status_term_id,
  DROP COLUMN IF EXISTS project_type_term_id;

ALTER TABLE website_cms_template_dev.projects
  ALTER COLUMN project_status_slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_project_status_slug
  ON website_cms_template_dev.projects(project_status_slug);

CREATE INDEX IF NOT EXISTS idx_projects_project_type_slug
  ON website_cms_template_dev.projects(project_type_slug)
  WHERE project_type_slug IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.projects.project_status_slug IS
  'Customizer scope project_status slug (Settings → Customizer → Projects).';

COMMENT ON COLUMN website_cms_template_dev.projects.project_type_slug IS
  'Customizer scope project_type slug; nullable.';

-- 6. RPCs — filter by status slug (text), return slug columns
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_projects_dynamic(text, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_project_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_projects_dynamic(
  schema_name text,
  project_status_slug_filter text DEFAULT NULL,
  required_mag_id_filter uuid DEFAULT NULL,
  include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  project_number text,
  name text,
  description text,
  project_status_slug text,
  project_type_slug text,
  start_date date,
  due_date date,
  completed_date date,
  planned_time integer,
  end_date_extended boolean,
  potential_sales numeric,
  estimated_hourly_rate numeric,
  cover_image_id uuid,
  required_mag_id uuid,
  contact_id uuid,
  client_organization_id uuid,
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
    'SELECT p.id, p.project_number, p.name, p.description, p.project_status_slug, p.project_type_slug, p.start_date, p.due_date,
            p.completed_date, p.planned_time, p.end_date_extended, p.potential_sales, p.estimated_hourly_rate, p.cover_image_id, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p
     WHERE 1=1
       AND ($1::text IS NULL OR trim(lower(p.project_status_slug)) = trim(lower($1)))
       AND ($2::uuid IS NULL OR p.required_mag_id = $2)
       AND ($3::boolean IS TRUE OR p.archived_at IS NULL)
     ORDER BY p.created_at DESC',
    schema_name
  );
  RETURN QUERY EXECUTE q USING project_status_slug_filter, required_mag_id_filter, include_archived;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_by_id_dynamic(
  schema_name text,
  project_id_param uuid
)
RETURNS TABLE(
  id uuid,
  project_number text,
  name text,
  description text,
  project_status_slug text,
  project_type_slug text,
  start_date date,
  due_date date,
  completed_date date,
  planned_time integer,
  end_date_extended boolean,
  potential_sales numeric,
  estimated_hourly_rate numeric,
  cover_image_id uuid,
  required_mag_id uuid,
  contact_id uuid,
  client_organization_id uuid,
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
    'SELECT p.id, p.project_number, p.name, p.description, p.project_status_slug, p.project_type_slug, p.start_date, p.due_date,
            p.completed_date, p.planned_time, p.end_date_extended, p.potential_sales, p.estimated_hourly_rate, p.cover_image_id, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p WHERE p.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING project_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_projects_dynamic(text, text, uuid, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
