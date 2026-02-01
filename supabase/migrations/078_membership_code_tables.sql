-- File: 078_membership_code_tables.sql
-- Membership code generator: batches and single-use codes.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

-- 1. membership_code_batches
CREATE TABLE IF NOT EXISTS website_cms_template_dev.membership_code_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mag_id UUID NOT NULL REFERENCES website_cms_template_dev.mags(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  use_type TEXT NOT NULL CHECK (use_type IN ('single_use', 'multi_use')),
  -- multi_use: one shared code
  code_hash TEXT,
  max_uses INT,
  use_count INT DEFAULT 0,
  -- single_use: generate many codes
  num_codes INT,
  -- common
  expires_at TIMESTAMPTZ,
  code_prefix TEXT,
  code_suffix TEXT,
  random_length INT DEFAULT 8,
  exclude_chars TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_membership_code_batches_mag_id ON website_cms_template_dev.membership_code_batches(mag_id);
CREATE INDEX IF NOT EXISTS idx_membership_code_batches_expires_at ON website_cms_template_dev.membership_code_batches(expires_at);

-- 2. membership_codes (single-use only; multi-use lives in batch)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.membership_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES website_cms_template_dev.membership_code_batches(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'redeemed')),
  redeemed_at TIMESTAMPTZ,
  redeemed_by_member_id UUID REFERENCES website_cms_template_dev.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_membership_codes_batch_id ON website_cms_template_dev.membership_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_membership_codes_status ON website_cms_template_dev.membership_codes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_codes_code_hash ON website_cms_template_dev.membership_codes(code_hash) WHERE status = 'available';

-- 3. RLS
ALTER TABLE website_cms_template_dev.membership_code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.membership_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to membership_code_batches"
  ON website_cms_template_dev.membership_code_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to membership_codes"
  ON website_cms_template_dev.membership_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.membership_code_batches TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.membership_codes TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
