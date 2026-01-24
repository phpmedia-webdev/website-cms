-- Media Library - Fix RPC Functions in Custom Schema
-- Explicitly create functions in website_cms_template_dev schema
-- PostgREST searches in the client's custom schema for RPC functions

-- Set search_path
SET search_path TO website_cms_template_dev, public;

-- Create wrapper function in custom schema that calls public schema function
CREATE OR REPLACE FUNCTION website_cms_template_dev.get_media_with_variants()
RETURNS TABLE(
  media_id uuid,
  name text,
  slug text,
  description text,
  alt_text text,
  original_filename text,
  original_format text,
  original_size_bytes int,
  original_width int,
  original_height int,
  mime_type text,
  created_at timestamptz,
  updated_at timestamptz,
  variants jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_media_with_variants();
END;
$$;

-- Create wrapper for get_media_by_id
CREATE OR REPLACE FUNCTION website_cms_template_dev.get_media_by_id(media_id_param uuid)
RETURNS TABLE(
  media_id uuid,
  name text,
  slug text,
  description text,
  alt_text text,
  original_filename text,
  original_format text,
  original_size_bytes int,
  original_width int,
  original_height int,
  mime_type text,
  created_at timestamptz,
  updated_at timestamptz,
  variants jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_media_by_id(media_id_param);
END;
$$;

-- Create wrapper for generate_media_slug
CREATE OR REPLACE FUNCTION website_cms_template_dev.generate_media_slug(input_name TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN public.generate_media_slug(input_name);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.generate_media_slug(TEXT) TO anon, authenticated;

-- Refresh PostgREST to pick up new functions
NOTIFY pgrst, 'reload schema';
