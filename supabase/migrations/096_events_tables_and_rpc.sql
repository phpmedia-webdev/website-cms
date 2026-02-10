-- File: 096_events_tables_and_rpc.sql
-- Phase A steps 2-8: event_exceptions, participants, resources, junctions, taxonomy extension, events RPC.
-- Per prd-technical: RPC functions in public schema, SET search_path = public, website_cms_template_dev (public FIRST).
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS before each CREATE POLICY).
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

-- ============================================================================
-- 1. event_exceptions — Override or delete single recurring occurrence
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_cms_template_dev.event_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES website_cms_template_dev.events(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('modified', 'deleted')),
  override_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_event_exceptions_event_id ON website_cms_template_dev.event_exceptions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_exceptions_occurrence_date ON website_cms_template_dev.event_exceptions(occurrence_date);

ALTER TABLE website_cms_template_dev.event_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to event_exceptions" ON website_cms_template_dev.event_exceptions;
CREATE POLICY "Allow authenticated full access to event_exceptions"
  ON website_cms_template_dev.event_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.event_exceptions TO anon, authenticated, service_role;

COMMENT ON TABLE website_cms_template_dev.event_exceptions IS 'Override or delete a single occurrence of a recurring event. exception_type: modified (use override_data) or deleted.';

-- ============================================================================
-- 2. participants — Bookable people (CRM contacts + Team members)
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_cms_template_dev.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('crm_contact', 'team_member')),
  source_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_source ON website_cms_template_dev.participants(source_type, source_id);

ALTER TABLE website_cms_template_dev.participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to participants" ON website_cms_template_dev.participants;
CREATE POLICY "Allow authenticated full access to participants"
  ON website_cms_template_dev.participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.participants TO anon, authenticated, service_role;

COMMENT ON TABLE website_cms_template_dev.participants IS 'Bookable people for events. source_type: crm_contact (source_id=crm_contacts.id) or team_member (source_id=user id).';

-- ============================================================================
-- 3. resources — Rooms, equipment, video links
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_cms_template_dev.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('room', 'equipment', 'video')),
  metadata JSONB,
  is_exclusive BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON website_cms_template_dev.resources(resource_type);

ALTER TABLE website_cms_template_dev.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to resources" ON website_cms_template_dev.resources;
CREATE POLICY "Allow authenticated full access to resources"
  ON website_cms_template_dev.resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.resources TO anon, authenticated, service_role;

COMMENT ON TABLE website_cms_template_dev.resources IS 'Bookable resources: rooms, equipment, video links. is_exclusive=true = one event per time slot.';

-- ============================================================================
-- 4. event_participants junction
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_cms_template_dev.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES website_cms_template_dev.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES website_cms_template_dev.participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON website_cms_template_dev.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_participant_id ON website_cms_template_dev.event_participants(participant_id);

ALTER TABLE website_cms_template_dev.event_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to event_participants" ON website_cms_template_dev.event_participants;
CREATE POLICY "Allow authenticated full access to event_participants"
  ON website_cms_template_dev.event_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.event_participants TO anon, authenticated, service_role;

-- ============================================================================
-- 5. event_resources junction
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_cms_template_dev.event_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES website_cms_template_dev.events(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES website_cms_template_dev.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_event_resources_event_id ON website_cms_template_dev.event_resources(event_id);
CREATE INDEX IF NOT EXISTS idx_event_resources_resource_id ON website_cms_template_dev.event_resources(resource_id);

ALTER TABLE website_cms_template_dev.event_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to event_resources" ON website_cms_template_dev.event_resources;
CREATE POLICY "Allow authenticated full access to event_resources"
  ON website_cms_template_dev.event_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.event_resources TO anon, authenticated, service_role;

-- ============================================================================
-- 6. Extend taxonomy for events — add event section if not exists
-- ============================================================================
INSERT INTO website_cms_template_dev.section_taxonomy_config (section_name, display_name, content_type, category_slugs, tag_slugs, is_staple)
VALUES ('event', 'Events', 'event', '{}', '{}', true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type;

-- Extend taxonomy_relationships to allow content_type = 'event'
ALTER TABLE website_cms_template_dev.taxonomy_relationships
  DROP CONSTRAINT IF EXISTS taxonomy_relationships_content_type_check;

DO $$
BEGIN
  ALTER TABLE website_cms_template_dev.taxonomy_relationships
    ADD CONSTRAINT taxonomy_relationships_content_type_check
    CHECK (
      content_type IN ('post', 'page', 'media', 'gallery', 'event', 'crm_contact')
      OR (content_type ~ '^[a-z0-9_-]+$' AND length(content_type) > 0)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL; -- constraint already exists (e.g. from prior run)
END
$$;

-- ============================================================================
-- 7. Events RPC functions (public schema, SECURITY DEFINER, search_path public first)
-- ============================================================================

-- get_events_dynamic(schema_name, start_date, end_date) — list events in date range
CREATE OR REPLACE FUNCTION public.get_events_dynamic(
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
           e.event_type, e.status, e.created_at, e.updated_at
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

-- get_event_by_id_dynamic(schema_name, event_id)
CREATE OR REPLACE FUNCTION public.get_event_by_id_dynamic(
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
           e.event_type, e.status, e.created_at, e.updated_at
    FROM %I.events e
    WHERE e.id = $1
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_events_dynamic(text, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload config';
