-- ============================================================
-- MANUAL SQL - YOU MUST RUN THIS
-- Copy this file into Supabase SQL Editor and run it manually.
-- Use this only if migration 211 was already applied with single `method`.
-- If skipped, updated reminder UI/API (minutes + multi-method) will fail.
-- ============================================================
-- File: 212_task_reminders_methods_array_minutes.sql

SET search_path TO website_cms_template_dev, public;

DO $$
BEGIN
  -- Add methods[] if missing.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'website_cms_template_dev'
      AND table_name = 'task_reminders'
      AND column_name = 'methods'
  ) THEN
    ALTER TABLE website_cms_template_dev.task_reminders
      ADD COLUMN methods text[];
  END IF;

  -- Backfill from legacy method column when present.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'website_cms_template_dev'
      AND table_name = 'task_reminders'
      AND column_name = 'method'
  ) THEN
    UPDATE website_cms_template_dev.task_reminders
    SET methods = ARRAY[lower(trim(method))]
    WHERE methods IS NULL
      AND method IS NOT NULL
      AND trim(method) <> '';
  END IF;
END $$;

-- Ensure non-null + default for methods.
UPDATE website_cms_template_dev.task_reminders
SET methods = ARRAY['notification']::text[]
WHERE methods IS NULL OR cardinality(methods) = 0;

ALTER TABLE website_cms_template_dev.task_reminders
  ALTER COLUMN methods SET DEFAULT ARRAY['notification']::text[],
  ALTER COLUMN methods SET NOT NULL;

-- Replace constraints safely.
ALTER TABLE website_cms_template_dev.task_reminders
  DROP CONSTRAINT IF EXISTS task_reminders_offset_unit_check;

ALTER TABLE website_cms_template_dev.task_reminders
  ADD CONSTRAINT task_reminders_offset_unit_check
  CHECK (offset_unit IN ('minutes', 'hours', 'days'));

ALTER TABLE website_cms_template_dev.task_reminders
  DROP CONSTRAINT IF EXISTS task_reminders_method_check;

ALTER TABLE website_cms_template_dev.task_reminders
  DROP CONSTRAINT IF EXISTS task_reminders_methods_check;

ALTER TABLE website_cms_template_dev.task_reminders
  ADD CONSTRAINT task_reminders_methods_check
  CHECK (
    cardinality(methods) >= 1
    AND methods <@ ARRAY['email', 'sms', 'notification']::text[]
  );

-- Remove legacy column if it still exists.
ALTER TABLE website_cms_template_dev.task_reminders
  DROP COLUMN IF EXISTS method;

NOTIFY pgrst, 'reload schema';

