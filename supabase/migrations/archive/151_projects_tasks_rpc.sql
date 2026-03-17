-- File: 151_projects_tasks_rpc.sql
-- Phase 19: RPCs for projects and tasks (public schema, SECURITY DEFINER).
-- List/get projects; list/get tasks (by project or by assignee for "my tasks").
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO public;

-- get_projects_dynamic(schema_name, status_filter, required_mag_id_filter, include_archived)
-- status_filter: optional, e.g. 'active'. NULL = all statuses.
-- required_mag_id_filter: optional UUID; NULL = any MAG.
-- include_archived: false = only archived_at IS NULL; true = include archived.
CREATE OR REPLACE FUNCTION public.get_projects_dynamic(
  schema_name text,
  status_filter text DEFAULT NULL,
  required_mag_id_filter uuid DEFAULT NULL,
  include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  status text,
  proposed_start_date date,
  proposed_end_date date,
  end_date_extended boolean,
  potential_sales numeric,
  required_mag_id uuid,
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
    'SELECT p.id, p.name, p.description, p.status, p.proposed_start_date, p.proposed_end_date,
            p.end_date_extended, p.potential_sales, p.required_mag_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p
     WHERE 1=1
       AND ($1::text IS NULL OR p.status = $1)
       AND ($2::uuid IS NULL OR p.required_mag_id = $2)
       AND ($3::boolean IS TRUE OR p.archived_at IS NULL)
     ORDER BY p.created_at DESC',
    schema_name
  );
  RETURN QUERY EXECUTE q USING status_filter, required_mag_id_filter, include_archived;
END;
$$;

-- get_project_by_id_dynamic(schema_name, project_id_param)
CREATE OR REPLACE FUNCTION public.get_project_by_id_dynamic(
  schema_name text,
  project_id_param uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  status text,
  proposed_start_date date,
  proposed_end_date date,
  end_date_extended boolean,
  potential_sales numeric,
  required_mag_id uuid,
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
    'SELECT p.id, p.name, p.description, p.status, p.proposed_start_date, p.proposed_end_date,
            p.end_date_extended, p.potential_sales, p.required_mag_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p WHERE p.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING project_id_param;
END;
$$;

-- get_tasks_dynamic(schema_name, project_id_param, status_filter, task_type_filter, assignee_user_id, assignee_contact_id)
-- project_id_param: optional; NULL = all projects (subject to assignee filter).
-- assignee_user_id / assignee_contact_id: optional; when set, return tasks where user is creator, responsible, or follower.
-- Only one of assignee_user_id or assignee_contact_id should be set for "my tasks".
CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_id_param uuid DEFAULT NULL,
  status_filter text DEFAULT NULL,
  task_type_filter text DEFAULT NULL,
  assignee_user_id uuid DEFAULT NULL,
  assignee_contact_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  title text,
  description text,
  status text,
  task_type text,
  priority text,
  proposed_time integer,
  actual_time integer,
  due_date date,
  creator_id uuid,
  responsible_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF assignee_user_id IS NOT NULL OR assignee_contact_id IS NOT NULL THEN
    -- "My tasks": tasks where assignee is creator, responsible, or in task_followers
    q := format(
      'SELECT DISTINCT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority,
              t.proposed_time, t.actual_time, t.due_date, t.creator_id, t.responsible_id,
              t.created_at, t.updated_at
       FROM %I.tasks t
       LEFT JOIN %I.task_followers tf ON tf.task_id = t.id
       WHERE ($1::uuid IS NULL OR t.project_id = $1)
         AND ($2::text IS NULL OR t.status = $2)
         AND ($3::text IS NULL OR t.task_type = $3)
         AND (
           ($4 IS NOT NULL AND (t.creator_id = $4 OR t.responsible_id = $4 OR tf.user_id = $4))
           OR ($5 IS NOT NULL AND tf.contact_id = $5)
         )
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
      schema_name, schema_name
    );
    RETURN QUERY EXECUTE q USING project_id_param, status_filter, task_type_filter, assignee_user_id, assignee_contact_id;
  ELSE
    q := format(
      'SELECT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority,
              t.proposed_time, t.actual_time, t.due_date, t.creator_id, t.responsible_id,
              t.created_at, t.updated_at
       FROM %I.tasks t
       WHERE ($1::uuid IS NULL OR t.project_id = $1)
         AND ($2::text IS NULL OR t.status = $2)
         AND ($3::text IS NULL OR t.task_type = $3)
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
      schema_name
    );
    RETURN QUERY EXECUTE q USING project_id_param, status_filter, task_type_filter;
  END IF;
END;
$$;

-- get_task_by_id_dynamic(schema_name, task_id_param)
CREATE OR REPLACE FUNCTION public.get_task_by_id_dynamic(
  schema_name text,
  task_id_param uuid
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  title text,
  description text,
  status text,
  task_type text,
  priority text,
  proposed_time integer,
  actual_time integer,
  due_date date,
  creator_id uuid,
  responsible_id uuid,
  created_at timestamptz,
  updated_at timestamptz
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
    'SELECT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority,
            t.proposed_time, t.actual_time, t.due_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t WHERE t.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_projects_dynamic(text, text, uuid, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid, text, text, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_task_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
