-- File: 128_product_table.sql
-- Phase 09 Ecommerce Step 4: Related product table (tenant schema).
-- One row per product content; content_id FK to content.id (type Product). Image = content.featured_image_id + product.gallery_id → gallery_items.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL UNIQUE REFERENCES website_cms_template_dev.content(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_product_id TEXT,
  sku TEXT,
  stock_quantity INTEGER,
  gallery_id UUID REFERENCES website_cms_template_dev.galleries(id) ON DELETE SET NULL,
  taxable BOOLEAN NOT NULL DEFAULT true,
  shippable BOOLEAN NOT NULL DEFAULT false,
  available_for_purchase BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_content_id ON website_cms_template_dev.product(content_id);
CREATE INDEX IF NOT EXISTS idx_product_stripe_product_id ON website_cms_template_dev.product(stripe_product_id) WHERE stripe_product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_updated_at ON website_cms_template_dev.product;
CREATE TRIGGER product_updated_at
  BEFORE UPDATE ON website_cms_template_dev.product
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_product_updated_at();

ALTER TABLE website_cms_template_dev.product ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to product"
  ON website_cms_template_dev.product FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.product TO anon, authenticated;
