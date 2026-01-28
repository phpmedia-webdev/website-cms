-- Return is_staple from get_section_taxonomy_configs_dynamic and prevent deleting staple sections.
-- Run after 051_staple_taxonomy_sections.sql.

-- 1. Drop then recreate RPC (return type changes require DROP first)
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
      s.created_at,
      s.updated_at
    FROM %I.section_taxonomy_config s
    ORDER BY s.display_name ASC
  ', schema_name);
  
  RETURN QUERY EXECUTE query_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_section_taxonomy_configs_dynamic(text) TO anon, authenticated;

-- 2. Trigger in client schema: prevent DELETE when is_staple = true
SET search_path TO website_cms_template_dev, public;

CREATE OR REPLACE FUNCTION website_cms_template_dev.prevent_delete_staple_section()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_staple = true THEN
    RAISE EXCEPTION 'Template sections cannot be removed.'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_delete_staple_section ON website_cms_template_dev.section_taxonomy_config;
CREATE TRIGGER prevent_delete_staple_section
  BEFORE DELETE ON website_cms_template_dev.section_taxonomy_config
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.prevent_delete_staple_section();
