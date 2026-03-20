-- File: 161_task_priority_as_taxonomy.sql
-- Task priority as taxonomy: add task_priority section, seed Low/Medium/High terms, add priority_term_id to tasks, backfill, drop priority column. Update RPCs.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add Task priority section (staple; terms used as task priority dropdown)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('task_priority', 'Task priority', 'task_priority', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

-- 2. Ensure priority terms exist (tag type, suggested_sections includes task_priority)
INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES
  ('Low', 'low', 'tag', ARRAY['task_priority']),
  ('Medium', 'medium', 'tag', ARRAY['task_priority']),
  ('High', 'high', 'tag', ARRAY['task_priority'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('task_priority' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['task_priority']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();

-- 3. Add priority_term_id to tasks (nullable first for backfill)
ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS priority_term_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE RESTRICT;

-- 4. Backfill from current priority text to term id
UPDATE website_cms_template_dev.tasks t
SET priority_term_id = (
  SELECT id FROM website_cms_template_dev.taxonomy_terms tt
  WHERE tt.type = 'tag' AND tt.slug = t.priority
  LIMIT 1
)
WHERE t.priority_term_id IS NULL AND t.priority IS NOT NULL;

-- 5. Default any still-null to Medium term (safety)
UPDATE website_cms_template_dev.tasks t
SET priority_term_id = (SELECT id FROM website_cms_template_dev.taxonomy_terms WHERE type = 'tag' AND slug = 'medium' LIMIT 1)
WHERE t.priority_term_id IS NULL;

-- 6. Set NOT NULL and drop old column
ALTER TABLE website_cms_template_dev.tasks ALTER COLUMN priority_term_id SET NOT NULL;
ALTER TABLE website_cms_template_dev.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE website_cms_template_dev.tasks DROP COLUMN IF EXISTS priority;
DROP INDEX IF EXISTS website_cms_template_dev.idx_tasks_priority;

-- 7. Index for priority_term_id
CREATE INDEX IF NOT EXISTS idx_tasks_priority_term_id ON website_cms_template_dev.tasks(priority_term_id);

-- ----- Public schema: update RPCs to return priority_term_id instead of priority -----
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_task_by_id_dynamic(text, uuid);

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
      'SELECT DISTINCT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority_term_id,
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
      'SELECT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority_term_id,
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
    'SELECT t.id, t.project_id, t.title, t.description, t.status, t.task_type, t.priority_term_id,
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
