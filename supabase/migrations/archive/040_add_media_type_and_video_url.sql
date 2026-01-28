-- Media Library - Add media_type and video_url
-- Supports images (incl. GIF) vs videos; video URL-only (YouTube, Vimeo, Adilo)
-- Run after 038 (media RPCs). Backfill: existing rows get media_type = 'image'.

SET search_path TO website_cms_template_dev, public;

-- Add columns to media
ALTER TABLE website_cms_template_dev.media
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

ALTER TABLE website_cms_template_dev.media
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Index for filtering by type (Images / Videos / All)
CREATE INDEX IF NOT EXISTS idx_media_media_type ON website_cms_template_dev.media(media_type);

-- Backfill existing rows (in case default was not applied)
UPDATE website_cms_template_dev.media SET media_type = 'image' WHERE media_type IS NULL;

-- Drop existing RPCs so return type can change (PostgreSQL disallows changing OUT params via CREATE OR REPLACE)
-- Drop custom schema wrappers first (they depend on public); then drop public. Explicit DROP ensures both go.
DROP FUNCTION IF EXISTS website_cms_template_dev.get_media_with_variants() CASCADE;
DROP FUNCTION IF EXISTS website_cms_template_dev.get_media_by_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS website_cms_template_dev.search_media(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_media_with_variants() CASCADE;
DROP FUNCTION IF EXISTS public.get_media_by_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.search_media(text) CASCADE;

-- Recreate RPC: get_media_with_variants (add media_type, video_url to return)
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
  media_type text,
  video_url text,
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
    m.media_type,
    m.video_url,
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
    ) AS variants
  FROM website_cms_template_dev.media m
  LEFT JOIN website_cms_template_dev.media_variants v ON m.id = v.media_id
  GROUP BY
    m.id, m.name, m.slug, m.description, m.alt_text,
    m.original_filename, m.original_format, m.original_size_bytes,
    m.original_width, m.original_height, m.mime_type,
    m.media_type, m.video_url,
    m.created_at, m.updated_at
  ORDER BY m.created_at DESC;
END;
$$;

-- Update RPC: get_media_by_id
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
  media_type text,
  video_url text,
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
    m.media_type,
    m.video_url,
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
    ) AS variants
  FROM website_cms_template_dev.media m
  LEFT JOIN website_cms_template_dev.media_variants v ON m.id = v.media_id
  WHERE m.id = media_id_param
  GROUP BY
    m.id, m.name, m.slug, m.description, m.alt_text,
    m.original_filename, m.original_format, m.original_size_bytes,
    m.original_width, m.original_height, m.mime_type,
    m.media_type, m.video_url,
    m.created_at, m.updated_at;
END;
$$;

-- Update RPC: search_media
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
  media_type text,
  video_url text,
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
    m.media_type,
    m.video_url,
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
    ) AS variants
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
    m.media_type, m.video_url,
    m.created_at, m.updated_at
  ORDER BY m.created_at DESC;
END;
$$;

-- Recreate custom schema wrappers (CASCADE dropped them; app uses these via PostgREST)
-- CRITICAL: search_path = public, website_cms_template_dev (public FIRST)
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
  media_type text,
  video_url text,
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
  media_type text,
  video_url text,
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
  media_type text,
  video_url text,
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

-- Re-grant execute (matches 038)
GRANT EXECUTE ON FUNCTION public.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_media(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_with_variants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_media_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION website_cms_template_dev.search_media(text) TO anon, authenticated;
