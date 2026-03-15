-- File: 144_mags_parent_id_hierarchy.sql
-- MAG parent/child hierarchy: add parent_id to mags, cycle prevention, ancestor lookup RPC.
-- Assigning a contact to a child MAG auto-assigns all ancestors; assigning to parent does not grant children.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add parent_id to mags (self-reference; NULL = root)
ALTER TABLE website_cms_template_dev.mags
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES website_cms_template_dev.mags(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mags_parent_id ON website_cms_template_dev.mags(parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.mags.parent_id IS 'Parent MAG for hierarchy. Assigning contact to child auto-assigns ancestors; parent does not grant children.';

-- 2. Trigger: prevent cycle and self-reference
CREATE OR REPLACE FUNCTION website_cms_template_dev.mags_check_parent_no_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  found_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'MAG parent_id cannot reference itself';
  END IF;
  -- NEW.id must not appear in the ancestor chain of NEW.parent_id (would create cycle)
  WITH RECURSIVE ancestors AS (
    SELECT id FROM website_cms_template_dev.mags WHERE id = NEW.parent_id
    UNION ALL
    SELECT m.id FROM website_cms_template_dev.mags m
    INNER JOIN ancestors a ON m.parent_id = a.id
  )
  SELECT id INTO found_id FROM ancestors WHERE id = NEW.id LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'MAG parent_id would create a cycle in hierarchy';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mags_check_parent_no_cycle_trigger ON website_cms_template_dev.mags;
CREATE TRIGGER mags_check_parent_no_cycle_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON website_cms_template_dev.mags
  FOR EACH ROW EXECUTE FUNCTION website_cms_template_dev.mags_check_parent_no_cycle();

-- 3. RPC: return array of ancestor MAG ids (parent, grandparent, ... up to root) for a given mag_id
CREATE OR REPLACE FUNCTION public.get_mag_ancestor_ids_dynamic(schema_name text, mag_id_param uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result uuid[];
BEGIN
  EXECUTE format(
    'WITH RECURSIVE ancestors AS (
      SELECT parent_id FROM %I.mags WHERE id = $1 AND parent_id IS NOT NULL
      UNION ALL
      SELECT m.parent_id FROM %I.mags m
      INNER JOIN ancestors a ON m.id = a.parent_id
      WHERE m.parent_id IS NOT NULL
    )
    SELECT COALESCE(array_agg(parent_id), ARRAY[]::uuid[]) FROM ancestors',
    schema_name, schema_name
  ) INTO result USING mag_id_param;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mag_ancestor_ids_dynamic(text, uuid) TO anon, authenticated, service_role;

-- 4. Update get_mags_dynamic to return parent_id (DROP and recreate to change return type)
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
  parent_id uuid,
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
    'SELECT m.id, m.name, m.uid, m.description, m.start_date, m.end_date, m.status, m.parent_id, m.created_at, m.updated_at FROM %I.mags m ORDER BY m.name ASC',
    schema_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mags_dynamic(text) TO anon, authenticated;

-- 5. Update get_mag_by_id_dynamic to return parent_id
DROP FUNCTION IF EXISTS public.get_mag_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_mag_by_id_dynamic(schema_name text, mag_id_param uuid)
RETURNS TABLE(
  id uuid,
  name text,
  uid text,
  description text,
  start_date date,
  end_date date,
  status text,
  parent_id uuid,
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
    'SELECT m.id, m.name, m.uid, m.description, m.start_date, m.end_date, m.status, m.parent_id, m.created_at, m.updated_at FROM %I.mags m WHERE m.id = $1',
    schema_name
  ) USING mag_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mag_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload config';
