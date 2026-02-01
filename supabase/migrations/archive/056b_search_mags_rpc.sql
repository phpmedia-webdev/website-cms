-- File: 056b_search_mags_rpc.sql
-- Search RPCs for MAGs (auto-suggest on contact detail).
-- Run after 056.

-- search_mags_dynamic(schema_name, search_term) — for auto-suggest
CREATE OR REPLACE FUNCTION public.search_mags_dynamic(schema_name text, search_term text)
RETURNS TABLE(
  id uuid,
  name text,
  uid text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT m.id, m.name, m.uid FROM %I.mags m WHERE m.name ILIKE $1 OR m.uid ILIKE $1 ORDER BY m.name ASC LIMIT 20',
    schema_name
  ) USING ('%' || search_term || '%');
END;
$$;

-- get_contacts_by_mag_dynamic(schema_name, mag_id_param) — contacts in a MAG
CREATE OR REPLACE FUNCTION public.get_contacts_by_mag_dynamic(schema_name text, mag_id_param uuid)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  full_name text,
  company text,
  status text,
  assigned_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.status, j.assigned_at FROM %I.crm_contacts c JOIN %I.crm_contact_mags j ON j.contact_id = c.id WHERE j.mag_id = $1 ORDER BY c.full_name ASC, c.email ASC',
    schema_name, schema_name
  ) USING mag_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_mags_dynamic(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contacts_by_mag_dynamic(text, uuid) TO anon, authenticated;
