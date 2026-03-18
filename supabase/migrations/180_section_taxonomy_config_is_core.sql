-- File: 180_section_taxonomy_config_is_core.sql
-- Add is_core to section_taxonomy_config for Core locking (slug locked, only label editable, cannot delete).
-- Run in Supabase SQL Editor.

-- 1. Add column
ALTER TABLE website_cms_template_dev.section_taxonomy_config
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN website_cms_template_dev.section_taxonomy_config.is_core IS 'When true, section is system-required: slug locked, only display_name editable, cannot delete.';

-- 2. RPC return type must include is_core; DROP then CREATE
DROP FUNCTION IF EXISTS public.get_section_taxonomy_configs_dynamic(text);

CREATE OR REPLACE FUNCTION public.get_section_taxonomy_configs_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  section_name text,
  display_name text,
  content_type text,
  category_slugs text[],
  tag_slugs text[],
  is_staple boolean,
  is_core boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_text text;
BEGIN
  query_text := format('
    SELECT
      s.id,
      s.section_name,
      s.display_name,
      s.content_type,
      s.category_slugs,
      s.tag_slugs,
      COALESCE(s.is_staple, false),
      COALESCE(s.is_core, false),
      s.created_at,
      s.updated_at
    FROM %I.section_taxonomy_config s
    ORDER BY s.display_name ASC
  ', schema_name);

  RETURN QUERY EXECUTE query_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_section_taxonomy_configs_dynamic(text) TO anon, authenticated;

-- 3. Extend delete trigger to prevent delete when is_core = true
CREATE OR REPLACE FUNCTION website_cms_template_dev.prevent_delete_staple_section()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_staple = true THEN
    RAISE EXCEPTION 'Template sections cannot be removed.'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF COALESCE(OLD.is_core, false) = true THEN
    RAISE EXCEPTION 'Core sections cannot be removed.'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;
