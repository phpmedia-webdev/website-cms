-- File: 148_tasks_taxonomy_section.sql
-- Phase 19: Add Tasks as a core taxonomy section (is_staple = true, not deletable).
-- Allow content_type = 'task' in taxonomy_relationships for linking tasks to categories (phases/milestones) and tags.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 0. Ensure is_staple exists (core sections are not deletable)
ALTER TABLE website_cms_template_dev.section_taxonomy_config
  ADD COLUMN IF NOT EXISTS is_staple BOOLEAN NOT NULL DEFAULT false;

-- 1. Add Tasks section (core; cannot be deleted in Taxonomy settings)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('task', 'Tasks', 'task', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

-- 2. Allow content_type = 'task' in taxonomy_relationships (drop and re-add constraint)
ALTER TABLE website_cms_template_dev.taxonomy_relationships
  DROP CONSTRAINT IF EXISTS taxonomy_relationships_content_type_check;

DO $$
BEGIN
  ALTER TABLE website_cms_template_dev.taxonomy_relationships
    ADD CONSTRAINT taxonomy_relationships_content_type_check
    CHECK (
      content_type IN ('post', 'page', 'media', 'gallery', 'event', 'crm_contact', 'template', 'project', 'task')
      OR (content_type ~ '^[a-z0-9_-]+$' AND length(content_type) > 0)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
