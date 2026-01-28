-- Media Library - Consolidate and Fix All RPC Functions
-- This migration consolidates functions from migrations 028, 031, 034, 036, 037
-- CRITICAL: All functions use SET search_path = public, website_cms_template_dev (public FIRST)
-- This prevents infinite recursion when custom schema wrappers exist

-- ============================================================================
-- PUBLIC SCHEMA FUNCTIONS (Core Implementation)
-- ============================================================================

-- Function to generate slug from name (lowercase, replace spaces with hyphens)
CREATE OR REPLACE FUNCTION public.generate_media_slug(input_name TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, website_cms_template_dev
AS $$
BEGIN
  RETURN lower(regexp_replace(trim(input_name), '[^a-z0-9]+', '-', 'gi'));
END;
$$;

-- Function to get all media with variants
-- CRITICAL: search_path has public FIRST to prevent recursion
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
    m.created_at, m.updated_at
  ORDER BY m.created_at DESC;
END;
$$;

-- Function to get single media by ID with variants
-- CRITICAL: search_path has public FIRST to prevent recursion
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

-- Function to search media by name, slug, or description
-- Server-side search for better performance
CREATE OR REPLACE FUNCTION public.search_media(search_query TEXT)
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
  WHERE 
    m.name ILIKE '%' || search_query || '%' OR
    m.slug ILIKE '%' || search_query || '%' OR
    (m.description IS NOT NULL AND m.description ILIKE '%' || search_query || '%')
  GROUP BY 
    m.id, m.name, m.slug, m.description, m.alt_text,
    m.original_filename, m.original_format, m.original_size_bytes,
    m.original_width, m.original_height, m.mime_type,
    m.created_at, m.updated_at
  ORDER BY m.created_at DESC;
END;
$$;

-- Function to get media statistics
CREATE OR REPLACE FUNCTION public.get_media_stats()
RETURNS TABLE(
  total_count BIGINT,
  total_size_bytes BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, website_cms_template_dev
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COALESCE(SUM(original_size_bytes), 0)::BIGINT as total_size_bytes
  FROM website_cms_template_dev.media;
END;
$$;

-- ============================================================================
-- CUSTOM SCHEMA WRAPPER FUNCTIONS (For PostgREST Discovery)
-- ============================================================================

-- Wrapper function in custom schema that calls public schema function
-- CRITICAL: search_path has public FIRST so it resolves to public function
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

-- Wrapper for get_media_by_id
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

-- Wrapper for generate_media_slug
CREATE OR REPLACE FUNCTION website_cms_template_dev.generate_media_slug(input_name TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, website_cms_template_dev
AS $$
BEGIN
  RETURN public.generate_media_slug(input_name);
END;
$$;

-- Wrapper for search_media
CREATE OR REPLACE FUNCTION website_cms_template_dev.search_media(search_query TEXT)
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
  SELECT * FROM public.search_media(search_query);
END;
$$;

-- Wrapper for get_media_stats
CREATE OR REPLACE FUNCTION website_cms_template_dev.get_media_stats()
RETURNS TABLE(
  total_count BIGINT,
  total_size_bytes BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, website_cms_template_dev
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_media_stats();
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on public schema functions
GRANT EXECUTE ON FUNCTION public.generate_media_slug(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_media(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_stats() TO authenticated;  -- Stats only for authenticated users

-- Grant execute permissions on custom schema wrapper functions
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.generate_media_slug(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.search_media(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_stats() TO authenticated;

-- ============================================================================
-- REFRESH POSTGREST
-- ============================================================================

-- Refresh PostgREST to pick up new/updated functions
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration consolidates and fixes all media RPC functions:
-- - Replaces migrations 028, 031, 034, 036, 037
-- - All functions use correct search_path: public, website_cms_template_dev
-- - Prevents infinite recursion
-- - Adds new functions: search_media, get_media_stats
-- - Includes both public and custom schema wrappers for PostgREST discovery
--
-- CRITICAL: Always put 'public' FIRST in search_path to prevent recursion
-- when custom schema wrapper functions exist.
