-- File: 177_customizer_table.sql
-- Single tenant-scoped table for all Customizer options: contact statuses, note types, resource types, project/task types and statuses.
-- Fields: label, slug, color (hex), scope (e.g. contact_status, project_type, task_status), display_order, is_core.
-- Forks get default core items via seed inserts below.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.customizer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  scope TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_core BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customizer_scope_slug_unique UNIQUE (scope, slug)
);

CREATE INDEX IF NOT EXISTS idx_customizer_scope ON website_cms_template_dev.customizer(scope);
CREATE INDEX IF NOT EXISTS idx_customizer_scope_slug ON website_cms_template_dev.customizer(scope, slug);
CREATE INDEX IF NOT EXISTS idx_customizer_scope_display_order ON website_cms_template_dev.customizer(scope, display_order);

COMMENT ON TABLE website_cms_template_dev.customizer IS 'Admin Customizer options: contact statuses, note types, resource types, project/task types and statuses. Tenant-scoped via client schema.';
COMMENT ON COLUMN website_cms_template_dev.customizer.scope IS 'List identifier: contact_status, crm_note_type, resource_type, project_type, task_type, task_status, etc.';
COMMENT ON COLUMN website_cms_template_dev.customizer.is_core IS 'When true, used by code; delete disabled for admins. Only superadmin can toggle.';

ALTER TABLE website_cms_template_dev.customizer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access customizer"
  ON website_cms_template_dev.customizer FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.customizer TO service_role;

-- Default core items (forks get these when schema is created)
INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('New', 'new', '#22c55e', 'contact_status', 0, true),
  ('Contacted', 'contacted', '#3b82f6', 'contact_status', 1, false),
  ('Archived', 'archived', '#6b7280', 'contact_status', 2, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Call', 'call', NULL, 'crm_note_type', 0, false),
  ('Task', 'task', NULL, 'crm_note_type', 1, false),
  ('Email', 'email', NULL, 'crm_note_type', 2, false),
  ('Meeting', 'meeting', NULL, 'crm_note_type', 3, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Room', 'room', NULL, 'resource_type', 0, false),
  ('Equipment', 'equipment', NULL, 'resource_type', 1, false),
  ('Video', 'video', NULL, 'resource_type', 2, false)
ON CONFLICT (scope, slug) DO NOTHING;
