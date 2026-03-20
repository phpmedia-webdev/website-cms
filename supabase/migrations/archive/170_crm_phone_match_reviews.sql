-- File: 170_crm_phone_match_reviews.sql
-- CRM: persist phone-based organization/contact match suggestions and review decisions.
-- Stores suggestions, confirmations, and rejections without deleting history.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.contact_organization_match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES website_cms_template_dev.organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'rejected')),
  source TEXT NOT NULL DEFAULT 'phone',
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, organization_id, phone, source)
);

CREATE INDEX IF NOT EXISTS idx_contact_org_match_reviews_status
  ON website_cms_template_dev.contact_organization_match_reviews(status);

CREATE INDEX IF NOT EXISTS idx_contact_org_match_reviews_contact_id
  ON website_cms_template_dev.contact_organization_match_reviews(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_org_match_reviews_organization_id
  ON website_cms_template_dev.contact_organization_match_reviews(organization_id);

ALTER TABLE website_cms_template_dev.contact_organization_match_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access contact_organization_match_reviews"
  ON website_cms_template_dev.contact_organization_match_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.contact_organization_match_reviews TO service_role;
