-- File: 207_tasks_contact_id.sql
--
-- =============================================================================
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- Replace `website_cms_template_dev` with your tenant schema name if different.
-- Adds `tasks.contact_id` (CRM contact for tickets / communication) and extends
-- `get_tasks_dynamic` / `get_task_by_id_dynamic` to return it.
-- Skip → app types and RPC callers expecting `contact_id` will not match the DB.
-- =============================================================================

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON website_cms_template_dev.tasks(contact_id)
  WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.tasks.contact_id IS
  'Primary CRM contact for this task (e.g. support requester). Optional; distinct from project client organization.';

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(
  text, uuid[], text[], text[], text[], uuid[], uuid[], text[], date
);

CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_ids uuid[] DEFAULT NULL,
  status_slugs text[] DEFAULT NULL,
  type_slugs text[] DEFAULT NULL,
  phase_slugs text[] DEFAULT NULL,
  assignee_user_ids uuid[] DEFAULT NULL,
  assignee_contact_ids uuid[] DEFAULT NULL,
  exclude_status_slugs text[] DEFAULT NULL,
  due_before date DEFAULT NULL
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
  planned_time integer,
  actual_time integer,
  due_date date,
  start_date date,
  creator_id uuid,
  responsible_id uuid,
  contact_id uuid,
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
            t.priority_term_id, t.planned_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.contact_id, t.created_at, t.updated_at
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
       AND ($7 IS NULL OR cardinality($7) = 0 OR NOT (lower(trim(t.task_status_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($7::text[]) AS s
           )))
       AND ($8::date IS NULL OR (t.due_date IS NOT NULL AND t.due_date < $8::date))
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
    schema_name,
    schema_name,
    schema_name,
    schema_name
  );
  RETURN QUERY EXECUTE q
    USING project_ids, status_slugs, type_slugs, phase_slugs, assignee_user_ids, assignee_contact_ids,
          exclude_status_slugs, due_before;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(
  text, uuid[], text[], text[], text[], uuid[], uuid[], text[], date
) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_task_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_task_by_id_dynamic(
  schema_name text,
  task_id_param uuid
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
  planned_time integer,
  actual_time integer,
  due_date date,
  start_date date,
  creator_id uuid,
  responsible_id uuid,
  contact_id uuid,
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
            t.priority_term_id, t.planned_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.contact_id, t.created_at, t.updated_at
     FROM %I.tasks t WHERE t.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_task_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
