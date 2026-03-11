-- File: 127_taxonomy_product_section_remove_page.sql
-- 1) Add Product as a taxonomy section (is_staple = true, non-deletable).
-- 2) Remove deprecated Page section from section_taxonomy_config.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Insert Product section (core; cannot be deleted in Taxonomy settings)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  is_staple,
  category_slugs,
  tag_slugs
)
VALUES
  ('product', 'Product', 'product', true, NULL, NULL)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

-- 2. Remove deprecated Page section (allow delete by clearing is_staple first; trigger blocks delete when is_staple = true)
UPDATE website_cms_template_dev.section_taxonomy_config
SET is_staple = false
WHERE section_name = 'page';

DELETE FROM website_cms_template_dev.section_taxonomy_config
WHERE section_name = 'page';
