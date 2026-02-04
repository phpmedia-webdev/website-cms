-- File: 075_gallery_display_styles_cell_size.sql
-- Add cell_size column for gallery physical display scale (xsmall, small, medium, large, xlarge).
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.gallery_display_styles
  ADD COLUMN IF NOT EXISTS cell_size TEXT NOT NULL DEFAULT 'medium'
  CHECK (cell_size IN ('xsmall', 'small', 'medium', 'large', 'xlarge'));

NOTIFY pgrst, 'reload config';
