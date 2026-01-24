-- Media Library - Step 3: Create RPC Functions (PUBLIC SCHEMA)
-- CRITICAL: These functions bypass PostgREST schema search issues
-- Functions are in public schema with SECURITY DEFINER to access custom schema

-- Function to generate slug from name (lowercase, replace spaces with hyphens)
CREATE OR REPLACE FUNCTION public.generate_media_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(input_name), '[^a-z0-9]+', '-', 'gi'));
END;
$$ LANGUAGE plpgsql;

-- Function to get media with all variants
CREATE OR REPLACE FUNCTION public.get_media_with_variants()
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
  SELECT 
    m.id,
    m.name,
    m.slug,
    m.description,
    m.alt_text,
    m.original_filename,
    m.original_format,
    m.original_size_bytes,
    m.original_width,
    m.original_height,
    m.mime_type,
    m.created_at,
    m.updated_at,
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'variant_type', v.variant_type,
        'format', v.format,
        'url', v.url,
        'storage_path', v.storage_path,
        'width', v.width,
        'height', v.height,
        'size_bytes', v.size_bytes,
        'created_at', v.created_at
      )
    ) as variants
  FROM website_cms_template_dev.media m
  LEFT JOIN website_cms_template_dev.media_variants v ON m.id = v.media_id
  GROUP BY 
    m.id, m.name, m.slug, m.description, m.alt_text,
    m.original_filename, m.original_format, m.original_size_bytes,
    m.original_width, m.original_height, m.mime_type,
    m.created_at, m.updated_at;
END;
$$;

-- Function to get single media by ID with variants
CREATE OR REPLACE FUNCTION public.get_media_by_id(media_id_param uuid)
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
  SELECT 
    m.id,
    m.name,
    m.slug,
    m.description,
    m.alt_text,
    m.original_filename,
    m.original_format,
    m.original_size_bytes,
    m.original_width,
    m.original_height,
    m.mime_type,
    m.created_at,
    m.updated_at,
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'variant_type', v.variant_type,
        'format', v.format,
        'url', v.url,
        'storage_path', v.storage_path,
        'width', v.width,
        'height', v.height,
        'size_bytes', v.size_bytes,
        'created_at', v.created_at
      )
    ) as variants
  FROM website_cms_template_dev.media m
  LEFT JOIN website_cms_template_dev.media_variants v ON m.id = v.media_id
  WHERE m.id = media_id_param
  GROUP BY 
    m.id, m.name, m.slug, m.description, m.alt_text,
    m.original_filename, m.original_format, m.original_size_bytes,
    m.original_width, m.original_height, m.mime_type,
    m.created_at, m.updated_at;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.generate_media_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_media_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_with_variants() TO anon;
GRANT EXECUTE ON FUNCTION public.get_media_with_variants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_by_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_media_by_id(uuid) TO authenticated;
