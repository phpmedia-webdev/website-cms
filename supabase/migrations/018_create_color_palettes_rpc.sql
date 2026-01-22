-- Create RPC functions for color_palettes table
-- This bypasses PostgREST schema search issues by using functions in public schema
-- Similar approach to how settings are queried

-- Function to get all color palettes
CREATE OR REPLACE FUNCTION public.get_color_palettes()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  colors JSONB,
  is_predefined BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.description,
    cp.colors,
    cp.is_predefined,
    cp.tags,
    cp.created_at,
    cp.updated_at
  FROM website_cms_template_dev.color_palettes cp
  ORDER BY cp.is_predefined DESC, cp.name ASC;
END;
$$;

-- Function to get predefined color palettes only
CREATE OR REPLACE FUNCTION public.get_predefined_color_palettes()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  colors JSONB,
  is_predefined BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.description,
    cp.colors,
    cp.is_predefined,
    cp.tags,
    cp.created_at,
    cp.updated_at
  FROM website_cms_template_dev.color_palettes cp
  WHERE cp.is_predefined = true
  ORDER BY cp.name ASC;
END;
$$;

-- Function to get custom color palettes only
CREATE OR REPLACE FUNCTION public.get_custom_color_palettes()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  colors JSONB,
  is_predefined BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.description,
    cp.colors,
    cp.is_predefined,
    cp.tags,
    cp.created_at,
    cp.updated_at
  FROM website_cms_template_dev.color_palettes cp
  WHERE cp.is_predefined = false
  ORDER BY cp.created_at DESC;
END;
$$;

-- Function to get a single color palette by ID
CREATE OR REPLACE FUNCTION public.get_color_palette_by_id(palette_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  colors JSONB,
  is_predefined BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.description,
    cp.colors,
    cp.is_predefined,
    cp.tags,
    cp.created_at,
    cp.updated_at
  FROM website_cms_template_dev.color_palettes cp
  WHERE cp.id = palette_id
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_color_palettes() TO anon;
GRANT EXECUTE ON FUNCTION public.get_color_palettes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_predefined_color_palettes() TO anon;
GRANT EXECUTE ON FUNCTION public.get_predefined_color_palettes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_custom_color_palettes() TO anon;
GRANT EXECUTE ON FUNCTION public.get_custom_color_palettes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_color_palette_by_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_color_palette_by_id(UUID) TO authenticated;
