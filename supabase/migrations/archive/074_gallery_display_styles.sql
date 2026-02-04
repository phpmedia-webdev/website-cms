-- File: 074_gallery_display_styles.sql
-- Create gallery_display_styles table for Display Style presets per gallery.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.gallery_display_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES website_cms_template_dev.galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout TEXT NOT NULL DEFAULT 'grid' CHECK (layout IN ('grid', 'masonry', 'slider')),
  columns INTEGER NOT NULL DEFAULT 3 CHECK (columns >= 1 AND columns <= 6),
  gap TEXT NOT NULL DEFAULT 'md' CHECK (gap IN ('sm', 'md', 'lg')),
  size TEXT NOT NULL DEFAULT 'medium' CHECK (size IN ('thumbnail', 'small', 'medium', 'large', 'original')),
  captions BOOLEAN NOT NULL DEFAULT true,
  lightbox BOOLEAN NOT NULL DEFAULT true,
  border TEXT NOT NULL DEFAULT 'none' CHECK (border IN ('none', 'subtle', 'frame')),
  slider_animation TEXT CHECK (slider_animation IN ('slide', 'fade')),
  slider_autoplay BOOLEAN DEFAULT false,
  slider_delay INTEGER DEFAULT 5 CHECK (slider_delay IS NULL OR (slider_delay >= 1 AND slider_delay <= 30)),
  slider_controls TEXT CHECK (slider_controls IN ('arrows', 'dots', 'both', 'none')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_display_styles_gallery_id
  ON website_cms_template_dev.gallery_display_styles(gallery_id);

CREATE TRIGGER update_gallery_display_styles_updated_at
  BEFORE UPDATE ON website_cms_template_dev.gallery_display_styles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: allow authenticated users full access (same pattern as galleries)
ALTER TABLE website_cms_template_dev.gallery_display_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to gallery_display_styles"
  ON website_cms_template_dev.gallery_display_styles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon to read (for public gallery rendering)
CREATE POLICY "Allow anon read gallery_display_styles"
  ON website_cms_template_dev.gallery_display_styles
  FOR SELECT
  TO anon
  USING (true);

NOTIFY pgrst, 'reload config';
