-- File: 162_projects_contact_id_support_project.sql
-- Support project per GPUM: link project to contact (owner). One perpetual Support project per contact.
-- Seed "Support Ticket" category for project section so support projects can be tagged.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add contact_id to projects (nullable; set for support projects to identify "this contact's Support project")
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_contact_id ON website_cms_template_dev.projects(contact_id) WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.projects.contact_id IS 'For support projects: the contact (GPUM) who owns this project. One perpetual project per contact.';

-- 2. Seed "Support Ticket" as a category in the project section (for taxonomy assignment to support projects)
INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES ('Support Ticket', 'support-ticket', 'category', ARRAY['project']::text[])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('project' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['project']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();
