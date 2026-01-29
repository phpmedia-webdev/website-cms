-- File: 069_mag_by_id_and_mags_columns.sql
-- Add get_mag_by_id_dynamic(schema_name, mag_id); update get_mags_dynamic to return start_date, end_date, status.
-- get_contacts_by_mag_dynamic already exists in 056b. Run after 068.

-- 1. Update get_mags_dynamic to return start_date, end_date, status (must DROP and recreate to change return type)
DROP FUNCTION IF EXISTS public.get_mags_dynamic(text);

CREATE OR REPLACE FUNCTION public.get_mags_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  uid text,
  description text,
  start_date date,
  end_date date,
  status text,
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
    'SELECT m.id, m.name, m.uid, m.description, m.start_date, m.end_date, m.status, m.created_at, m.updated_at FROM %I.mags m ORDER BY m.name ASC',
    schema_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mags_dynamic(text) TO anon, authenticated;

-- 2. get_mag_by_id_dynamic(schema_name, mag_id_param) — single MAG by id
CREATE OR REPLACE FUNCTION public.get_mag_by_id_dynamic(schema_name text, mag_id_param uuid)
RETURNS TABLE(
  id uuid,
  name text,
  uid text,
  description text,
  start_date date,
  end_date date,
  status text,
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
    'SELECT m.id, m.name, m.uid, m.description, m.start_date, m.end_date, m.status, m.created_at, m.updated_at FROM %I.mags m WHERE m.id = $1',
    schema_name
  ) USING mag_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mag_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload config';
