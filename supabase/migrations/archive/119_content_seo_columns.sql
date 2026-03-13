-- File: 119_content_seo_columns.sql
-- Add SEO/social metadata columns to content for blog posts (title, description, OG image override).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.content
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image_id uuid;

COMMENT ON COLUMN website_cms_template_dev.content.seo_title IS 'Override for <title> and og:title; null = use content title.';
COMMENT ON COLUMN website_cms_template_dev.content.meta_description IS 'Override for meta description and og:description; null = use excerpt.';
COMMENT ON COLUMN website_cms_template_dev.content.og_image_id IS 'Override for og:image / social share; null = use featured_image_id.';

-- Update get_content_by_id_dynamic to return SEO columns
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
  og_image_id uuid
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
           c.seo_title, c.meta_description, c.og_image_id
    FROM %I.content c
    WHERE c.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING content_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_by_id_dynamic(text, uuid) TO anon, authenticated;
