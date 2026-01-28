-- Staple taxonomy sections: add is_staple column and seed 9 template sections.
-- Staple sections cannot be deleted (enforced by API/UI). Run after 050.

SET search_path TO website_cms_template_dev, public;

-- Add is_staple column
ALTER TABLE website_cms_template_dev.section_taxonomy_config
  ADD COLUMN IF NOT EXISTS is_staple BOOLEAN NOT NULL DEFAULT false;

-- Seed 9 staple sections (section_name lowercase, display_name human-case, content_type per sessionlog)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  is_staple,
  category_slugs,
  tag_slugs
)
VALUES
  ('article', 'Article', 'post', true, NULL, NULL),
  ('crm', 'CRM', 'crm', true, NULL, NULL),
  ('image', 'Image', 'media', true, NULL, NULL),
  ('page', 'Page', 'post', true, NULL, NULL),
  ('portfolio', 'Portfolio', 'post', true, NULL, NULL),
  ('post', 'Post', 'post', true, NULL, NULL),
  ('snippet', 'Snippet', 'post', true, NULL, NULL),
  ('quote', 'Quote', 'post', true, NULL, NULL),
  ('video', 'Video', 'media', true, NULL, NULL)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();
