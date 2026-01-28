-- Master Migration: Move Taxonomy Tables to Client Schema
-- This migration fixes taxonomy tables that were created in public schema
-- and moves them to the proper client schema for per-client isolation
-- IMPORTANT: Replace 'website_cms_template_dev' with your actual client schema name

-- Set search_path to the client schema
SET search_path TO website_cms_template_dev, public;

-- Step 1: Create tables in client schema FIRST (before moving data)
-- This ensures tables exist before we try to insert data

-- Taxonomy terms table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.taxonomy_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('category', 'tag')),
  parent_id UUID REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE CASCADE,
  description TEXT,
  suggested_sections TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taxonomy relationships table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.taxonomy_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES website_cms_template_dev.taxonomy_terms(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'page', 'media', 'gallery')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term_id, content_type, content_id)
);

-- Section taxonomy config table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.section_taxonomy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'post',
  category_slugs TEXT[],
  tag_slugs TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_type ON website_cms_template_dev.taxonomy_terms(type);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_slug ON website_cms_template_dev.taxonomy_terms(slug);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_parent_id ON website_cms_template_dev.taxonomy_terms(parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_relationships_term_id ON website_cms_template_dev.taxonomy_relationships(term_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_relationships_content ON website_cms_template_dev.taxonomy_relationships(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_relationships_content_id ON website_cms_template_dev.taxonomy_relationships(content_id);
CREATE INDEX IF NOT EXISTS idx_section_taxonomy_config_section_name ON website_cms_template_dev.section_taxonomy_config(section_name);

-- Step 3: Create functions in client schema (if they don't exist)
CREATE OR REPLACE FUNCTION website_cms_template_dev.update_taxonomy_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_section_taxonomy_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION website_cms_template_dev.generate_taxonomy_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(input_name), '[^a-z0-9]+', '-', 'gi'));
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create triggers (drop and recreate to ensure they're correct)
DROP TRIGGER IF EXISTS taxonomy_terms_updated_at ON website_cms_template_dev.taxonomy_terms;
CREATE TRIGGER taxonomy_terms_updated_at
  BEFORE UPDATE ON website_cms_template_dev.taxonomy_terms
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_taxonomy_terms_updated_at();

DROP TRIGGER IF EXISTS section_taxonomy_config_updated_at ON website_cms_template_dev.section_taxonomy_config;
CREATE TRIGGER section_taxonomy_config_updated_at
  BEFORE UPDATE ON website_cms_template_dev.section_taxonomy_config
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_section_taxonomy_config_updated_at();

-- Step 5: Move data from public schema to client schema (if tables exist in public)
DO $$
DECLARE
  table_exists_in_public BOOLEAN;
  has_suggested_sections BOOLEAN;
BEGIN
  -- Check if taxonomy_terms exists in public schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'taxonomy_terms'
  ) INTO table_exists_in_public;
  
  -- If tables exist in public, move data to client schema
  IF table_exists_in_public THEN
    RAISE NOTICE 'Moving taxonomy data from public schema to client schema...';
    
    -- Check if suggested_sections column exists in public.taxonomy_terms
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'taxonomy_terms' 
        AND column_name = 'suggested_sections'
    ) INTO has_suggested_sections;
    
    -- Move data from public to client schema
    -- Handle suggested_sections column based on whether it exists
    IF has_suggested_sections THEN
      INSERT INTO website_cms_template_dev.taxonomy_terms 
        (id, name, slug, type, parent_id, description, suggested_sections, created_at, updated_at)
      SELECT 
        id, 
        name, 
        slug, 
        type, 
        parent_id, 
        description, 
        suggested_sections,
        created_at, 
        updated_at
      FROM public.taxonomy_terms
      ON CONFLICT (slug) DO NOTHING;
    ELSE
      -- Column doesn't exist, use NULL for suggested_sections
      INSERT INTO website_cms_template_dev.taxonomy_terms 
        (id, name, slug, type, parent_id, description, suggested_sections, created_at, updated_at)
      SELECT 
        id, 
        name, 
        slug, 
        type, 
        parent_id, 
        description, 
        NULL::TEXT[] as suggested_sections,
        created_at, 
        updated_at
      FROM public.taxonomy_terms
      ON CONFLICT (slug) DO NOTHING;
    END IF;
    
    INSERT INTO website_cms_template_dev.taxonomy_relationships 
      (id, term_id, content_type, content_id, created_at)
    SELECT 
      id, 
      term_id, 
      content_type, 
      content_id, 
      created_at
    FROM public.taxonomy_relationships
    ON CONFLICT (term_id, content_type, content_id) DO NOTHING;
    
    -- Check if section_taxonomy_config exists in public before trying to migrate
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'section_taxonomy_config'
    ) THEN
      INSERT INTO website_cms_template_dev.section_taxonomy_config 
        (id, section_name, display_name, content_type, category_slugs, tag_slugs, created_at, updated_at)
      SELECT 
        id, 
        section_name, 
        display_name, 
        content_type, 
        category_slugs, 
        tag_slugs, 
        created_at, 
        updated_at
      FROM public.section_taxonomy_config
      ON CONFLICT (section_name) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Data migration completed. You may now drop tables from public schema if desired.';
  ELSE
    RAISE NOTICE 'No tables found in public schema. Using client schema only.';
  END IF;
END $$;

-- Step 6: Insert default "Uncategorized" category if it doesn't exist
INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type) 
VALUES ('Uncategorized', 'uncategorized', 'category')
ON CONFLICT (slug) DO NOTHING;

-- Step 7: Insert default sections if they don't exist
INSERT INTO website_cms_template_dev.section_taxonomy_config (section_name, display_name, content_type, category_slugs, tag_slugs)
VALUES 
  ('blog', 'Blog', 'post', NULL, NULL),
  ('portfolio', 'Portfolio', 'post', NULL, NULL),
  ('news', 'News', 'post', NULL, NULL)
ON CONFLICT (section_name) DO NOTHING;

-- Step 8: Grant permissions on client schema tables
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.taxonomy_terms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.taxonomy_relationships TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.section_taxonomy_config TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon, authenticated;

-- Step 9: Optional - Drop tables from public schema if they exist and data was migrated
-- Uncomment the following lines if you want to remove the old tables from public schema
-- WARNING: Only do this after verifying data was successfully migrated!
/*
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'taxonomy_terms') THEN
    DROP TABLE IF EXISTS public.taxonomy_relationships CASCADE;
    DROP TABLE IF EXISTS public.section_taxonomy_config CASCADE;
    DROP TABLE IF EXISTS public.taxonomy_terms CASCADE;
    RAISE NOTICE 'Old taxonomy tables removed from public schema.';
  END IF;
END $$;
*/

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Taxonomy migration to client schema completed successfully!';
END $$;
