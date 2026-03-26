-- ============================================================
-- MANUAL SQL - YOU MUST RUN THIS
-- Copy this file into Supabase SQL Editor and run it manually.
-- If skipped, "Show due date on calendar" toggle cannot persist and
-- calendar layer will continue to show tasks not explicitly opted-in.
-- ============================================================
-- File: 213_task_calendar_visibility.sql

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.task_calendar_visibility (
  task_id uuid PRIMARY KEY
    REFERENCES website_cms_template_dev.tasks(id)
    ON DELETE CASCADE,
  show_on_calendar boolean NOT NULL DEFAULT false,
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION website_cms_template_dev.set_task_calendar_visibility_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_calendar_visibility_updated_at
  ON website_cms_template_dev.task_calendar_visibility;
CREATE TRIGGER trg_task_calendar_visibility_updated_at
BEFORE UPDATE ON website_cms_template_dev.task_calendar_visibility
FOR EACH ROW
EXECUTE FUNCTION website_cms_template_dev.set_task_calendar_visibility_updated_at();

CREATE INDEX IF NOT EXISTS idx_task_calendar_visibility_show_on_calendar
  ON website_cms_template_dev.task_calendar_visibility(show_on_calendar)
  WHERE show_on_calendar = true;

NOTIFY pgrst, 'reload schema';

