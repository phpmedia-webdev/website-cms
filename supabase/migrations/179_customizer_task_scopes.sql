-- File: 179_customizer_task_scopes.sql
-- Seed default options for task_type, task_status, task_phase (Customizer > Tasks tab).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Task', 'task', '#3b82f6', 'task_type', 0, false),
  ('Bug', 'bug', '#ef4444', 'task_type', 1, false),
  ('Feature', 'feature', '#22c55e', 'task_type', 2, false),
  ('Research', 'research', '#8b5cf6', 'task_type', 3, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('To do', 'to_do', '#6b7280', 'task_status', 0, false),
  ('In progress', 'in_progress', '#f59e0b', 'task_status', 1, false),
  ('Review', 'review', '#3b82f6', 'task_status', 2, false),
  ('Done', 'done', '#22c55e', 'task_status', 3, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Backlog', 'backlog', '#9ca3af', 'task_phase', 0, false),
  ('Sprint', 'sprint', '#3b82f6', 'task_phase', 1, false),
  ('Done', 'done', '#22c55e', 'task_phase', 2, false)
ON CONFLICT (scope, slug) DO NOTHING;
