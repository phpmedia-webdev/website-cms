-- ============================================================
-- MANUAL SQL - YOU MUST RUN THIS
-- Copy this file into Supabase SQL Editor and run it manually.
-- If skipped, task reminder UI will fail when reading/saving reminder state.
-- ============================================================
-- File: 211_task_reminders.sql

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE
    REFERENCES website_cms_template_dev.tasks(id)
    ON DELETE CASCADE,
  offset_value integer NOT NULL DEFAULT 1 CHECK (offset_value >= 1 AND offset_value <= 365),
  offset_unit text NOT NULL DEFAULT 'days' CHECK (offset_unit IN ('minutes', 'hours', 'days')),
  methods text[] NOT NULL DEFAULT ARRAY['notification']::text[]
    CHECK (
      cardinality(methods) >= 1
      AND methods <@ ARRAY['email', 'sms', 'notification']::text[]
    ),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_active
  ON website_cms_template_dev.task_reminders(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id
  ON website_cms_template_dev.task_reminders(task_id);

CREATE OR REPLACE FUNCTION website_cms_template_dev.set_task_reminders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_reminders_updated_at ON website_cms_template_dev.task_reminders;
CREATE TRIGGER trg_task_reminders_updated_at
BEFORE UPDATE ON website_cms_template_dev.task_reminders
FOR EACH ROW
EXECUTE FUNCTION website_cms_template_dev.set_task_reminders_updated_at();

NOTIFY pgrst, 'reload schema';

