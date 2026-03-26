-- File: 209_tasks_project_fk_set_null.sql
--
-- =============================================================================
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy entire file -> Supabase Dashboard -> SQL Editor -> Run (per tenant schema).
-- Replace `website_cms_template_dev` with your tenant schema name if different.
--
-- Why:
-- - Standalone operational tasks must survive project deletion.
-- - Previous FK behavior could cascade-delete tasks when a project is deleted.
--
-- What this changes:
-- - Keeps `tasks.project_id` nullable.
-- - Replaces FK on `tasks.project_id` -> `projects.id` with ON DELETE SET NULL.
--
-- If skipped:
-- - Deleting a project may still remove linked tasks, which breaks standalone-task design.
-- =============================================================================

SET search_path TO website_cms_template_dev, public;

-- Keep project link optional for standalone tasks.
ALTER TABLE website_cms_template_dev.tasks
  ALTER COLUMN project_id DROP NOT NULL;

-- Drop any existing FK(s) on tasks.project_id -> projects.id (name can differ by environment).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid
    WHERE n.nspname = 'website_cms_template_dev'
      AND t.relname = 'tasks'
      AND c.contype = 'f'
      AND a.attname = 'project_id'
      AND a.attnum = ANY (c.conkey)
  LOOP
    EXECUTE format(
      'ALTER TABLE website_cms_template_dev.tasks DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- Recreate FK with set-null semantics.
ALTER TABLE website_cms_template_dev.tasks
  ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES website_cms_template_dev.projects(id)
  ON DELETE SET NULL;

-- Keep index for project-linked task filtering.
CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON website_cms_template_dev.tasks(project_id)
  WHERE project_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.tasks.project_id IS
  'Owning project; NULL = standalone task. FK uses ON DELETE SET NULL.';

NOTIFY pgrst, 'reload schema';
