-- File: 163_task_status_and_type_as_taxonomy.sql
-- Task status and task type as taxonomy (category terms with color).
-- Adds task_status and task_type sections; status_term_id and task_type_term_id on tasks; backfill; drop status and task_type columns; update RPCs.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Task status section and terms (category type)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('task_status', 'Task status', 'task_status', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES
  ('Open', 'open', 'category', ARRAY['task_status']),
  ('In progress', 'in_progress', 'category', ARRAY['task_status']),
  ('Blocked', 'blocked', 'category', ARRAY['task_status']),
  ('Done', 'done', 'category', ARRAY['task_status']),
  ('Cancelled', 'cancelled', 'category', ARRAY['task_status'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('task_status' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['task_status']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();

-- 2. Task type section and terms (category type)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('task_type', 'Task type', 'task_type', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES
  ('Default', 'default', 'category', ARRAY['task_type']),
  ('Support ticket', 'support_ticket', 'category', ARRAY['task_type'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('task_type' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['task_type']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();

-- 3. Add new columns to tasks (nullable for backfill)
ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS status_term_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE RESTRICT;
ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS task_type_term_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE RESTRICT;

-- 4. Backfill status_term_id from status
UPDATE website_cms_template_dev.tasks t
SET status_term_id = (
  SELECT id FROM website_cms_template_dev.taxonomy_terms tt
  WHERE tt.type = 'category' AND tt.slug = t.status
  LIMIT 1
)
WHERE t.status_term_id IS NULL AND t.status IS NOT NULL;

-- 5. Backfill task_type_term_id from task_type
UPDATE website_cms_template_dev.tasks t
SET task_type_term_id = (
  SELECT id FROM website_cms_template_dev.taxonomy_terms tt
  WHERE tt.type = 'category' AND tt.slug = t.task_type
  LIMIT 1
)
WHERE t.task_type_term_id IS NULL AND t.task_type IS NOT NULL;

-- 6. Default any still null to open / default
UPDATE website_cms_template_dev.tasks t
SET status_term_id = (SELECT id FROM website_cms_template_dev.taxonomy_terms WHERE type = 'category' AND slug = 'open' LIMIT 1)
WHERE t.status_term_id IS NULL;
UPDATE website_cms_template_dev.tasks t
SET task_type_term_id = (SELECT id FROM website_cms_template_dev.taxonomy_terms WHERE type = 'category' AND slug = 'default' LIMIT 1)
WHERE t.task_type_term_id IS NULL;

-- 7. Set NOT NULL and drop old columns
ALTER TABLE website_cms_template_dev.tasks ALTER COLUMN status_term_id SET NOT NULL;
ALTER TABLE website_cms_template_dev.tasks ALTER COLUMN task_type_term_id SET NOT NULL;
ALTER TABLE website_cms_template_dev.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE website_cms_template_dev.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE website_cms_template_dev.tasks DROP COLUMN IF EXISTS status;
ALTER TABLE website_cms_template_dev.tasks DROP COLUMN IF EXISTS task_type;
DROP INDEX IF EXISTS website_cms_template_dev.idx_tasks_status;
DROP INDEX IF EXISTS website_cms_template_dev.idx_tasks_task_type;

CREATE INDEX IF NOT EXISTS idx_tasks_status_term_id ON website_cms_template_dev.tasks(status_term_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type_term_id ON website_cms_template_dev.tasks(task_type_term_id);

-- ----- Public schema: update RPCs to return status_term_id and task_type_term_id; filter by term id -----
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_task_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_id_param uuid DEFAULT NULL,
  status_term_id_filter uuid DEFAULT NULL,
  task_type_term_id_filter uuid DEFAULT NULL,
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
           ($4 IS NOT NULL AND (t.creator_id = $4 OR t.responsible_id = $4 OR tf.user_id = $4))
           OR ($5 IS NOT NULL AND tf.contact_id = $5)
         )
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
      schema_name, schema_name
    );
    RETURN QUERY EXECUTE q USING project_id_param, status_term_id_filter, task_type_term_id_filter, assignee_user_id, assignee_contact_id;
  ELSE
    q := format(
      'SELECT t.id, t.project_id, t.title, t.description, t.status_term_id, t.task_type_term_id, t.priority_term_id,
              t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
              t.created_at, t.updated_at
       FROM %I.tasks t
       WHERE ($1::uuid IS NULL OR t.project_id = $1)
         AND ($2::uuid IS NULL OR t.status_term_id = $2)
         AND ($3::uuid IS NULL OR t.task_type_term_id = $3)
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
      schema_name
    );
    RETURN QUERY EXECUTE q USING project_id_param, status_term_id_filter, task_type_term_id_filter;
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
     FROM %I.tasks t WHERE t.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid, uuid, uuid, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_task_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
