-- Media Library - Fix RPC Functions: Handle NULL variants
-- When no variants exist, jsonb_agg returns NULL - fix to return empty array

-- Fix get_media_with_variants to return empty array instead of NULL
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
    COALESCE(
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
      ) FILTER (WHERE v.id IS NOT NULL),
      '[]'::jsonb
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

-- Fix get_media_by_id to return empty array instead of NULL
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
    COALESCE(
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
      ) FILTER (WHERE v.id IS NOT NULL),
      '[]'::jsonb
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
