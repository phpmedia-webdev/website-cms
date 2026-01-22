-- Enable RLS and create policies for color_palettes table
-- This allows authenticated users (admins) to access color palettes

-- Enable RLS on color_palettes table
ALTER TABLE website_cms_template_dev.color_palettes ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (full access)
-- Admins can view, create, update, and delete color palettes
CREATE POLICY "Allow authenticated users full access to color_palettes"
  ON website_cms_template_dev.color_palettes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow public read access to predefined palettes (optional - for public API access)
-- This allows the public site to potentially read predefined palettes if needed
CREATE POLICY "Allow public read access to predefined palettes"
  ON website_cms_template_dev.color_palettes
  FOR SELECT
  TO anon
  USING (is_predefined = true);
