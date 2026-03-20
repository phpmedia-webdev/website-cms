-- File: 185_get_tasks_dynamic_multi_filters.sql
-- Multi-value filters for admin task list: projects, status/type/phase term ids, assignees.
-- Replaces single-value get_tasks_dynamic(..., uuid, uuid, uuid, ...).
-- Run in Supabase SQL Editor.

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_ids uuid[] DEFAULT NULL,
  status_term_ids uuid[] DEFAULT NULL,
  task_type_term_ids uuid[] DEFAULT NULL,
  phase_term_ids uuid[] DEFAULT NULL,
  assignee_user_ids uuid[] DEFAULT NULL,
  assignee_contact_ids uuid[] DEFAULT NULL
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
  q := format(
    'SELECT t.id, t.project_id, t.title, t.description, t.status_term_id, t.task_type_term_id, t.priority_term_id,
            t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t
     WHERE
       ($1 IS NULL OR cardinality($1) = 0 OR t.project_id = ANY($1))
       AND ($2 IS NULL OR cardinality($2) = 0 OR t.status_term_id = ANY($2))
       AND ($3 IS NULL OR cardinality($3) = 0 OR t.task_type_term_id = ANY($3))
       AND (
         $4 IS NULL OR cardinality($4) = 0
         OR EXISTS (
           SELECT 1 FROM %I.taxonomy_relationships tr
           WHERE tr.content_type = ''task''
             AND tr.content_id = t.id
             AND tr.term_id = ANY($4)
         )
       )
       AND (
         (
           ($5 IS NULL OR cardinality($5) = 0)
           AND ($6 IS NULL OR cardinality($6) = 0)
         )
         OR
         (
           ($5 IS NOT NULL AND cardinality($5) > 0 AND (
             t.responsible_id = ANY($5)
             OR t.creator_id = ANY($5)
             OR EXISTS (
               SELECT 1 FROM %I.task_followers tf
               WHERE tf.task_id = t.id AND tf.user_id = ANY($5)
             )
           ))
           OR
           ($6 IS NOT NULL AND cardinality($6) > 0 AND EXISTS (
             SELECT 1 FROM %I.task_followers tf
             WHERE tf.task_id = t.id AND tf.contact_id = ANY($6)
           ))
         )
       )
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
    schema_name, schema_name, schema_name, schema_name
  );
  RETURN QUERY EXECUTE q
    USING project_ids, status_term_ids, task_type_term_ids, phase_term_ids, assignee_user_ids, assignee_contact_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[]) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
