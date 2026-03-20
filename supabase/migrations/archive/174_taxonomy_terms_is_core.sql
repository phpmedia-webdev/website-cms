-- File: 174_taxonomy_terms_is_core.sql
-- Add is_core to taxonomy_terms for system-required terms (slug fixed, label editable, non-deletable).
-- Update get_taxonomy_terms_dynamic to return is_core. Run in Supabase SQL Editor.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.taxonomy_terms
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN website_cms_template_dev.taxonomy_terms.is_core IS 'When true, term is system-required: slug is fixed, only label (name) can be edited, term cannot be deleted. Used for fork seeding.';

-- RPC return type must include is_core; DROP then CREATE (return type change).
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
      t.id,
      t.name,
      t.slug,
      t.type,
      t.parent_id,
      t.description,
      t.suggested_sections,
      t.color,
      COALESCE(t.is_core, false),
      t.created_at,
      t.updated_at
    FROM %I.taxonomy_terms t
    ORDER BY t.name ASC
  ', schema_name);

  RETURN QUERY EXECUTE query_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxonomy_terms_dynamic(text) TO anon, authenticated;
