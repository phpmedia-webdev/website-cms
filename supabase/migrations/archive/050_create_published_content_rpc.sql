-- Published content RPCs (per prd-technical: read operations use RPC)
-- Used by public routes: homepage (page by slug), blog list (published posts).

-- Get one published content row by type slug (page|post) and URL slug
CREATE OR REPLACE FUNCTION public.get_published_content_by_slug_dynamic(
  schema_name text,
  type_slug text,
  slug_param text
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
     WHERE c.slug = $1 AND c.status = ''published'' AND ct.slug = $2
     LIMIT 1',
    schema_name,
    schema_name
  );
  RETURN QUERY EXECUTE q USING slug_param, type_slug;
END;
$$;

-- Get published posts (content where type slug = 'post'), ordered by published_at desc
CREATE OR REPLACE FUNCTION public.get_published_posts_dynamic(
  schema_name text,
  limit_param int DEFAULT 50
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
     LIMIT $1',
    schema_name,
    schema_name
  );
  RETURN QUERY EXECUTE q USING limit_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_content_by_slug_dynamic(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_posts_dynamic(text, int) TO anon, authenticated;
