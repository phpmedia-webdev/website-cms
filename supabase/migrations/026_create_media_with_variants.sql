-- Media Library with Image Variants - Step 1: Create Tables
-- IMPORTANT: Replace 'website_cms_template_dev' with your actual client schema name

-- Set search_path to the client schema
SET search_path TO website_cms_template_dev, public;

-- Clean up from any previous failed attempts (use CASCADE for foreign key constraints)
DROP TRIGGER IF EXISTS media_updated_at ON website_cms_template_dev.media;
DROP FUNCTION IF EXISTS public.update_media_updated_at();
DROP TABLE IF EXISTS website_cms_template_dev.media_variants CASCADE;
DROP TABLE IF EXISTS website_cms_template_dev.media CASCADE;

-- Media base table (stores original upload information)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User-editable metadata
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  alt_text TEXT,
  
  -- Original file information (archived)
  original_filename TEXT NOT NULL,
  original_format TEXT NOT NULL, -- e.g., 'jpg', 'png', 'bmp', 'tga'
  original_size_bytes INT NOT NULL,
  original_width INT,
  original_height INT,
  
  -- MIME type for content negotiation
  mime_type TEXT,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: slug must be unique per client (already enforced by schema)
  UNIQUE(slug)
);

-- Media variants table (stores optimized versions)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.media_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES website_cms_template_dev.media(id) ON DELETE CASCADE,
  
  -- Variant metadata
  variant_type TEXT NOT NULL CHECK (variant_type IN ('original', 'thumbnail', 'small', 'medium', 'large')),
  format TEXT NOT NULL DEFAULT 'webp', -- Always webp for variants (except 'original' which preserves format)
  
  -- Storage information
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  
  -- Dimensions and size
  width INT,
  height INT,
  size_bytes INT,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one of each variant type per media
  UNIQUE(media_id, variant_type)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_slug ON website_cms_template_dev.media(slug);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON website_cms_template_dev.media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_variants_media_id ON website_cms_template_dev.media_variants(media_id);
CREATE INDEX IF NOT EXISTS idx_media_variants_type ON website_cms_template_dev.media_variants(variant_type);

-- Function to update media.updated_at timestamp (in public schema)
CREATE OR REPLACE FUNCTION public.update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update media.updated_at
CREATE TRIGGER media_updated_at
  BEFORE UPDATE ON website_cms_template_dev.media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_updated_at();

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.media_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.media_variants TO authenticated;
