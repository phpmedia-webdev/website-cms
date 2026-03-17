-- File: 160_taxonomy_terms_color.sql
-- Add optional color to taxonomy_terms for categories and tags (e.g. hex #rrggbb).
-- Used by Edit Category / Edit Tag modals; enables color chips across sections (projects, tasks, etc.).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.taxonomy_terms
  ADD COLUMN IF NOT EXISTS color TEXT;

COMMENT ON COLUMN website_cms_template_dev.taxonomy_terms.color IS 'Optional color for the term (e.g. hex #rrggbb). Used for chips/badges in UI.';
