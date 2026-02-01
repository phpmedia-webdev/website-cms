-- File: 056_create_marketing_lists_rpc.sql
-- RPCs for marketing lists (per prd-technical: reads via RPC).
-- Run after 055.

-- get_marketing_lists_dynamic(schema_name)
CREATE OR REPLACE FUNCTION public.get_marketing_lists_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
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
    'SELECT ml.id, ml.name, ml.slug, ml.description, ml.created_at, ml.updated_at FROM %I.marketing_lists ml ORDER BY ml.name ASC',
    schema_name
  );
END;
$$;

-- get_marketing_list_by_id_dynamic(schema_name, list_id_param)
CREATE OR REPLACE FUNCTION public.get_marketing_list_by_id_dynamic(schema_name text, list_id_param uuid)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
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
    'SELECT ml.id, ml.name, ml.slug, ml.description, ml.created_at, ml.updated_at FROM %I.marketing_lists ml WHERE ml.id = $1 LIMIT 1',
    schema_name
  ) USING list_id_param;
END;
$$;

-- get_contact_marketing_lists_dynamic(schema_name, contact_id_param) — lists a contact belongs to
CREATE OR REPLACE FUNCTION public.get_contact_marketing_lists_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  contact_id uuid,
  list_id uuid,
  list_name text,
  list_slug text,
  added_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT j.id, j.contact_id, j.list_id, ml.name, ml.slug, j.added_at FROM %I.crm_contact_marketing_lists j JOIN %I.marketing_lists ml ON ml.id = j.list_id WHERE j.contact_id = $1 ORDER BY ml.name ASC',
    schema_name, schema_name
  ) USING contact_id_param;
END;
$$;

-- get_contacts_by_marketing_list_dynamic(schema_name, list_id_param) — contacts in a list
CREATE OR REPLACE FUNCTION public.get_contacts_by_marketing_list_dynamic(schema_name text, list_id_param uuid)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  full_name text,
  company text,
  status text,
  added_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.status, j.added_at FROM %I.crm_contacts c JOIN %I.crm_contact_marketing_lists j ON j.contact_id = c.id WHERE j.list_id = $1 ORDER BY c.full_name ASC, c.email ASC',
    schema_name, schema_name
  ) USING list_id_param;
END;
$$;

-- search_marketing_lists_dynamic(schema_name, search_term) — for auto-suggest
CREATE OR REPLACE FUNCTION public.search_marketing_lists_dynamic(schema_name text, search_term text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT ml.id, ml.name, ml.slug FROM %I.marketing_lists ml WHERE ml.name ILIKE $1 OR ml.slug ILIKE $1 ORDER BY ml.name ASC LIMIT 20',
    schema_name
  ) USING ('%' || search_term || '%');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketing_lists_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketing_list_by_id_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_marketing_lists_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contacts_by_marketing_list_dynamic(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_marketing_lists_dynamic(text, text) TO anon, authenticated;
