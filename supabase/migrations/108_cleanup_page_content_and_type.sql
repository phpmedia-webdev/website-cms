-- File: 108_cleanup_page_content_and_type.sql
-- Remove all content rows that use the Page content type, then remove the Page type.
-- Page is no longer used; structure is built in code. Run after 107.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Remove taxonomy relationships for content that uses the Page type (avoids orphan rows)
DELETE FROM website_cms_template_dev.taxonomy_relationships
WHERE content_type = 'page'
  AND content_id IN (
    SELECT c.id
    FROM website_cms_template_dev.content c
    JOIN website_cms_template_dev.content_types ct ON ct.id = c.content_type_id
    WHERE ct.slug = 'page'
  );

-- 2. Delete content rows that use the Page type
DELETE FROM website_cms_template_dev.content
WHERE content_type_id IN (
  SELECT id FROM website_cms_template_dev.content_types WHERE slug = 'page'
);

-- 3. Remove the Page content type
DELETE FROM website_cms_template_dev.content_types
WHERE slug = 'page';
