-- File: 196_get_resources_dynamic_picker_alignment.sql
-- Aligns public.get_resources_dynamic with GET /api/events/resources + ?context= rules
-- (migration 183: is_schedulable_*, archived_at, asset_status retired).
-- picker_context: NULL = full registry (same as omitting context on REST); calendar | task = picker lists.
-- Replaces single-argument overload; one-arg calls still work (second arg defaults to NULL).
-- Run in Supabase SQL Editor.

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_resources_dynamic(text);

CREATE OR REPLACE FUNCTION public.get_resources_dynamic(
  schema_name text,
  picker_context text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  resource_type text,
  metadata jsonb,
  is_exclusive boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_schedulable_calendar boolean,
  is_schedulable_tasks boolean,
  asset_status text,
  archived_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
  ctx text;
BEGIN
  IF picker_context IS NULL THEN
    ctx := NULL;
  ELSE
    ctx := lower(trim(picker_context));
    IF ctx NOT IN ('calendar', 'task') THEN
      RAISE EXCEPTION 'Invalid picker_context: use calendar, task, or NULL'
        USING HINT = 'Matches ResourcePickerContext in participants-resources.ts';
    END IF;
  END IF;

  IF ctx IS NULL THEN
    q := format(
      'SELECT r.id, r.name, r.resource_type, r.metadata, r.is_exclusive, r.created_at, r.updated_at,
              r.is_schedulable_calendar, r.is_schedulable_tasks, r.asset_status, r.archived_at
       FROM %I.resources r
       ORDER BY r.name ASC',
      schema_name
    );
  ELSIF ctx = 'calendar' THEN
    q := format(
      'SELECT r.id, r.name, r.resource_type, r.metadata, r.is_exclusive, r.created_at, r.updated_at,
              r.is_schedulable_calendar, r.is_schedulable_tasks, r.asset_status, r.archived_at
       FROM %I.resources r
       WHERE r.archived_at IS NULL
         AND lower(trim(r.asset_status)) <> ''retired''
         AND r.is_schedulable_calendar IS NOT FALSE
       ORDER BY r.name ASC',
      schema_name
    );
  ELSE
    q := format(
      'SELECT r.id, r.name, r.resource_type, r.metadata, r.is_exclusive, r.created_at, r.updated_at,
              r.is_schedulable_calendar, r.is_schedulable_tasks, r.asset_status, r.archived_at
       FROM %I.resources r
       WHERE r.archived_at IS NULL
         AND lower(trim(r.asset_status)) <> ''retired''
         AND (r.is_schedulable_calendar IS NOT FALSE OR r.is_schedulable_tasks IS TRUE)
       ORDER BY r.name ASC',
      schema_name
    );
  END IF;

  RETURN QUERY EXECUTE q;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_resources_dynamic(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
