-- File: 053_create_crm_rpc.sql
-- CRM RPC functions (per prd-technical: reads via RPC, not .from()).
-- Public schema, SECURITY DEFINER, dynamic schema param. Run after 052.

-- get_contacts_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_contacts_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  full_name text,
  company text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  status text,
  dnd_status text,
  source text,
  form_id uuid,
  external_crm_id text,
  external_crm_synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.created_at, c.updated_at FROM %I.crm_contacts c ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC',
    schema_name
  );
END;
$$;

-- get_contact_by_id_dynamic(schema_name, contact_id_param)
CREATE OR REPLACE FUNCTION public.get_contact_by_id_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  full_name text,
  company text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  status text,
  dnd_status text,
  source text,
  form_id uuid,
  external_crm_id text,
  external_crm_synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.created_at, c.updated_at FROM %I.crm_contacts c WHERE c.id = $1 LIMIT 1',
    schema_name
  ) USING contact_id_param;
END;
$$;

-- get_forms_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_forms_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  auto_assign_tags text[],
  auto_assign_mag_ids uuid[],
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT f.id, f.name, f.slug, f.auto_assign_tags, f.auto_assign_mag_ids, f.settings, f.created_at, f.updated_at FROM %I.forms f ORDER BY f.name ASC',
    schema_name
  );
END;
$$;

-- get_mags_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_mags_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  uid text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT m.id, m.name, m.uid, m.description, m.created_at, m.updated_at FROM %I.mags m ORDER BY m.name ASC',
    schema_name
  );
END;
$$;

-- get_contact_notes_dynamic(schema_name, contact_id_param)
CREATE OR REPLACE FUNCTION public.get_contact_notes_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  contact_id uuid,
  body text,
  author_id uuid,
  note_type text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT n.id, n.contact_id, n.body, n.author_id, n.note_type, n.created_at FROM %I.crm_notes n WHERE n.contact_id = $1 ORDER BY n.created_at DESC',
    schema_name
  ) USING contact_id_param;
END;
$$;

-- get_crm_custom_fields_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_crm_custom_fields_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  label text,
  type text,
  validation_rules jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT cf.id, cf.name, cf.label, cf.type, cf.validation_rules, cf.created_at, cf.updated_at FROM %I.crm_custom_fields cf ORDER BY cf.label ASC',
    schema_name
  );
END;
$$;

-- get_contact_custom_fields_dynamic(schema_name, contact_id_param) — values with field label/name
CREATE OR REPLACE FUNCTION public.get_contact_custom_fields_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  contact_id uuid,
  custom_field_id uuid,
  custom_field_name text,
  custom_field_label text,
  custom_field_type text,
  value text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT v.id, v.contact_id, v.custom_field_id, cf.name, cf.label, cf.type, v.value, v.created_at, v.updated_at FROM %I.crm_contact_custom_fields v JOIN %I.crm_custom_fields cf ON cf.id = v.custom_field_id WHERE v.contact_id = $1 ORDER BY cf.label ASC',
    schema_name, schema_name
  ) USING contact_id_param;
END;
$$;

-- get_contact_mags_dynamic(schema_name, contact_id_param) — MAGs assigned to contact with mag name/uid
CREATE OR REPLACE FUNCTION public.get_contact_mags_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  contact_id uuid,
  mag_id uuid,
  mag_name text,
  mag_uid text,
  assigned_via text,
  assigned_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT j.id, j.contact_id, j.mag_id, m.name, m.uid, j.assigned_via, j.assigned_at FROM %I.crm_contact_mags j JOIN %I.mags m ON m.id = j.mag_id WHERE j.contact_id = $1 ORDER BY m.name ASC',
    schema_name, schema_name
  ) USING contact_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contacts_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_by_id_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_forms_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mags_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_notes_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_custom_fields_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_custom_fields_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_mags_dynamic(text, uuid) TO anon, authenticated;
