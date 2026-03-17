-- File: 156_task_time_logs.sql
-- Phase 19 expansion: task_time_logs for time tracking (task-level). Not in activity stream.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES website_cms_template_dev.tasks(id) ON DELETE CASCADE,
  user_id UUID,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  log_date DATE NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON website_cms_template_dev.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_log_date ON website_cms_template_dev.task_time_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON website_cms_template_dev.task_time_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_time_logs_contact_id ON website_cms_template_dev.task_time_logs(contact_id) WHERE contact_id IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.task_time_logs IS 'Time log entries per task (Phase 19 expansion). Total task time = sum(minutes). Not in activity stream.';

ALTER TABLE website_cms_template_dev.task_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access task_time_logs"
  ON website_cms_template_dev.task_time_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.task_time_logs TO service_role;
