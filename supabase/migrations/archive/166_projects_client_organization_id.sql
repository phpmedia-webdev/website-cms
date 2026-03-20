-- File: 166_projects_client_organization_id.sql
-- Project members plan: project client can be a contact (contact_id) or an organization (client_organization_id).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add client_organization_id to projects (nullable; when set, client display = organization)
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS client_organization_id UUID REFERENCES website_cms_template_dev.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client_organization_id ON website_cms_template_dev.projects(client_organization_id) WHERE client_organization_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.projects.client_organization_id IS 'When set, project client is this organization. When NULL, client is contact_id (contact).';

-- 2. Update RPCs to return client_organization_id
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
    'SELECT p.id, p.name, p.description, p.status_term_id, p.project_type_term_id, p.proposed_start_date, p.proposed_end_date,
            p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
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
    'SELECT p.id, p.name, p.description, p.status_term_id, p.project_type_term_id, p.proposed_start_date, p.proposed_end_date,
            p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
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
