-- File: 062_form_fields_rpc.sql
-- RPC to read form field assignments (core + custom) for a form.
-- Run after 061. Replace schema name in 061 with your client schema when running migrations.

-- get_form_fields_dynamic(schema_name, form_id_param)
CREATE OR REPLACE FUNCTION public.get_form_fields_dynamic(schema_name text, form_id_param uuid)
RETURNS TABLE(
  id uuid,
  form_id uuid,
  field_source text,
  core_field_key text,
  custom_field_id uuid,
  display_order int,
  required boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT ff.id, ff.form_id, ff.field_source, ff.core_field_key, ff.custom_field_id, ff.display_order, ff.required FROM %I.form_fields ff WHERE ff.form_id = $1 ORDER BY ff.display_order ASC, ff.id ASC',
    schema_name
  ) USING form_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_form_fields_dynamic(text, uuid) TO anon, authenticated;
