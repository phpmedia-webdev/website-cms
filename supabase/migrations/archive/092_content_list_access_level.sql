-- File: 092_content_list_access_level.sql
-- Add access_level to content list RPC so admin Content tab can show membership indicator (red "M").

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
  q := format('
    SELECT c.id, c.content_type_id, ct.slug AS type_slug, ct.label AS type_label,
           c.title, c.slug, c.status, c.access_level, c.updated_at
    FROM %I.content c
    JOIN %I.content_types ct ON ct.id = c.content_type_id
    ORDER BY c.updated_at DESC
  ', schema_name, schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_list_with_types_dynamic(text) TO anon, authenticated;
