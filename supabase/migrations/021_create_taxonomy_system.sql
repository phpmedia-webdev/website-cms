-- Taxonomy System Migration
-- Creates taxonomy tables for categories and tags shared across posts, pages, and media
-- Supports hierarchical categories (like WordPress) and flat tags
-- IMPORTANT: Replace 'website_cms_template_dev' with your actual client schema name

-- Set search_path to the client schema
SET search_path TO website_cms_template_dev, public;

-- Taxonomy terms table (categories and tags)
CREATE TABLE IF NOT EXISTS taxonomy_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('category', 'tag')),
  parent_id UUID REFERENCES taxonomy_terms(id) ON DELETE CASCADE, -- For hierarchical categories
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taxonomy relationships table (many-to-many)
-- Links taxonomy terms to posts, pages, and media
CREATE TABLE IF NOT EXISTS taxonomy_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'page', 'media', 'gallery')),
  content_id UUID NOT NULL, -- References posts.id, pages.id, or media.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term_id, content_type, content_id)
);

-- Create default "Uncategorized" category
-- This is a special system category that cannot be deleted
INSERT INTO taxonomy_terms (name, slug, type) 
VALUES ('Uncategorized', 'uncategorized', 'category')
ON CONFLICT (slug) DO NOTHING;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_type ON taxonomy_terms(type);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_slug ON taxonomy_terms(slug);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_parent_id ON taxonomy_terms(parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_relationships_term_id ON taxonomy_relationships(term_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_relationships_content ON taxonomy_relationships(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_relationships_content_id ON taxonomy_relationships(content_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_taxonomy_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER taxonomy_terms_updated_at
  BEFORE UPDATE ON taxonomy_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_taxonomy_terms_updated_at();

-- Function to generate slug from name (lowercase, replace spaces with hyphens)
-- Used as default when creating new terms
CREATE OR REPLACE FUNCTION generate_taxonomy_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(input_name), '[^a-z0-9]+', '-', 'gi'));
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (if RLS is enabled)
-- Note: These assume RLS is enabled. Adjust based on your security model.
-- ALTER TABLE taxonomy_terms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE taxonomy_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read taxonomy terms
-- CREATE POLICY "taxonomy_terms_select" ON taxonomy_terms
--   FOR SELECT USING (true);

-- Policy: Allow authenticated users to manage taxonomy terms
-- CREATE POLICY "taxonomy_terms_all" ON taxonomy_terms
--   FOR ALL USING (true);

-- Policy: Allow authenticated users to read taxonomy relationships
-- CREATE POLICY "taxonomy_relationships_select" ON taxonomy_relationships
--   FOR SELECT USING (true);

-- Policy: Allow authenticated users to manage taxonomy relationships
-- CREATE POLICY "taxonomy_relationships_all" ON taxonomy_relationships
--   FOR ALL USING (true);
