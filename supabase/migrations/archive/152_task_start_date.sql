-- File: 152_task_start_date.sql
-- Phase 19 expansion: add start_date (DATE, nullable) to tasks.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS start_date DATE;

CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON website_cms_template_dev.tasks(start_date) WHERE start_date IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.tasks.start_date IS 'Optional start date for the task (Phase 19 expansion).';
