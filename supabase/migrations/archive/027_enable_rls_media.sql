-- Media Library - Step 2: Enable RLS and Create Policies

-- Enable RLS on media table
ALTER TABLE website_cms_template_dev.media ENABLE ROW LEVEL SECURITY;

-- Enable RLS on media_variants table
ALTER TABLE website_cms_template_dev.media_variants ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users full access to media
CREATE POLICY "Allow authenticated users full access to media"
  ON website_cms_template_dev.media
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public read access to media
CREATE POLICY "Allow public read access to media"
  ON website_cms_template_dev.media
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated users full access to media_variants
CREATE POLICY "Allow authenticated users full access to media_variants"
  ON website_cms_template_dev.media_variants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public read access to media_variants
CREATE POLICY "Allow public read access to media_variants"
  ON website_cms_template_dev.media_variants
  FOR SELECT
  TO anon
  USING (true);
