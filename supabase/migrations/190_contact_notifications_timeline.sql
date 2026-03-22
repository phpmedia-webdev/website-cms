-- File: 190_contact_notifications_timeline.sql
-- Phase 18C — Store A: contact-scoped notifications timeline (atomic events) for CRM + merged Messages/notifications.
-- Name avoids confusion with calendar `events`. Replaces volume on crm_notes for new event types over time; see prd-technical §18C.3 / §18C.8.
-- Run in Supabase SQL Editor after 189. Replace website_cms_template_dev with your tenant schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.contact_notifications_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  visibility TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_type TEXT,
  subject_id UUID,
  source_event TEXT,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_notifications_timeline_visibility_check
    CHECK (visibility = ANY (ARRAY['admin_only'::text, 'client_visible'::text, 'both'::text])),
  CONSTRAINT contact_notifications_timeline_kind_nonempty_check
    CHECK (length(trim(kind)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_contact_notifications_timeline_contact_created
  ON website_cms_template_dev.contact_notifications_timeline(contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_notifications_timeline_recipient_created
  ON website_cms_template_dev.contact_notifications_timeline(recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_notifications_timeline_kind
  ON website_cms_template_dev.contact_notifications_timeline(kind);

CREATE INDEX IF NOT EXISTS idx_contact_notifications_timeline_subject
  ON website_cms_template_dev.contact_notifications_timeline(subject_type, subject_id)
  WHERE subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_notifications_timeline_source_event
  ON website_cms_template_dev.contact_notifications_timeline(source_event)
  WHERE source_event IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.contact_notifications_timeline IS
  'Phase 18C: contact-scoped notifications timeline (not calendar events). GPUM APIs must filter visibility.';

COMMENT ON COLUMN website_cms_template_dev.contact_notifications_timeline.visibility IS
  'admin_only | client_visible | both — RLS is tenant-wide; route layer must hide admin_only from GPUM.';

COMMENT ON COLUMN website_cms_template_dev.contact_notifications_timeline.source_event IS
  'Idempotency key for ingest (e.g. stripe:invoice.paid:id); unique when set.';

ALTER TABLE website_cms_template_dev.contact_notifications_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_notifications_timeline_authenticated_all
  ON website_cms_template_dev.contact_notifications_timeline;
CREATE POLICY contact_notifications_timeline_authenticated_all
  ON website_cms_template_dev.contact_notifications_timeline
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.contact_notifications_timeline TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.contact_notifications_timeline TO service_role;

NOTIFY pgrst, 'reload schema';
