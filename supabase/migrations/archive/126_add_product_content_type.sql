-- File: 126_add_product_content_type.sql
-- Phase 09 Ecommerce Step 2: Add Product as a core content type.
-- Shown in Settings > Customizer > Content types and Settings > Taxonomy; hidden from main Content list (managed under Ecommerce > Products).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.content_types (slug, label, description, is_core, display_order)
VALUES
  ('product', 'Product', 'Sellable item; managed under Ecommerce > Products. Use taxonomy for categories/tags.', true, 8)
ON CONFLICT (slug) DO NOTHING;
