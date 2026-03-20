-- File: 168_project_members_table.sql
-- Project members plan: table linking projects to members (team user or CRM contact) with optional role from Project Roles taxonomy.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES website_cms_template_dev.projects(id) ON DELETE CASCADE,
  user_id UUID,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  role_term_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_members_assignee_check CHECK (
    (user_id IS NOT NULL AND contact_id IS NULL) OR (user_id IS NULL AND contact_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_project_user
  ON website_cms_template_dev.project_members(project_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_project_contact
  ON website_cms_template_dev.project_members(project_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON website_cms_template_dev.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON website_cms_template_dev.project_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_members_contact_id ON website_cms_template_dev.project_members(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_members_role_term_id ON website_cms_template_dev.project_members(role_term_id) WHERE role_term_id IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.project_members IS 'Project members: team (user_id) or CRM contact (contact_id). Role from Project Roles taxonomy. Used to scope task assignee picker and show on project detail.';

ALTER TABLE website_cms_template_dev.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access project_members"
  ON website_cms_template_dev.project_members FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.project_members TO service_role;
