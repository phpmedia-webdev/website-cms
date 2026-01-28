-- File: 055_create_marketing_lists.sql
-- Marketing/email lists and contact-list membership.
-- Run after 054b.

SET search_path TO website_cms_template_dev, public;

-- 1. Marketing lists table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.marketing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_lists_slug ON website_cms_template_dev.marketing_lists(slug);
CREATE INDEX IF NOT EXISTS idx_marketing_lists_name ON website_cms_template_dev.marketing_lists(name);

-- 2. Contact-list junction table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_contact_marketing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES website_cms_template_dev.marketing_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_marketing_lists_contact_id ON website_cms_template_dev.crm_contact_marketing_lists(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_marketing_lists_list_id ON website_cms_template_dev.crm_contact_marketing_lists(list_id);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.marketing_lists TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_contact_marketing_lists TO anon, authenticated, service_role;
