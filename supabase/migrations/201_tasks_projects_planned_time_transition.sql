-- ============================================================
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy this entire file into Supabase SQL Editor and Run.
-- If you skip this, planned_time transition work will drift and
-- old/new API payloads can become inconsistent across envs.
-- File: 201_tasks_projects_planned_time_transition.sql
-- ============================================================

-- Purpose:
-- 1) Introduce `planned_time` on tasks/projects.
-- 2) Keep backward compatibility with existing `proposed_time` callers.
-- 3) Keep both columns in sync during transition.
--
-- Notes:
-- - This is a transition migration (safe for staged rollout).
-- - Hard rename/drop of `proposed_time` should happen in a later migration
--   after app/API callers are fully moved.

SET search_path TO website_cms_template_dev, public;

-- 1) Add transition columns.
ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS planned_time integer;

ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS planned_time integer;

COMMENT ON COLUMN website_cms_template_dev.tasks.planned_time
  IS 'Transition column for planned task minutes; synced with proposed_time during migration window.';
COMMENT ON COLUMN website_cms_template_dev.projects.planned_time
  IS 'Transition column for planned project minutes; synced with proposed_time during migration window.';

-- 2) Backfill from current canonical columns where needed.
UPDATE website_cms_template_dev.tasks
SET planned_time = proposed_time
WHERE planned_time IS NULL AND proposed_time IS NOT NULL;

UPDATE website_cms_template_dev.projects
SET planned_time = proposed_time
WHERE planned_time IS NULL AND proposed_time IS NOT NULL;

-- 3) Sync trigger helpers.
CREATE OR REPLACE FUNCTION website_cms_template_dev.sync_tasks_planned_and_proposed_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prefer planned_time when both are provided but differ.
  IF NEW.planned_time IS NOT NULL AND NEW.proposed_time IS NOT NULL THEN
    NEW.proposed_time := NEW.planned_time;
    RETURN NEW;
  END IF;

  -- Mirror whichever side is provided.
  IF NEW.planned_time IS NULL AND NEW.proposed_time IS NOT NULL THEN
    NEW.planned_time := NEW.proposed_time;
  ELSIF NEW.proposed_time IS NULL AND NEW.planned_time IS NOT NULL THEN
    NEW.proposed_time := NEW.planned_time;
  END IF;

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION website_cms_template_dev.sync_projects_planned_and_proposed_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prefer planned_time when both are provided but differ.
  IF NEW.planned_time IS NOT NULL AND NEW.proposed_time IS NOT NULL THEN
    NEW.proposed_time := NEW.planned_time;
    RETURN NEW;
  END IF;

  -- Mirror whichever side is provided.
  IF NEW.planned_time IS NULL AND NEW.proposed_time IS NOT NULL THEN
    NEW.planned_time := NEW.proposed_time;
  ELSIF NEW.proposed_time IS NULL AND NEW.planned_time IS NOT NULL THEN
    NEW.proposed_time := NEW.planned_time;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_sync_tasks_planned_and_proposed_time
  ON website_cms_template_dev.tasks;
CREATE TRIGGER trg_sync_tasks_planned_and_proposed_time
BEFORE INSERT OR UPDATE ON website_cms_template_dev.tasks
FOR EACH ROW
EXECUTE FUNCTION website_cms_template_dev.sync_tasks_planned_and_proposed_time();

DROP TRIGGER IF EXISTS trg_sync_projects_planned_and_proposed_time
  ON website_cms_template_dev.projects;
CREATE TRIGGER trg_sync_projects_planned_and_proposed_time
BEFORE INSERT OR UPDATE ON website_cms_template_dev.projects
FOR EACH ROW
EXECUTE FUNCTION website_cms_template_dev.sync_projects_planned_and_proposed_time();
