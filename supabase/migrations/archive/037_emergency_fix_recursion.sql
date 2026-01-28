-- EMERGENCY FIX: Stop infinite recursion in get_media_with_variants
-- The issue: search_path resolution causing function to call itself

-- First, drop the problematic functions to stop the recursion immediately
DROP FUNCTION IF EXISTS public.get_media_with_variants() CASCADE;
DROP FUNCTION IF EXISTS website_cms_template_dev.get_media_with_variants() CASCADE;
DROP FUNCTION IF EXISTS public.get_media_by_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS website_cms_template_dev.get_media_by_id(uuid) CASCADE;

-- Recreate the public schema function with explicit schema qualification
-- CRITICAL: search_path must have public FIRST to avoid recursion
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
SET search_path = public, website_cms_template_dev
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

-- Recreate get_media_by_id in public schema
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
SET search_path = public, website_cms_template_dev
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

-- Recreate the custom schema wrapper function
-- This one calls public.get_media_with_variants() with explicit schema
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
SET search_path = public, website_cms_template_dev
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_media_with_variants();
END;
$$;

-- Recreate get_media_by_id wrapper
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
SET search_path = public, website_cms_template_dev
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_media_by_id(media_id_param);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_by_id(uuid) TO anon, authenticated;

-- Refresh PostgREST
NOTIFY pgrst, 'reload schema';
