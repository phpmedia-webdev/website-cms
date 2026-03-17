-- File: 153_tasks_rpc_start_date.sql
-- Phase 19 expansion: add start_date to task RPC return types and SELECTs.
-- Run in Supabase SQL Editor after 152_task_start_date.sql.

SET search_path TO public;

-- Drop existing functions so return type (add start_date) can change
DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_task_by_id_dynamic(text, uuid);

-- get_tasks_dynamic: add start_date to RETURNS TABLE and to both SELECTs
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
  start_date date,
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
    q := format(
      'SELECT DISTINCT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority,
              t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
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
              t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
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

-- get_task_by_id_dynamic: add start_date to RETURNS TABLE and SELECT
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
  start_date date,
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
            t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t WHERE t.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid, text, text, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_task_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
