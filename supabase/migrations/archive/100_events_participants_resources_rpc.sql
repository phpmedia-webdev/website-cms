-- File: 100_events_participants_resources_rpc.sql
-- RPCs for participants, resources, and event assignments (read-only). Used for event form and calendar filter.
-- Run in Supabase SQL Editor. Schema: client schema name passed as first arg.

SET search_path TO public;

-- get_resources_dynamic(schema_name) — list all resources
DROP FUNCTION IF EXISTS public.get_resources_dynamic(text);
CREATE FUNCTION public.get_resources_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  resource_type text,
  metadata jsonb,
  is_exclusive boolean,
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
    SELECT r.id, r.name, r.resource_type, r.metadata, r.is_exclusive, r.created_at, r.updated_at
    FROM %I.resources r
    ORDER BY r.name ASC
  ', schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

-- get_participants_dynamic(schema_name) — list all participants; join crm_contacts for display_name when source_type = crm_contact
DROP FUNCTION IF EXISTS public.get_participants_dynamic(text);
CREATE FUNCTION public.get_participants_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  source_type text,
  source_id uuid,
  display_name text
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
    SELECT p.id, p.source_type, p.source_id,
           CASE WHEN p.source_type = ''crm_contact'' THEN c.full_name ELSE NULL END AS display_name
    FROM %I.participants p
    LEFT JOIN %I.crm_contacts c ON p.source_type = ''crm_contact'' AND p.source_id = c.id
    ORDER BY p.source_type, p.source_id
  ', schema_name, schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

-- get_event_participants_dynamic(schema_name, event_id) — participants assigned to one event
DROP FUNCTION IF EXISTS public.get_event_participants_dynamic(text, uuid);
CREATE FUNCTION public.get_event_participants_dynamic(schema_name text, event_id_param uuid)
RETURNS TABLE(event_id uuid, participant_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT ep.event_id, ep.participant_id
    FROM %I.event_participants ep
    WHERE ep.event_id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_id_param;
END;
$$;

-- get_event_resources_dynamic(schema_name, event_id) — resources assigned to one event
DROP FUNCTION IF EXISTS public.get_event_resources_dynamic(text, uuid);
CREATE FUNCTION public.get_event_resources_dynamic(schema_name text, event_id_param uuid)
RETURNS TABLE(event_id uuid, resource_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT er.event_id, er.resource_id
    FROM %I.event_resources er
    WHERE er.event_id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_id_param;
END;
$$;

-- get_events_participants_bulk(schema_name, event_ids) — event_id, participant_id for many events (calendar filter)
DROP FUNCTION IF EXISTS public.get_events_participants_bulk(text, uuid[]);
CREATE FUNCTION public.get_events_participants_bulk(schema_name text, event_ids_param uuid[])
RETURNS TABLE(event_id uuid, participant_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF event_ids_param IS NULL OR array_length(event_ids_param, 1) IS NULL THEN
    RETURN;
  END IF;
  q := format('
    SELECT ep.event_id, ep.participant_id
    FROM %I.event_participants ep
    WHERE ep.event_id = ANY($1)
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_ids_param;
END;
$$;

-- get_events_resources_bulk(schema_name, event_ids) — event_id, resource_id for many events (calendar filter)
DROP FUNCTION IF EXISTS public.get_events_resources_bulk(text, uuid[]);
CREATE FUNCTION public.get_events_resources_bulk(schema_name text, event_ids_param uuid[])
RETURNS TABLE(event_id uuid, resource_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF event_ids_param IS NULL OR array_length(event_ids_param, 1) IS NULL THEN
    RETURN;
  END IF;
  q := format('
    SELECT er.event_id, er.resource_id
    FROM %I.event_resources er
    WHERE er.event_id = ANY($1)
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_ids_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_resources_dynamic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_participants_dynamic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_participants_dynamic(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_resources_dynamic(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_events_participants_bulk(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_events_resources_bulk(text, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload config';
