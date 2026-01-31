-- File: 070_add_membership_taxonomy_section.sql
-- Add "Membership" section for grouping mag-tags in taxonomy.
-- Enables filtering tags by "Membership" in Taxonomy Settings.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  is_staple,
  category_slugs,
  tag_slugs
)
VALUES
  ('membership', 'Membership', 'media', true, NULL, NULL)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();
