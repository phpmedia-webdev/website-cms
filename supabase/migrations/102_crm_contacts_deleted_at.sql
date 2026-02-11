-- File: 102_crm_contacts_deleted_at.sql
-- Add soft-delete (trash) support: deleted_at on crm_contacts; list RPC excludes trashed by default.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

-- 1. Add deleted_at column (NULL = not trashed; set to timestamp = trashed)
ALTER TABLE website_cms_template_dev.crm_contacts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Update RPCs to include deleted_at and exclude trashed from list
DROP FUNCTION IF EXISTS public.get_contacts_dynamic(text);
DROP FUNCTION IF EXISTS public.get_contact_by_id_dynamic(text, uuid);

-- get_contacts_dynamic(schema_name) — exclude trashed (deleted_at IS NULL)
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
  updated_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.message, c.created_at, c.updated_at, c.deleted_at FROM %I.crm_contacts c WHERE c.deleted_at IS NULL ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC',
    schema_name
  );
END;
$$;

-- get_contact_by_id_dynamic(schema_name, contact_id_param) — return contact even if trashed (for detail/restore)
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
  updated_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.message, c.created_at, c.updated_at, c.deleted_at FROM %I.crm_contacts c WHERE c.id = $1 LIMIT 1',
    schema_name
  ) USING contact_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contacts_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
