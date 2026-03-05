-- File: 117_get_published_posts_pagination.sql
-- Adds offset support to get_published_posts_dynamic and a count RPC for blog list pagination.
-- Run in Supabase SQL Editor; replace website_cms_template_dev with your schema name if different.

-- Replace get_published_posts_dynamic with version that accepts offset_param (default 0)
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
     ORDER BY c.published_at DESC NULLS LAST
     LIMIT $1 OFFSET $2',
    schema_name,
    schema_name
  );
  RETURN QUERY EXECUTE q USING limit_param, offset_param;
END;
$$;

-- Count of published posts (for pagination total)
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
     WHERE c.status = ''published'' AND ct.slug = ''post''',
    schema_name,
    schema_name
  );
  EXECUTE q INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_posts_dynamic(text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_posts_count_dynamic(text) TO anon, authenticated;
