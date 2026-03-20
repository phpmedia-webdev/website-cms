-- File: 181_customizer_event_type.sql
-- Seed default options for event_type (Customizer > Events tab). Used as calendar event types.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Meeting', 'meeting', '#3b82f6', 'event_type', 0, false),
  ('Public listing', 'public', '#22c55e', 'event_type', 1, false),
  ('Webinar', 'webinar', '#8b5cf6', 'event_type', 2, false),
  ('Deadline', 'deadline', '#ef4444', 'event_type', 3, false),
  ('Internal', 'internal', '#6b7280', 'event_type', 4, false)
ON CONFLICT (scope, slug) DO NOTHING;

COMMENT ON COLUMN website_cms_template_dev.customizer.scope IS
  'List identifier: contact_status, crm_note_type, resource_type, project_type, task_type, task_status, task_phase, event_type, etc.';
