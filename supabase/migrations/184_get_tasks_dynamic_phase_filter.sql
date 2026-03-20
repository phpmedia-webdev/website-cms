-- File: 184_get_tasks_dynamic_phase_filter.sql
-- Add optional phase filter: tasks linked to a taxonomy term (category) via taxonomy_relationships
-- content_type = 'task' (e.g. task phase / milestone from Tasks section).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev only if you use a different template schema name in comments — function lives in public.

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_id_param uuid DEFAULT NULL,
  status_term_id_filter uuid DEFAULT NULL,
  task_type_term_id_filter uuid DEFAULT NULL,
  phase_term_id_filter uuid DEFAULT NULL,
  assignee_user_id uuid DEFAULT NULL,
  assignee_contact_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  title text,
  description text,
  status_term_id uuid,
  task_type_term_id uuid,
  priority_term_id uuid,
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
      'SELECT DISTINCT t.id, t.project_id, t.title, t.description, t.status_term_id, t.task_type_term_id, t.priority_term_id,
              t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
              t.created_at, t.updated_at
       FROM %I.tasks t
       LEFT JOIN %I.task_followers tf ON tf.task_id = t.id
       WHERE ($1::uuid IS NULL OR t.project_id = $1)
         AND ($2::uuid IS NULL OR t.status_term_id = $2)
         AND ($3::uuid IS NULL OR t.task_type_term_id = $3)
         AND (
           $4::uuid IS NULL
           OR EXISTS (
             SELECT 1 FROM %I.taxonomy_relationships tr
             WHERE tr.content_type = ''task''
               AND tr.content_id = t.id
               AND tr.term_id = $4
           )
         )
         AND (
           ($5 IS NOT NULL AND (t.creator_id = $5 OR t.responsible_id = $5 OR tf.user_id = $5))
           OR ($6 IS NOT NULL AND tf.contact_id = $6)
         )
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
      schema_name, schema_name, schema_name
    );
    RETURN QUERY EXECUTE q USING project_id_param, status_term_id_filter, task_type_term_id_filter, phase_term_id_filter, assignee_user_id, assignee_contact_id;
  ELSE
    q := format(
      'SELECT t.id, t.project_id, t.title, t.description, t.status_term_id, t.task_type_term_id, t.priority_term_id,
              t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
              t.created_at, t.updated_at
       FROM %I.tasks t
       WHERE ($1::uuid IS NULL OR t.project_id = $1)
         AND ($2::uuid IS NULL OR t.status_term_id = $2)
         AND ($3::uuid IS NULL OR t.task_type_term_id = $3)
         AND (
           $4::uuid IS NULL
           OR EXISTS (
             SELECT 1 FROM %I.taxonomy_relationships tr
             WHERE tr.content_type = ''task''
               AND tr.content_id = t.id
               AND tr.term_id = $4
           )
         )
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
      schema_name, schema_name
    );
    RETURN QUERY EXECUTE q USING project_id_param, status_term_id_filter, task_type_term_id_filter, phase_term_id_filter;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid, uuid, uuid, uuid, uuid, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
