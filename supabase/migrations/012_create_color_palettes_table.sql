-- Color Palettes table for storing predefined and custom color palettes
-- This allows users to save, browse, and apply color palette combinations
-- Note: Replace 'website_cms_template_dev' with your client schema name

CREATE TABLE IF NOT EXISTS website_cms_template_dev.color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  colors JSONB NOT NULL, -- The 15-color palette object matching ColorPalette interface
  is_predefined BOOLEAN DEFAULT false, -- true for system palettes, false for user-created
  tags TEXT[], -- For categorization and filtering (e.g., 'material', 'tailwind', 'dark', 'vibrant')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_color_palettes_is_predefined ON website_cms_template_dev.color_palettes(is_predefined);
CREATE INDEX IF NOT EXISTS idx_color_palettes_tags ON website_cms_template_dev.color_palettes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_color_palettes_name ON website_cms_template_dev.color_palettes(name);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_color_palettes_updated_at BEFORE UPDATE ON website_cms_template_dev.color_palettes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.color_palettes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.color_palettes TO authenticated;
