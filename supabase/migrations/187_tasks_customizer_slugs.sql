-- File: 187_tasks_customizer_slugs.sql
-- Task status, type, and phase are stored as slugs aligned with Settings → Customizer
-- (scopes task_status, task_type, task_phase). Replaces status_term_id / task_type_term_id.
-- Drops task rows from taxonomy_relationships for content_type = 'task' (no taxonomy for these dimensions).
-- Updates get_tasks_dynamic / get_task_by_id_dynamic to filter and return slug columns.
-- Run in Supabase SQL Editor after 186. Replace website_cms_template_dev if your tenant schema differs.

SET search_path TO website_cms_template_dev, public;

-- 1. Add slug columns (nullable for backfill)
ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS task_status_slug text,
  ADD COLUMN IF NOT EXISTS task_type_slug text,
  ADD COLUMN IF NOT EXISTS task_phase_slug text;

-- 2. Backfill from taxonomy term ids
UPDATE website_cms_template_dev.tasks t
SET task_status_slug = lower(trim(tt.slug))
FROM website_cms_template_dev.taxonomy_terms tt
WHERE tt.id = t.status_term_id AND t.task_status_slug IS NULL;

UPDATE website_cms_template_dev.tasks t
SET task_type_slug = lower(trim(tt.slug))
FROM website_cms_template_dev.taxonomy_terms tt
WHERE tt.id = t.task_type_term_id AND t.task_type_slug IS NULL;

-- 3. Map legacy task_status / task_type taxonomy slugs → Customizer slugs (see migration 179)
UPDATE website_cms_template_dev.tasks SET task_status_slug = CASE task_status_slug
  WHEN 'open' THEN 'to_do'
  WHEN 'cancelled' THEN 'to_do'
  WHEN 'blocked' THEN 'review'
  ELSE task_status_slug
END
WHERE task_status_slug IS NOT NULL;

UPDATE website_cms_template_dev.tasks SET task_type_slug = CASE task_type_slug
  WHEN 'default' THEN 'task'
  WHEN 'support_ticket' THEN 'task'
  ELSE task_type_slug
END
WHERE task_type_slug IS NOT NULL;

-- 4. Phase from first linked task taxonomy category (before we delete relationships)
UPDATE website_cms_template_dev.tasks t
SET task_phase_slug = sub.slug
FROM (
  SELECT DISTINCT ON (tr.content_id)
    tr.content_id AS task_id,
    lower(trim(tt.slug)) AS slug
  FROM website_cms_template_dev.taxonomy_relationships tr
  JOIN website_cms_template_dev.taxonomy_terms tt ON tt.id = tr.term_id
  WHERE tr.content_type = 'task' AND tt.type = 'category'
  ORDER BY tr.content_id, tr.created_at ASC
) sub
WHERE sub.task_id = t.id AND t.task_phase_slug IS NULL;

-- 5. Normalize phase to known customizer slugs; unknown → backlog
UPDATE website_cms_template_dev.tasks SET task_phase_slug = CASE task_phase_slug
  WHEN 'backlog' THEN 'backlog'
  WHEN 'sprint' THEN 'sprint'
  WHEN 'done' THEN 'done'
  ELSE 'backlog'
END
WHERE task_phase_slug IS NOT NULL;

UPDATE website_cms_template_dev.tasks SET task_phase_slug = 'backlog' WHERE task_phase_slug IS NULL;

-- 6. Defaults for any missing status/type
UPDATE website_cms_template_dev.tasks SET task_status_slug = 'to_do' WHERE task_status_slug IS NULL;
UPDATE website_cms_template_dev.tasks SET task_type_slug = 'task' WHERE task_type_slug IS NULL;

-- 7. Remove taxonomy links for tasks (dimensions + tags on task content_type)
DELETE FROM website_cms_template_dev.taxonomy_relationships WHERE content_type = 'task';

-- 8. Drop FKs and legacy columns
ALTER TABLE website_cms_template_dev.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_term_id_fkey;

ALTER TABLE website_cms_template_dev.tasks
  DROP CONSTRAINT IF EXISTS tasks_task_type_term_id_fkey;

ALTER TABLE website_cms_template_dev.tasks
  DROP COLUMN IF EXISTS status_term_id,
  DROP COLUMN IF EXISTS task_type_term_id;

ALTER TABLE website_cms_template_dev.tasks
  ALTER COLUMN task_status_slug SET NOT NULL,
  ALTER COLUMN task_type_slug SET NOT NULL,
  ALTER COLUMN task_phase_slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_status_slug ON website_cms_template_dev.tasks(task_status_slug);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type_slug ON website_cms_template_dev.tasks(task_type_slug);
CREATE INDEX IF NOT EXISTS idx_tasks_task_phase_slug ON website_cms_template_dev.tasks(task_phase_slug);

-- 9. RPCs: slug filters (arrays NULL or empty = no filter)
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.get_task_by_id_dynamic(text, uuid);

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
    'SELECT t.id, t.project_id, t.title, t.description, t.task_status_slug, t.task_type_slug, t.task_phase_slug,
            t.priority_term_id, t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t
     WHERE
       ($1 IS NULL OR cardinality($1) = 0 OR t.project_id = ANY($1))
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
    schema_name, schema_name, schema_name
  );
  RETURN QUERY EXECUTE q
    USING project_ids, status_slugs, type_slugs, phase_slugs, assignee_user_ids, assignee_contact_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid[], text[], text[], text[], uuid[], uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_task_by_id_dynamic(
  schema_name text,
  task_id_param uuid
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
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
    'SELECT t.id, t.project_id, t.title, t.description, t.task_status_slug, t.task_type_slug, t.task_phase_slug,
            t.priority_term_id, t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t WHERE t.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_task_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
