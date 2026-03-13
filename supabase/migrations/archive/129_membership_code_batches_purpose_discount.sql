-- File: 129_membership_code_batches_purpose_discount.sql
-- Phase 09 Ecommerce Step 5: Add purpose (membership | discount | other) and discount fields to code batches.
-- When purpose = 'discount', mag_id can be null; discount_type, discount_value (and optional min_purchase, scope) apply at checkout.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add purpose column (what the batch is for: membership redemption vs ecommerce discount)
ALTER TABLE website_cms_template_dev.membership_code_batches
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'membership'
  CHECK (purpose IN ('membership', 'discount', 'other'));

-- 2. Allow mag_id to be null for discount/other batches
ALTER TABLE website_cms_template_dev.membership_code_batches
  ALTER COLUMN mag_id DROP NOT NULL;

-- 3. Discount fields (used when purpose = 'discount')
ALTER TABLE website_cms_template_dev.membership_code_batches
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS min_purchase NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS scope TEXT;

CREATE INDEX IF NOT EXISTS idx_membership_code_batches_purpose ON website_cms_template_dev.membership_code_batches(purpose);
