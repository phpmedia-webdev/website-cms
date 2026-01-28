-- Content model: RPC functions (prd-technical Step 3)
-- Public schema, SECURITY DEFINER, dynamic schema param. Bypass PostgREST schema search.

-- get_content_types_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_content_types_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  slug text,
  label text,
  description text,
  is_core boolean,
  display_order int,
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
  q := format('
    SELECT ct.id, ct.slug, ct.label, ct.description, ct.is_core, ct.display_order, ct.created_at, ct.updated_at
    FROM %I.content_types ct
    ORDER BY ct.display_order ASC, ct.slug ASC
  ', schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

-- get_content_type_fields_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_content_type_fields_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  content_type_id uuid,
  key text,
  label text,
  type text,
  config jsonb,
  display_order int,
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
  q := format('
    SELECT f.id, f.content_type_id, f.key, f.label, f.type, f.config, f.display_order, f.created_at, f.updated_at
    FROM %I.content_type_fields f
    ORDER BY f.content_type_id, f.display_order ASC, f.key ASC
  ', schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

-- get_content_type_fields_by_content_type_dynamic(schema_name, content_type_id)
CREATE OR REPLACE FUNCTION public.get_content_type_fields_by_content_type_dynamic(
  schema_name text,
  content_type_id_param uuid
)
RETURNS TABLE(
  id uuid,
  content_type_id uuid,
  key text,
  label text,
  type text,
  config jsonb,
  display_order int,
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
  q := format('
    SELECT f.id, f.content_type_id, f.key, f.label, f.type, f.config, f.display_order, f.created_at, f.updated_at
    FROM %I.content_type_fields f
    WHERE f.content_type_id = $1
    ORDER BY f.display_order ASC, f.key ASC
  ', schema_name);
  RETURN QUERY EXECUTE q USING content_type_id_param;
END;
$$;

-- get_content_dynamic(schema_name) — list all, most recently updated first
CREATE OR REPLACE FUNCTION public.get_content_dynamic(schema_name text)
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
  q := format('
    SELECT c.id, c.content_type_id, c.title, c.slug, c.body, c.excerpt, c.featured_image_id, c.status,
           c.published_at, c.author_id, c.custom_fields, c.access_level, c.required_mag_id, c.visibility_mode,
           c.restricted_message, c.section_restrictions, c.created_at, c.updated_at
    FROM %I.content c
    ORDER BY c.updated_at DESC
  ', schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

-- get_content_by_id_dynamic(schema_name, content_id)
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
    SELECT c.id, c.content_type_id, c.title, c.slug, c.body, c.excerpt, c.featured_image_id, c.status,
           c.published_at, c.author_id, c.custom_fields, c.access_level, c.required_mag_id, c.visibility_mode,
           c.restricted_message, c.section_restrictions, c.created_at, c.updated_at
    FROM %I.content c
    WHERE c.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING content_id_param;
END;
$$;

-- get_content_list_with_types_dynamic(schema_name) — content joined with type slug/label for list UI
CREATE OR REPLACE FUNCTION public.get_content_list_with_types_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  content_type_id uuid,
  type_slug text,
  type_label text,
  title text,
  slug text,
  status text,
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
           c.title, c.slug, c.status, c.updated_at
    FROM %I.content c
    JOIN %I.content_types ct ON ct.id = c.content_type_id
    ORDER BY c.updated_at DESC
  ', schema_name, schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_types_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_type_fields_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_type_fields_by_content_type_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_by_id_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_list_with_types_dynamic(text) TO anon, authenticated;
