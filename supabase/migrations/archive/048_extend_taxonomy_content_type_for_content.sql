-- Extend taxonomy_relationships.content_type to allow content_types.slug values
-- (post, page, snippet, quote, article, portfolio, etc.) for unified content model.
-- Run after 047.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.taxonomy_relationships
  DROP CONSTRAINT IF EXISTS taxonomy_relationships_content_type_check;

ALTER TABLE website_cms_template_dev.taxonomy_relationships
  ADD CONSTRAINT taxonomy_relationships_content_type_check
  CHECK (
    content_type IN ('post', 'page', 'media', 'gallery')
    OR (content_type ~ '^[a-z0-9_-]+$' AND length(content_type) > 0)
  );
