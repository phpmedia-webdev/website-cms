-- File: 136_product_downloadable_and_digital_links.sql
-- Step 25a/25b: Product delivery multi-select (shippable + downloadable); store real download URLs per product.
-- Run after 128 (product), 132 (order_items). Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema.

SET search_path TO website_cms_template_dev, public;

-- 1. Product: add downloadable flag and digital_delivery_links (JSONB array of { label, url })
ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS downloadable BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS digital_delivery_links JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN website_cms_template_dev.product.downloadable IS 'When true, product has digital delivery (e.g. PDF, file). Can be both shippable and downloadable (e.g. book + PDF).';
COMMENT ON COLUMN website_cms_template_dev.product.digital_delivery_links IS 'Array of { "label": "Part 1", "url": "https://..." } for download links. Never sent to customer as-is; use time-limited redirect.';

-- 2. Order items: add downloadable flag (set from product at order creation)
ALTER TABLE website_cms_template_dev.order_items
  ADD COLUMN IF NOT EXISTS downloadable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN website_cms_template_dev.order_items.downloadable IS 'Copied from product at order creation; used to show download links on order detail.';
