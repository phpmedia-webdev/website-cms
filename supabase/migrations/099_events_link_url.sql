-- File: 099_events_link_url.sql
-- Add optional link_url to events.
-- Run in Supabase SQL Editor.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.events
  ADD COLUMN IF NOT EXISTS link_url TEXT;

COMMENT ON COLUMN website_cms_template_dev.events.link_url IS 'Optional URL link (e.g. event page, registration, map).';

DROP FUNCTION IF EXISTS public.get_events_dynamic(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_event_by_id_dynamic(text, uuid);

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
  link_url text,
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
    SELECT e.id, e.title, e.start_date, e.end_date, e.timezone, e.location, e.link_url,
           e.description, e.recurrence_rule, e.is_all_day, e.access_level, e.required_mag_id,
           e.visibility, e.event_type, e.status, e.cover_image_id, e.created_at, e.updated_at
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
  link_url text,
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
    SELECT e.id, e.title, e.start_date, e.end_date, e.timezone, e.location, e.link_url,
           e.description, e.recurrence_rule, e.is_all_day, e.access_level, e.required_mag_id,
           e.visibility, e.event_type, e.status, e.cover_image_id, e.created_at, e.updated_at
    FROM %I.events e
    WHERE e.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_events_dynamic(text, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload config';
