-- File: 130_product_visibility_mag_ids.sql
-- Add visibility_mag_ids to product: which membership(s) can see this product on the shop.
-- Independent of content.required_mag_id (grant on purchase). Enables e.g. parent membership
-- can see product that grants a different membership on purchase.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS visibility_mag_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN website_cms_template_dev.product.visibility_mag_ids IS 'MAG ids that can see this product on the shop. When content.access_level=mag for this product, shop uses this list (or content.required_mag_id if this is empty).';
