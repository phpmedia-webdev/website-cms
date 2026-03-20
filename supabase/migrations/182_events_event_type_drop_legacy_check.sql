-- File: 182_events_event_type_drop_legacy_check.sql
-- The original events table used CHECK (event_type IN ('public', 'meeting', 'booking')).
-- Event types are now driven by Customizer (scope event_type): webinar, deadline, internal, etc.
-- That legacy check rejects any slug not in the old three values → INSERT fails.
-- Drop the check so event_type stores the customizer slug; app/taxonomy remain source of truth.
--
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

COMMENT ON COLUMN website_cms_template_dev.events.event_type IS
  'Customizer slug (scope event_type), e.g. meeting, public, webinar. No fixed DB enum — options live in customizer.';
