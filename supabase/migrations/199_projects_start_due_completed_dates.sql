-- File: 199_projects_start_due_completed_dates.sql
--
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy this entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- Replace website_cms_template_dev with your client schema if different.
--
-- What it does:
--   Renames projects.proposed_start_date → start_date, proposed_end_date → due_date.
--   Adds projects.completed_date (nullable date).
--   Recreates partial indexes; updates get_projects_dynamic / get_project_by_id_dynamic RPCs.
--
-- If skipped: app code expects new column names + RPC shape → list/detail/project APIs break.

SET search_path TO website_cms_template_dev, public;

-- 1. Indexes (drop old names before column rename)
DROP INDEX IF EXISTS website_cms_template_dev.idx_projects_proposed_start_date;
DROP INDEX IF EXISTS website_cms_template_dev.idx_projects_proposed_end_date;

-- 2. Rename columns
ALTER TABLE website_cms_template_dev.projects RENAME COLUMN proposed_start_date TO start_date;
ALTER TABLE website_cms_template_dev.projects RENAME COLUMN proposed_end_date TO due_date;

-- 3. New column
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS completed_date date;

COMMENT ON COLUMN website_cms_template_dev.projects.start_date IS 'Project start date (nullable).';
COMMENT ON COLUMN website_cms_template_dev.projects.due_date IS 'Project due / target end date (nullable). Task due dates past this may set end_date_extended.';
COMMENT ON COLUMN website_cms_template_dev.projects.completed_date IS 'Calendar date when the project was completed (nullable).';

-- 4. Indexes on new names
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON website_cms_template_dev.projects(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON website_cms_template_dev.projects(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_completed_date ON website_cms_template_dev.projects(completed_date) WHERE completed_date IS NOT NULL;

-- 5. RPCs (return shape must match app Project type)
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
  start_date date,
  due_date date,
  completed_date date,
  proposed_time integer,
  end_date_extended boolean,
  potential_sales numeric,
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
    'SELECT p.id, p.name, p.description, p.status_term_id, p.project_type_term_id, p.start_date, p.due_date,
            p.completed_date, p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
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
  start_date date,
  due_date date,
  completed_date date,
  proposed_time integer,
  end_date_extended boolean,
  potential_sales numeric,
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
    'SELECT p.id, p.name, p.description, p.status_term_id, p.project_type_term_id, p.start_date, p.due_date,
            p.completed_date, p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
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
