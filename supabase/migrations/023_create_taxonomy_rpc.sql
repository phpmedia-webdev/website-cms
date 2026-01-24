-- Create RPC functions for taxonomy operations
-- These bypass PostgREST schema search issues by using functions in public schema
-- Functions query the custom schema but are callable from PostgREST

-- Dynamic function that accepts schema_name parameter
-- This allows one set of functions to work with multiple schemas

-- Get all taxonomy terms (dynamic version)
CREATE OR REPLACE FUNCTION public.get_taxonomy_terms_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  type text,
  parent_id uuid,
  description text,
  suggested_sections text[],
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
      t.id,
      t.name,
      t.slug,
      t.type,
      t.parent_id,
      t.description,
      t.suggested_sections,
      t.created_at,
      t.updated_at
    FROM %I.taxonomy_terms t
    ORDER BY t.name ASC
  ', schema_name);
  
  RETURN QUERY EXECUTE query_text;
END;
$$;

-- Get section taxonomy configurations (dynamic version)
CREATE OR REPLACE FUNCTION public.get_section_taxonomy_configs_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  section_name text,
  display_name text,
  content_type text,
  category_slugs text[],
  tag_slugs text[],
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
      s.created_at,
      s.updated_at
    FROM %I.section_taxonomy_config s
    ORDER BY s.display_name ASC
  ', schema_name);
  
  RETURN QUERY EXECUTE query_text;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_taxonomy_terms_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_section_taxonomy_configs_dynamic(text) TO anon, authenticated;

-- Note: For schema-specific functions (if you prefer), replace 'website_cms_template_dev' 
-- with your actual schema name in the functions below and uncomment them:

/*
-- Schema-specific function (replace schema name as needed)
CREATE OR REPLACE FUNCTION public.get_taxonomy_terms()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  type text,
  parent_id uuid,
  description text,
  suggested_sections text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = YOUR_SCHEMA_NAME, public
AS $$
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.type,
    t.parent_id,
    t.description,
    t.suggested_sections,
    t.created_at,
    t.updated_at
  FROM YOUR_SCHEMA_NAME.taxonomy_terms t
  ORDER BY t.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxonomy_terms() TO anon, authenticated;
*/
