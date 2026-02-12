-- File: 106_content_use_for_agent_training.sql
-- Add use_for_agent_training to content for RAG Knowledge Export; update content RPCs to return it.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

-- 1. Add column
ALTER TABLE website_cms_template_dev.content
ADD COLUMN IF NOT EXISTS use_for_agent_training boolean NOT NULL DEFAULT false;

-- 2. get_content_by_id_dynamic — include use_for_agent_training
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
  use_for_agent_training boolean
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
           c.restricted_message, c.section_restrictions, c.created_at, c.updated_at, c.use_for_agent_training
    FROM %I.content c
    WHERE c.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING content_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_by_id_dynamic(text, uuid) TO anon, authenticated;

-- 3. get_content_list_with_types_dynamic — include use_for_agent_training
DROP FUNCTION IF EXISTS public.get_content_list_with_types_dynamic(text);

CREATE OR REPLACE FUNCTION public.get_content_list_with_types_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  content_type_id uuid,
  type_slug text,
  type_label text,
  title text,
  slug text,
  status text,
  access_level text,
  updated_at timestamptz,
  use_for_agent_training boolean
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
    SELECT c.id, c.content_type_id, ct.slug AS type_slug, ct.label AS type_label,
           c.title, c.slug, c.status, c.access_level, c.updated_at, c.use_for_agent_training
    FROM %I.content c
    JOIN %I.content_types ct ON ct.id = c.content_type_id
    ORDER BY c.updated_at DESC
  ', schema_name, schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_list_with_types_dynamic(text) TO anon, authenticated;
