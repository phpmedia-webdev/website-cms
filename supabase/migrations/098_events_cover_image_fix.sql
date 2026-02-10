-- File: 098_events_cover_image_fix.sql
-- Ensures cover_image_id column exists and RPCs return it.
-- Run in Supabase SQL Editor.

SET search_path TO website_cms_template_dev, public;

-- 1. Add column if missing (idempotent)
ALTER TABLE website_cms_template_dev.events
  ADD COLUMN IF NOT EXISTS cover_image_id UUID REFERENCES website_cms_template_dev.media(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_cover_image_id ON website_cms_template_dev.events(cover_image_id);

COMMENT ON COLUMN website_cms_template_dev.events.cover_image_id IS 'Optional cover/feature image for the event.';

-- 2. Drop existing functions (required before changing return type)
DROP FUNCTION IF EXISTS public.get_events_dynamic(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_event_by_id_dynamic(text, uuid);

-- 3. Recreate get_events_dynamic with cover_image_id
CREATE FUNCTION public.get_events_dynamic(
  schema_name text,
  start_date_param timestamptz,
  end_date_param timestamptz
)
RETURNS TABLE(
  id uuid,
  title text,
  start_date timestamptz,
  end_date timestamptz,
  timezone text,
  location text,
  description text,
  recurrence_rule text,
  is_all_day boolean,
  access_level text,
  required_mag_id uuid,
  visibility text,
  event_type text,
  status text,
  cover_image_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT e.id, e.title, e.start_date, e.end_date, e.timezone, e.location, e.description,
           e.recurrence_rule, e.is_all_day, e.access_level, e.required_mag_id, e.visibility,
           e.event_type, e.status, e.cover_image_id, e.created_at, e.updated_at
    FROM %I.events e
    WHERE e.status != ''cancelled''
      AND (
        (e.recurrence_rule IS NULL AND e.end_date >= $1 AND e.start_date <= $2)
        OR
        (e.recurrence_rule IS NOT NULL AND e.start_date <= $2)
      )
    ORDER BY e.start_date ASC
  ', schema_name);
  RETURN QUERY EXECUTE q USING start_date_param, end_date_param;
END;
$$;

-- 4. Recreate get_event_by_id_dynamic with cover_image_id
CREATE FUNCTION public.get_event_by_id_dynamic(
  schema_name text,
  event_id_param uuid
)
RETURNS TABLE(
  id uuid,
  title text,
  start_date timestamptz,
  end_date timestamptz,
  timezone text,
  location text,
  description text,
  recurrence_rule text,
  is_all_day boolean,
  access_level text,
  required_mag_id uuid,
  visibility text,
  event_type text,
  status text,
  cover_image_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT e.id, e.title, e.start_date, e.end_date, e.timezone, e.location, e.description,
           e.recurrence_rule, e.is_all_day, e.access_level, e.required_mag_id, e.visibility,
           e.event_type, e.status, e.cover_image_id, e.created_at, e.updated_at
    FROM %I.events e
    WHERE e.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_id_param;
END;
$$;

-- 5. Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_events_dynamic(text, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload config';
