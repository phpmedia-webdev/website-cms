-- File: 123_content_expires_at.sql
-- Add expires_at to content for post visibility end date (date/time range).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.content
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

COMMENT ON COLUMN website_cms_template_dev.content.expires_at IS 'When set, post is hidden after this time (visibility end). Null = display indefinitely.';

-- get_published_posts_dynamic: only return rows where (expires_at IS NULL OR expires_at > now())
CREATE OR REPLACE FUNCTION public.get_published_posts_dynamic(
  schema_name text,
  limit_param int DEFAULT 20,
  offset_param int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content_type_id uuid,
  title text,
  slug text,
  body jsonb,
  excerpt text,
  featured_image_id uuid,
  status text,
  published_at timestamptz,
  author_id uuid,
  custom_fields jsonb,
  access_level text,
  required_mag_id uuid,
  visibility_mode text,
  restricted_message text,
  section_restrictions jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format(
    'SELECT c.id, c.content_type_id, c.title, c.slug, c.body, c.excerpt, c.featured_image_id, c.status,
            c.published_at, c.author_id, c.custom_fields, c.access_level, c.required_mag_id, c.visibility_mode,
            c.restricted_message, c.section_restrictions, c.created_at, c.updated_at
     FROM %I.content c
     JOIN %I.content_types ct ON ct.id = c.content_type_id
     WHERE c.status = ''published'' AND ct.slug = ''post''
       AND (c.published_at IS NULL OR c.published_at <= now())
       AND (c.expires_at IS NULL OR c.expires_at > now())
     ORDER BY c.published_at DESC NULLS LAST
     LIMIT $1 OFFSET $2',
    schema_name,
    schema_name
  );
  RETURN QUERY EXECUTE q USING limit_param, offset_param;
END;
$$;

-- get_published_posts_count_dynamic: count only visible posts (within date range)
CREATE OR REPLACE FUNCTION public.get_published_posts_count_dynamic(schema_name text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result bigint;
  q text;
BEGIN
  q := format(
    'SELECT COUNT(*)::bigint FROM %I.content c
     JOIN %I.content_types ct ON ct.id = c.content_type_id
     WHERE c.status = ''published'' AND ct.slug = ''post''
       AND (c.published_at IS NULL OR c.published_at <= now())
       AND (c.expires_at IS NULL OR c.expires_at > now())',
    schema_name,
    schema_name
  );
  EXECUTE q INTO result;
  RETURN result;
END;
$$;

-- get_content_by_id_dynamic: return expires_at for editor
DROP FUNCTION IF EXISTS public.get_content_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_content_by_id_dynamic(schema_name text, content_id_param uuid)
RETURNS TABLE(
  id uuid,
  content_type_id uuid,
  title text,
  slug text,
  body jsonb,
  excerpt text,
  featured_image_id uuid,
  status text,
  published_at timestamptz,
  author_id uuid,
  custom_fields jsonb,
  access_level text,
  required_mag_id uuid,
  visibility_mode text,
  restricted_message text,
  section_restrictions jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  use_for_agent_training boolean,
  seo_title text,
  meta_description text,
  og_image_id uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT c.id, c.content_type_id, c.title, c.slug, c.body, c.excerpt, c.featured_image_id, c.status,
           c.published_at, c.author_id, c.custom_fields, c.access_level, c.required_mag_id, c.visibility_mode,
           c.restricted_message, c.section_restrictions, c.created_at, c.updated_at, c.use_for_agent_training,
           c.seo_title, c.meta_description, c.og_image_id, c.expires_at
    FROM %I.content c
    WHERE c.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING content_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_by_id_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_posts_dynamic(text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_posts_count_dynamic(text) TO anon, authenticated;
