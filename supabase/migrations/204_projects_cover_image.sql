-- File: 204_projects_cover_image.sql
--
-- =============================================================================
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- Replace website_cms_template_dev with your client schema if different.
--
-- What it does:
--   Adds projects.cover_image_id (nullable FK to media) for optional hero image.
--   Extends get_projects_dynamic / get_project_by_id_dynamic to return the column.
--
-- Requires: Manually run after migration 203 (or any RPC that matches its RETURNS shape).
-- =============================================================================

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS cover_image_id uuid REFERENCES website_cms_template_dev.media(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_cover_image_id
  ON website_cms_template_dev.projects(cover_image_id)
  WHERE cover_image_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.projects.cover_image_id IS
  'Optional cover/hero image (media.id) for project overview.';

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_projects_dynamic(text, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_project_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_projects_dynamic(
  schema_name text,
  status_term_id_filter uuid DEFAULT NULL,
  required_mag_id_filter uuid DEFAULT NULL,
  include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  project_number text,
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
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
    'SELECT p.id, p.project_number, p.name, p.description, p.status_term_id, p.project_type_term_id, p.start_date, p.due_date,
            p.completed_date, p.planned_time, p.end_date_extended, p.potential_sales, p.estimated_hourly_rate, p.cover_image_id, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
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
  project_number text,
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
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
    'SELECT p.id, p.project_number, p.name, p.description, p.status_term_id, p.project_type_term_id, p.start_date, p.due_date,
            p.completed_date, p.planned_time, p.end_date_extended, p.potential_sales, p.estimated_hourly_rate, p.cover_image_id, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p WHERE p.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING project_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_projects_dynamic(text, uuid, uuid, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
