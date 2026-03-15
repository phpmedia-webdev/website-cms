-- File: 150_projects_link_orders_events.sql
-- Phase 19: Add project_id to orders and events for linking to projects.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Orders: optional link to a project
ALTER TABLE website_cms_template_dev.orders
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES website_cms_template_dev.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_project_id ON website_cms_template_dev.orders(project_id) WHERE project_id IS NOT NULL;

-- Events: optional link to a project (table must exist, e.g. from calendar module)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'website_cms_template_dev' AND table_name = 'events') THEN
    ALTER TABLE website_cms_template_dev.events
      ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES website_cms_template_dev.projects(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_events_project_id ON website_cms_template_dev.events(project_id) WHERE project_id IS NOT NULL;
  END IF;
END
$$;
