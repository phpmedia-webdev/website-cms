-- File: 165_projects_proposed_time.sql
-- Add project estimated time (proposed_time in minutes) for time tracking and progress bar.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add proposed_time to projects (estimated duration in minutes; nullable)
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS proposed_time integer;

COMMENT ON COLUMN website_cms_template_dev.projects.proposed_time IS 'Estimated total time for the project in minutes. Used with sum of task time logs for progress.';

-- 2. Update RPCs to return proposed_time
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
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
  proposed_start_date date,
  proposed_end_date date,
  proposed_time integer,
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
            p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.archived_at,
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
  proposed_time integer,
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
            p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.archived_at,
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
