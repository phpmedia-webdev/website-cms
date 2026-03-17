-- File: 134_template_content_type_and_taxonomy_section.sql
-- Step 21: Add Template as core content type (not deletable); add Template section in Taxonomy (staple, not deletable).
-- Template is excluded from main Content list in app code (CONTENT_LIST_EXCLUDED_TYPE_SLUGS).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add Template content type (core = not deletable in Settings > Customizer > Content types)
INSERT INTO website_cms_template_dev.content_types (slug, label, description, is_core, display_order)
VALUES
  ('template', 'Template', 'Email and other reusable templates; managed under Marketing > Templates. Use taxonomy for categories/tags.', true, 9)
ON CONFLICT (slug) DO NOTHING;

-- 2. Add Template section in Taxonomy (is_staple = not deletable in Settings > Taxonomy)
INSERT INTO website_cms_template_dev.section_taxonomy_config (section_name, display_name, content_type, category_slugs, tag_slugs, is_staple)
VALUES ('template', 'Templates', 'template', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

-- 3. Allow content_type = 'template' in taxonomy_relationships (if constraint uses IN list)
ALTER TABLE website_cms_template_dev.taxonomy_relationships
  DROP CONSTRAINT IF EXISTS taxonomy_relationships_content_type_check;

DO $$
BEGIN
  ALTER TABLE website_cms_template_dev.taxonomy_relationships
    ADD CONSTRAINT taxonomy_relationships_content_type_check
    CHECK (
      content_type IN ('post', 'page', 'media', 'gallery', 'event', 'crm_contact', 'template')
      OR (content_type ~ '^[a-z0-9_-]+$' AND length(content_type) > 0)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
