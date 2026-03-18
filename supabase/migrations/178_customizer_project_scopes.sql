-- File: 178_customizer_project_scopes.sql
-- Seed default options for project_type, project_status, project_role (Customizer > Projects tab).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Project', 'project', '#3b82f6', 'project_type', 0, false),
  ('Client work', 'client_work', '#8b5cf6', 'project_type', 1, false),
  ('Internal', 'internal', '#6b7280', 'project_type', 2, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Planning', 'planning', '#f59e0b', 'project_status', 0, false),
  ('Active', 'active', '#22c55e', 'project_status', 1, false),
  ('On hold', 'on_hold', '#6b7280', 'project_status', 2, false),
  ('Completed', 'completed', '#3b82f6', 'project_status', 3, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Owner', 'owner', '#3b82f6', 'project_role', 0, false),
  ('Member', 'member', '#6b7280', 'project_role', 1, false),
  ('Viewer', 'viewer', '#9ca3af', 'project_role', 2, false)
ON CONFLICT (scope, slug) DO NOTHING;
