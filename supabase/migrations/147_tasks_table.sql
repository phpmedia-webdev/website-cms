-- File: 147_tasks_table.sql
-- Phase 19: Project Management — tasks table (tenant schema).
-- Tasks: project_id, title, description, status, task_type (default | support_ticket), priority (low | medium | high),
-- proposed_time, actual_time, due_date, creator_id, responsible_id, timestamps.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES website_cms_template_dev.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  task_type TEXT NOT NULL DEFAULT 'default' CHECK (task_type IN ('default', 'support_ticket')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  proposed_time INTEGER,
  actual_time INTEGER,
  due_date DATE,
  creator_id UUID,
  responsible_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON website_cms_template_dev.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON website_cms_template_dev.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON website_cms_template_dev.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON website_cms_template_dev.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON website_cms_template_dev.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON website_cms_template_dev.tasks(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_responsible_id ON website_cms_template_dev.tasks(responsible_id) WHERE responsible_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON website_cms_template_dev.tasks(created_at DESC);

COMMENT ON TABLE website_cms_template_dev.tasks IS 'Tasks for Phase 19 Project Management. Taxonomy via taxonomy_relationships (content_type=task) for phases/milestones. Assignments via task_followers.';

ALTER TABLE website_cms_template_dev.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access tasks"
  ON website_cms_template_dev.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.tasks TO service_role;
