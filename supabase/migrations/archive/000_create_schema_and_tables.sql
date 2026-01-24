-- Complete schema setup for Website CMS
-- Run this in Supabase SQL Editor to create the client schema and all tables

-- Step 1: Create the client schema
CREATE SCHEMA IF NOT EXISTS website_cms_template_dev;

-- Step 2: Set search_path to the new schema (so all subsequent commands run in that schema)
SET search_path TO website_cms_template_dev, public;

-- Step 3: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 4: Create the update_updated_at_column function (needed by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create all tables

-- Media table (images and video URLs)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  provider TEXT CHECK (provider IN ('supabase', 'vimeo', 'youtube', 'adilo')),
  filename TEXT,
  mime_type TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table (blog posts)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content JSONB,
  excerpt TEXT,
  featured_image_id UUID REFERENCES website_cms_template_dev.media(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galleries table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image_id UUID REFERENCES website_cms_template_dev.media(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery items table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES website_cms_template_dev.galleries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES website_cms_template_dev.media(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, media_id)
);

-- Forms table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  fields JSONB NOT NULL,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions table (lightweight CRM)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES website_cms_template_dev.forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'archived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS website_cms_template_dev.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations table (third-party script configuration)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'google_analytics', 'visitor_tracking', 'simple_commenter'
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}', -- Vendor-specific configuration (measurement_id, websiteId, domain, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON website_cms_template_dev.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON website_cms_template_dev.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON website_cms_template_dev.posts(published_at);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON website_cms_template_dev.galleries(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_items_gallery_id ON website_cms_template_dev.gallery_items(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_position ON website_cms_template_dev.gallery_items(gallery_id, position);
CREATE INDEX IF NOT EXISTS idx_media_type ON website_cms_template_dev.media(type);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON website_cms_template_dev.forms(slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON website_cms_template_dev.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON website_cms_template_dev.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON website_cms_template_dev.form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_integrations_name ON website_cms_template_dev.integrations(name);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON website_cms_template_dev.integrations(enabled);

-- Step 7: Create triggers to automatically update updated_at
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON website_cms_template_dev.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_galleries_updated_at BEFORE UPDATE ON website_cms_template_dev.galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON website_cms_template_dev.forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON website_cms_template_dev.form_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON website_cms_template_dev.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON website_cms_template_dev.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Insert default integration entries (disabled by default)
INSERT INTO website_cms_template_dev.integrations (name, enabled, config) VALUES
  ('google_analytics', false, '{"measurement_id": ""}'),
  ('visitor_tracking', false, '{"websiteId": ""}'),
  ('simple_commenter', false, '{"domain": ""}')
ON CONFLICT (name) DO NOTHING;

-- Step 9: Grant permissions (adjust as needed for your RLS policies)
-- Note: You may need to adjust these based on your Row Level Security (RLS) setup
-- IMPORTANT: Both anon and authenticated roles need permissions for PostgREST to work
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON SCHEMA website_cms_template_dev TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO authenticated;

-- Verify: Check that tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'website_cms_template_dev' 
ORDER BY table_name;
