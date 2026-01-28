-- Media Library - Create RPC Functions in Custom Schema
-- PostgREST searches in the client's custom schema for RPC functions
-- These wrapper functions call the public schema functions

-- Get the current schema name (should be website_cms_template_dev)
DO $$
DECLARE
  current_schema TEXT := current_schema();
BEGIN
  -- Create wrapper function in custom schema that calls public schema function
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.get_media_with_variants()
    RETURNS TABLE(
      media_id uuid,
      name text,
      slug text,
      description text,
      alt_text text,
      original_filename text,
      original_format text,
      original_size_bytes int,
      original_width int,
      original_height int,
      mime_type text,
      created_at timestamptz,
      updated_at timestamptz,
      variants jsonb
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = %I, public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT * FROM public.get_media_with_variants();
    END;
    $func$;
  ', custom_schema, custom_schema);

  -- Create wrapper for get_media_by_id
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.get_media_by_id(media_id_param uuid)
    RETURNS TABLE(
      media_id uuid,
      name text,
      slug text,
      description text,
      alt_text text,
      original_filename text,
      original_format text,
      original_size_bytes int,
      original_width int,
      original_height int,
      mime_type text,
      created_at timestamptz,
      updated_at timestamptz,
      variants jsonb
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = %I, public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT * FROM public.get_media_by_id(media_id_param);
    END;
    $func$;
  ', custom_schema, custom_schema);

  -- Create wrapper for generate_media_slug
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.generate_media_slug(input_name TEXT)
    RETURNS TEXT 
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = %I, public
    AS $func$
    BEGIN
      RETURN public.generate_media_slug(input_name);
    END;
    $func$;
  ', custom_schema, custom_schema);

  -- Grant execute permissions
  EXECUTE format('
    GRANT EXECUTE ON FUNCTION %I.get_media_with_variants() TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION %I.get_media_by_id(uuid) TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION %I.generate_media_slug(TEXT) TO anon, authenticated;
  ', current_schema, current_schema, current_schema);
END $$;

-- Refresh PostgREST to pick up new functions
NOTIFY pgrst, 'reload schema';
