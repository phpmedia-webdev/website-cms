-- File: 169_crm_contact_methods_and_org_company_domain.sql
-- CRM: add organization company_domain and a relational contact_methods table for phone/email rows.
-- Backfills existing contact phone/email values into contact_methods as primary "main" entries.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.organizations
  ADD COLUMN IF NOT EXISTS company_domain TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_company_domain
  ON website_cms_template_dev.organizations(company_domain);

CREATE TABLE IF NOT EXISTS website_cms_template_dev.contact_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('phone', 'email')),
  label TEXT NOT NULL DEFAULT 'main',
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, method_type, normalized_value, label)
);

CREATE INDEX IF NOT EXISTS idx_contact_methods_contact_id
  ON website_cms_template_dev.contact_methods(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_methods_method_type_normalized_value
  ON website_cms_template_dev.contact_methods(method_type, normalized_value);

CREATE INDEX IF NOT EXISTS idx_contact_methods_contact_type_primary
  ON website_cms_template_dev.contact_methods(contact_id, method_type, is_primary)
  WHERE is_primary = true;

ALTER TABLE website_cms_template_dev.contact_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access contact_methods"
  ON website_cms_template_dev.contact_methods
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.contact_methods TO service_role;

COMMENT ON TABLE website_cms_template_dev.contact_methods IS 'Normalized phone/email rows for contacts. Used for matching, labels, and multiple values.';
COMMENT ON COLUMN website_cms_template_dev.contact_methods.label IS 'Human label like work, mobile, personal, main.';
COMMENT ON COLUMN website_cms_template_dev.contact_methods.normalized_value IS 'Lowercased email or digits-only phone for matching.';
COMMENT ON COLUMN website_cms_template_dev.contact_methods.is_primary IS 'Primary method for its type on the contact.';

INSERT INTO website_cms_template_dev.contact_methods (
  contact_id,
  method_type,
  label,
  value,
  normalized_value,
  is_primary,
  sort_order,
  source
)
SELECT
  c.id,
  'email',
  'main',
  trim(c.email),
  lower(trim(c.email)),
  true,
  0,
  'backfill_contact_email'
FROM website_cms_template_dev.crm_contacts c
WHERE c.email IS NOT NULL
  AND trim(c.email) <> ''
ON CONFLICT (contact_id, method_type, normalized_value, label) DO NOTHING;

INSERT INTO website_cms_template_dev.contact_methods (
  contact_id,
  method_type,
  label,
  value,
  normalized_value,
  is_primary,
  sort_order,
  source
)
SELECT
  c.id,
  'phone',
  'main',
  trim(c.phone),
  regexp_replace(trim(c.phone), '\\D', '', 'g'),
  true,
  0,
  'backfill_contact_phone'
FROM website_cms_template_dev.crm_contacts c
WHERE c.phone IS NOT NULL
  AND trim(c.phone) <> ''
ON CONFLICT (contact_id, method_type, normalized_value, label) DO NOTHING;
