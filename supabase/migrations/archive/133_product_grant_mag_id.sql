-- File: 133_product_grant_mag_id.sql
-- Phase 09 Ecommerce Step 17: Link product to MAG granted on purchase (membership products).
-- When set, paying for this product grants the customer the given MAG (member record + crm_contact_mags).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS grant_mag_id UUID REFERENCES website_cms_template_dev.mags(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_grant_mag_id ON website_cms_template_dev.product(grant_mag_id) WHERE grant_mag_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.product.grant_mag_id IS 'When set, purchasing this product grants the customer this MAG (payment-to-MAG flow).';
