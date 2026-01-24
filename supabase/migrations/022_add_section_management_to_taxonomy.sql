-- Add Section Management to Taxonomy System
-- Extends taxonomy system with section-based filtering and configuration
-- IMPORTANT: Replace 'website_cms_template_dev' with your actual client schema name

-- Set search_path to the client schema
SET search_path TO website_cms_template_dev, public;

-- Update taxonomy_relationships to include 'gallery' in content_type constraint
-- (If 021 was run before this update, the constraint needs to be updated)
DO $$
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE taxonomy_relationships 
    DROP CONSTRAINT IF EXISTS taxonomy_relationships_content_type_check;
  
  -- Add the new constraint with 'gallery' included
  ALTER TABLE taxonomy_relationships 
    ADD CONSTRAINT taxonomy_relationships_content_type_check 
    CHECK (content_type IN ('post', 'page', 'media', 'gallery'));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or is named differently, try to add it
    -- This handles cases where the table structure might vary
    NULL;
END $$;

-- Add suggested_sections column to taxonomy_terms
-- This stores which sections a term is suggested for when created
ALTER TABLE taxonomy_terms 
ADD COLUMN IF NOT EXISTS suggested_sections TEXT[];

-- Create section taxonomy configuration table
-- This allows fine-tuning which terms each section actually uses
CREATE TABLE IF NOT EXISTS section_taxonomy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT UNIQUE NOT NULL, -- 'blog', 'portfolio', 'news', etc.
  display_name TEXT NOT NULL, -- "Blog", "Portfolio", "News"
  content_type TEXT NOT NULL DEFAULT 'post', -- 'post', 'page', 'media', 'gallery'
  category_slugs TEXT[], -- Selected category slugs (null = use suggested, [] = none)
  tag_slugs TEXT[], -- Selected tag slugs (null = use suggested, [] = none)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for section lookups
CREATE INDEX IF NOT EXISTS idx_section_taxonomy_config_section_name ON section_taxonomy_config(section_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_section_taxonomy_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER section_taxonomy_config_updated_at
  BEFORE UPDATE ON section_taxonomy_config
  FOR EACH ROW
  EXECUTE FUNCTION update_section_taxonomy_config_updated_at();

-- Insert default sections (can be customized per client)
INSERT INTO section_taxonomy_config (section_name, display_name, content_type, category_slugs, tag_slugs)
VALUES 
  ('blog', 'Blog', 'post', NULL, NULL), -- NULL = use suggested sections from terms
  ('portfolio', 'Portfolio', 'post', NULL, NULL),
  ('news', 'News', 'post', NULL, NULL)
ON CONFLICT (section_name) DO NOTHING;
