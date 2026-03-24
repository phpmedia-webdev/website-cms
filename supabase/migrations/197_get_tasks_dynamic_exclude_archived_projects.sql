-- File: 197_get_tasks_dynamic_exclude_archived_projects.sql
--
-- =============================================================================
-- MANUAL SQL (this repo): copy entire file → Supabase Dashboard → SQL Editor → Run.
-- Not applied by git pull. Effect: get_tasks_dynamic omits tasks on archived projects.
-- =============================================================================
--
-- All Tasks / list views: exclude tasks whose project is archived (projects.archived_at IS NOT NULL).
-- Task detail (get_task_by_id_dynamic) unchanged so deep links to archived-project tasks still work.

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid[], text[], text[], text[], uuid[], uuid[]);

CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_ids uuid[] DEFAULT NULL,
  status_slugs text[] DEFAULT NULL,
  type_slugs text[] DEFAULT NULL,
  phase_slugs text[] DEFAULT NULL,
  assignee_user_ids uuid[] DEFAULT NULL,
  assignee_contact_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  task_number text,
  title text,
  description text,
  task_status_slug text,
  task_type_slug text,
  task_phase_slug text,
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
    'SELECT t.id, t.project_id, t.task_number, t.title, t.description, t.task_status_slug, t.task_type_slug, t.task_phase_slug,
            t.priority_term_id, t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t
     INNER JOIN %I.projects p ON p.id = t.project_id
     WHERE
       p.archived_at IS NULL
       AND ($1 IS NULL OR cardinality($1) = 0 OR t.project_id = ANY($1))
       AND ($2 IS NULL OR cardinality($2) = 0 OR lower(trim(t.task_status_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($2::text[]) AS s
           ))
       AND ($3 IS NULL OR cardinality($3) = 0 OR lower(trim(t.task_type_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($3::text[]) AS s
           ))
       AND ($4 IS NULL OR cardinality($4) = 0 OR lower(trim(t.task_phase_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($4::text[]) AS s
           ))
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
    schema_name,
    schema_name,
    schema_name,
    schema_name
  );
  RETURN QUERY EXECUTE q
    USING project_ids, status_slugs, type_slugs, phase_slugs, assignee_user_ids, assignee_contact_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid[], text[], text[], text[], uuid[], uuid[]) TO anon, authenticated, service_role;
