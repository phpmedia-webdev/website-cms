-- Content model: content_type_fields table
-- Defines custom fields per content type. Values stored in content.custom_fields[key].
-- Client schema. Run after 041.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.content_type_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID NOT NULL REFERENCES website_cms_template_dev.content_types(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  config JSONB NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type_id, key)
);

CREATE INDEX IF NOT EXISTS idx_content_type_fields_content_type_id ON website_cms_template_dev.content_type_fields(content_type_id);
CREATE INDEX IF NOT EXISTS idx_content_type_fields_display_order ON website_cms_template_dev.content_type_fields(content_type_id, display_order);

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_content_type_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_type_fields_updated_at ON website_cms_template_dev.content_type_fields;
CREATE TRIGGER content_type_fields_updated_at
  BEFORE UPDATE ON website_cms_template_dev.content_type_fields
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_content_type_fields_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.content_type_fields TO anon, authenticated;
