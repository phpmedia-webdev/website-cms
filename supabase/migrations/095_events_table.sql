-- File: 095_events_table.sql
-- Events table for calendar module. Dual purpose: public events and internal meetings/bookings.
-- Core fields; recurrence via RRULE (expand on fly); access control (public | members | mag | private).
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  location TEXT,
  description TEXT,
  recurrence_rule TEXT,
  is_all_day BOOLEAN DEFAULT false,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public', 'members', 'mag', 'private')),
  required_mag_id UUID REFERENCES website_cms_template_dev.mags(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  event_type TEXT CHECK (event_type IN ('public', 'meeting', 'booking')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start_date ON website_cms_template_dev.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON website_cms_template_dev.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON website_cms_template_dev.events(status);
CREATE INDEX IF NOT EXISTS idx_events_access_level ON website_cms_template_dev.events(access_level);

ALTER TABLE website_cms_template_dev.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to events"
  ON website_cms_template_dev.events
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read public published events"
  ON website_cms_template_dev.events
  FOR SELECT TO anon
  USING (access_level = 'public' AND visibility = 'public' AND status = 'published');

GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.events TO anon, authenticated, service_role;

COMMENT ON TABLE website_cms_template_dev.events IS 'Calendar events. Public events for site; internal meetings/bookings. recurrence_rule = RRULE (null = one-off). access_level: public | members | mag | private. Times in UTC.';

NOTIFY pgrst, 'reload config';
