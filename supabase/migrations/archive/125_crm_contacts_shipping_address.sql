-- File: 125_crm_contacts_shipping_address.sql
-- Phase 09 Ecommerce Step 1: Add shipping address columns to crm_contacts.
-- Existing address/city/state/postal_code/country are treated as billing.
-- Use shipping for delivery when any shipping field is set; otherwise use billing for both.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

-- 1. Add shipping columns
ALTER TABLE website_cms_template_dev.crm_contacts
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_state text,
  ADD COLUMN IF NOT EXISTS shipping_postal_code text,
  ADD COLUMN IF NOT EXISTS shipping_country text;

-- 2. Update RPCs to return new columns
DROP FUNCTION IF EXISTS public.get_contacts_dynamic(text);
DROP FUNCTION IF EXISTS public.get_contact_by_id_dynamic(text, uuid);

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
  shipping_address text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  status text,
  dnd_status text,
  source text,
  form_id uuid,
  external_crm_id text,
  external_crm_synced_at timestamptz,
  external_vbout_id text,
  external_stripe_id text,
  external_ecommerce_id text,
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
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.shipping_address, c.shipping_city, c.shipping_state, c.shipping_postal_code, c.shipping_country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.external_vbout_id, c.external_stripe_id, c.external_ecommerce_id, c.message, c.created_at, c.updated_at, c.deleted_at FROM %I.crm_contacts c WHERE c.deleted_at IS NULL ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC',
    schema_name
  );
END;
$$;

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
  shipping_address text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  status text,
  dnd_status text,
  source text,
  form_id uuid,
  external_crm_id text,
  external_crm_synced_at timestamptz,
  external_vbout_id text,
  external_stripe_id text,
  external_ecommerce_id text,
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
    'SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.full_name, c.company, c.address, c.city, c.state, c.postal_code, c.country, c.shipping_address, c.shipping_city, c.shipping_state, c.shipping_postal_code, c.shipping_country, c.status, c.dnd_status, c.source, c.form_id, c.external_crm_id, c.external_crm_synced_at, c.external_vbout_id, c.external_stripe_id, c.external_ecommerce_id, c.message, c.created_at, c.updated_at, c.deleted_at FROM %I.crm_contacts c WHERE c.id = $1 LIMIT 1',
    schema_name
  ) USING contact_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contacts_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
