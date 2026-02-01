-- File: 079_membership_codes_display_and_redemptions.sql
-- Add code_plain for display, and membership_code_redemptions for multi-use redemption log.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev.

SET search_path TO website_cms_template_dev, public;

-- 1. Store plain code for display (single-use: at generation; multi-use: at creation)
ALTER TABLE website_cms_template_dev.membership_code_batches
  ADD COLUMN IF NOT EXISTS code_plain TEXT;

ALTER TABLE website_cms_template_dev.membership_codes
  ADD COLUMN IF NOT EXISTS code_plain TEXT;

-- 2. Redemption log for multi-use codes (who used when)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.membership_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES website_cms_template_dev.membership_code_batches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES website_cms_template_dev.members(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_code_redemptions_batch_id
  ON website_cms_template_dev.membership_code_redemptions(batch_id);

ALTER TABLE website_cms_template_dev.membership_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to membership_code_redemptions"
  ON website_cms_template_dev.membership_code_redemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.membership_code_redemptions TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
