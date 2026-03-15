-- File: 145_projects_table.sql
-- Phase 19: Project Management — projects table (tenant schema).
-- Projects: name, description, status, proposed/end dates, potential_sales, required_mag_id, archived_at, created_by.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'closed', 'perpetual')),
  proposed_start_date DATE,
  proposed_end_date DATE,
  end_date_extended BOOLEAN NOT NULL DEFAULT false,
  potential_sales NUMERIC(12, 2),
  required_mag_id UUID REFERENCES website_cms_template_dev.mags(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON website_cms_template_dev.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_required_mag_id ON website_cms_template_dev.projects(required_mag_id) WHERE required_mag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_proposed_start_date ON website_cms_template_dev.projects(proposed_start_date) WHERE proposed_start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_proposed_end_date ON website_cms_template_dev.projects(proposed_end_date) WHERE proposed_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON website_cms_template_dev.projects(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON website_cms_template_dev.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON website_cms_template_dev.projects(created_by) WHERE created_by IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.projects IS 'Projects for Phase 19 Project Management. Visibility by required_mag_id; taxonomy via taxonomy_relationships (content_type=project).';

ALTER TABLE website_cms_template_dev.projects ENABLE ROW LEVEL SECURITY;

-- Access via service role for API/server; authenticated policies can be added when admin UI is built.
CREATE POLICY "Service role full access projects"
  ON website_cms_template_dev.projects FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.projects TO service_role;
