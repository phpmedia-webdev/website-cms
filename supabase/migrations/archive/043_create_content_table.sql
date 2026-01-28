-- Content model: content table (unified storage for posts, pages, snippets, etc.)
-- Client schema. Run after 042. References content_types, media.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID NOT NULL REFERENCES website_cms_template_dev.content_types(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  body JSONB,
  excerpt TEXT,
  featured_image_id UUID REFERENCES website_cms_template_dev.media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('placeholder', 'draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  author_id UUID,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  access_level TEXT,
  required_mag_id UUID,
  visibility_mode TEXT,
  restricted_message TEXT,
  section_restrictions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_content_content_type_id ON website_cms_template_dev.content(content_type_id);
CREATE INDEX IF NOT EXISTS idx_content_slug ON website_cms_template_dev.content(slug);
CREATE INDEX IF NOT EXISTS idx_content_status ON website_cms_template_dev.content(status);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON website_cms_template_dev.content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_updated_at ON website_cms_template_dev.content(updated_at DESC);

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_updated_at ON website_cms_template_dev.content;
CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON website_cms_template_dev.content
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_content_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.content TO anon, authenticated;
