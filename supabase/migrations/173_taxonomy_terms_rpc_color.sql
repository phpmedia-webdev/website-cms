-- File: 173_taxonomy_terms_rpc_color.sql
-- Include taxonomy_terms.color in get_taxonomy_terms_dynamic so Settings → Taxonomy
-- category/tag edit modal shows and persists color after save.
-- Run in Supabase SQL Editor.
-- Must DROP first because return type (added color) cannot be changed with CREATE OR REPLACE.

DROP FUNCTION IF EXISTS public.get_taxonomy_terms_dynamic(text);

CREATE OR REPLACE FUNCTION public.get_taxonomy_terms_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  type text,
  parent_id uuid,
  description text,
  suggested_sections text[],
  color text,
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
      t.color,
      t.created_at,
      t.updated_at
    FROM %I.taxonomy_terms t
    ORDER BY t.name ASC
  ', schema_name);
  
  RETURN QUERY EXECUTE query_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxonomy_terms_dynamic(text) TO anon, authenticated;
