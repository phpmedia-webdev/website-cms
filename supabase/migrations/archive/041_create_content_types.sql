-- Content model: content_types table (unified content model)
-- Defines core and custom content types (post, page, snippet, quote, article, portfolio, etc.)
-- Client schema. Run after 040.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_core BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_types_slug ON website_cms_template_dev.content_types(slug);
CREATE INDEX IF NOT EXISTS idx_content_types_display_order ON website_cms_template_dev.content_types(display_order);

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_content_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_types_updated_at ON website_cms_template_dev.content_types;
CREATE TRIGGER content_types_updated_at
  BEFORE UPDATE ON website_cms_template_dev.content_types
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_content_types_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.content_types TO anon, authenticated;
