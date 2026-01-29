-- File: 064_crm_rpc_add_message.sql
-- Add message column to CRM contact RPCs. Run after 063.
-- Must DROP first because return type (OUT parameters) changed.

DROP FUNCTION IF EXISTS public.get_contacts_dynamic(text);
DROP FUNCTION IF EXISTS public.get_contact_by_id_dynamic(text, uuid);

-- get_contacts_dynamic(schema_name) — add message
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
  message text,
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
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.message, c.created_at, c.updated_at FROM %I.crm_contacts c ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC',
    schema_name
  );
END;
$$;

-- get_contact_by_id_dynamic(schema_name, contact_id_param) — add message
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
  message text,
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
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.message, c.created_at, c.updated_at FROM %I.crm_contacts c WHERE c.id = $1 LIMIT 1',
    schema_name
  ) USING contact_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contacts_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_by_id_dynamic(text, uuid) TO anon, authenticated;
