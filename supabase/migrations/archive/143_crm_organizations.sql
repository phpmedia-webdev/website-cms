-- File: 143_crm_organizations.sql
-- CRM: organizations table and contact–organization many-to-many junction.
-- Organizations have name, email, phone, type, industry. Junction has optional role and sort_order (first = primary).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Organizations (companies)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_name ON website_cms_template_dev.organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON website_cms_template_dev.organizations(created_at DESC);

ALTER TABLE website_cms_template_dev.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access organizations"
  ON website_cms_template_dev.organizations FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.organizations TO service_role;

-- Contact–organization junction (many-to-many). sort_order: 0 = primary (first on contact card).
CREATE TABLE IF NOT EXISTS website_cms_template_dev.contact_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES website_cms_template_dev.organizations(id) ON DELETE CASCADE,
  role TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_organizations_contact_id ON website_cms_template_dev.contact_organizations(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_organizations_organization_id ON website_cms_template_dev.contact_organizations(organization_id);

ALTER TABLE website_cms_template_dev.contact_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access contact_organizations"
  ON website_cms_template_dev.contact_organizations FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.contact_organizations TO service_role;

COMMENT ON COLUMN website_cms_template_dev.contact_organizations.sort_order IS 'Order of orgs for contact; 0 = primary (shown first on contact card).';
