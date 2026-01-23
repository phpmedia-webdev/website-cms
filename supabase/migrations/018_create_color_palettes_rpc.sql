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

-- Function to create a new custom color palette
CREATE OR REPLACE FUNCTION public.create_color_palette(
  palette_name TEXT,
  palette_description TEXT,
  palette_colors JSONB,
  palette_tags TEXT[]
)
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
DECLARE
  new_palette website_cms_template_dev.color_palettes%ROWTYPE;
BEGIN
  INSERT INTO website_cms_template_dev.color_palettes (
    name,
    description,
    colors,
    is_predefined,
    tags
  )
  VALUES (
    palette_name,
    palette_description,
    palette_colors,
    false,
    COALESCE(palette_tags, ARRAY[]::TEXT[])
  )
  RETURNING * INTO new_palette;
  
  RETURN QUERY
  SELECT 
    new_palette.id,
    new_palette.name,
    new_palette.description,
    new_palette.colors,
    new_palette.is_predefined,
    new_palette.tags,
    new_palette.created_at,
    new_palette.updated_at;
END;
$$;

-- Function to update a custom color palette
CREATE OR REPLACE FUNCTION public.update_color_palette(
  palette_id UUID,
  palette_name TEXT,
  palette_description TEXT,
  palette_colors JSONB,
  palette_tags TEXT[]
)
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
DECLARE
  updated_palette website_cms_template_dev.color_palettes%ROWTYPE;
BEGIN
  UPDATE website_cms_template_dev.color_palettes
  SET 
    name = COALESCE(palette_name, name),
    description = COALESCE(palette_description, description),
    colors = COALESCE(palette_colors, colors),
    tags = COALESCE(palette_tags, tags),
    updated_at = NOW()
  WHERE id = palette_id
    AND is_predefined = false
  RETURNING * INTO updated_palette;
  
  IF updated_palette.id IS NULL THEN
    RAISE EXCEPTION 'Palette not found or is predefined';
  END IF;
  
  RETURN QUERY
  SELECT 
    updated_palette.id,
    updated_palette.name,
    updated_palette.description,
    updated_palette.colors,
    updated_palette.is_predefined,
    updated_palette.tags,
    updated_palette.created_at,
    updated_palette.updated_at;
END;
$$;

-- Function to delete a custom color palette
CREATE OR REPLACE FUNCTION public.delete_color_palette(palette_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  DELETE FROM website_cms_template_dev.color_palettes
  WHERE id = palette_id
    AND is_predefined = false;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Palette not found or is predefined';
  END IF;
  
  RETURN true;
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
GRANT EXECUTE ON FUNCTION public.create_color_palette(TEXT, TEXT, JSONB, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION public.create_color_palette(TEXT, TEXT, JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_color_palette(UUID, TEXT, TEXT, JSONB, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION public.update_color_palette(UUID, TEXT, TEXT, JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_color_palette(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_color_palette(UUID) TO authenticated;
