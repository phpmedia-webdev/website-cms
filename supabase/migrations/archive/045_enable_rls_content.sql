-- Content model: Enable RLS and create policies (prd-technical Step 2)
-- Run after 044. Matches media pattern: authenticated full access, anon SELECT.

SET search_path TO website_cms_template_dev, public;

-- content_types
ALTER TABLE website_cms_template_dev.content_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to content_types"
  ON website_cms_template_dev.content_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to content_types"
  ON website_cms_template_dev.content_types
  FOR SELECT
  TO anon
  USING (true);

-- content_type_fields
ALTER TABLE website_cms_template_dev.content_type_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to content_type_fields"
  ON website_cms_template_dev.content_type_fields
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to content_type_fields"
  ON website_cms_template_dev.content_type_fields
  FOR SELECT
  TO anon
  USING (true);

-- content
ALTER TABLE website_cms_template_dev.content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to content"
  ON website_cms_template_dev.content
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to content"
  ON website_cms_template_dev.content
  FOR SELECT
  TO anon
  USING (true);
