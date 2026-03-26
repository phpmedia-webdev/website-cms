-- File: 214_message_center_mags_customizer.sql
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy this entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- If skipped: Message Center MAG rules, GPUM opt-in, Customizer seeds, and MAG RPC columns will not exist.

SET search_path TO website_cms_template_dev, public;

-- 1) MAG: tenant controls whether GPUM can use community chat in the MAG room (admins can still broadcast).
ALTER TABLE website_cms_template_dev.mags
  ADD COLUMN IF NOT EXISTS allow_conversations BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN website_cms_template_dev.mags.allow_conversations IS
  'When false, only top-level tenant admins (superadmin + website-cms-admin) may post to mag_group thread; GPUM community replies blocked. Announcements still allowed.';

-- 2) Contact: global opt-in for MAG community messaging (default off).
ALTER TABLE website_cms_template_dev.crm_contacts
  ADD COLUMN IF NOT EXISTS mag_community_messaging_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN website_cms_template_dev.crm_contacts.mag_community_messaging_enabled IS
  'GPUM: master switch for participating in MAG community threads; still need per-MAG opt-in row.';

-- 3) Per-MAG community opt-in (contact_id + mag_id).
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_contact_mag_community_opt_in (
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  mag_id UUID NOT NULL REFERENCES website_cms_template_dev.mags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, mag_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_mag_community_opt_in_mag
  ON website_cms_template_dev.crm_contact_mag_community_opt_in(mag_id);

COMMENT ON TABLE website_cms_template_dev.crm_contact_mag_community_opt_in IS
  'GPUM opts into community chat for a specific MAG (in addition to global mag_community_messaging_enabled).';

ALTER TABLE website_cms_template_dev.crm_contact_mag_community_opt_in ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_contact_mag_community_opt_in_authenticated_all
  ON website_cms_template_dev.crm_contact_mag_community_opt_in;
CREATE POLICY crm_contact_mag_community_opt_in_authenticated_all
  ON website_cms_template_dev.crm_contact_mag_community_opt_in FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_contact_mag_community_opt_in TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_contact_mag_community_opt_in TO service_role;

-- 4) Customizer seeds — Message Center filter/display scopes (idempotent).
INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('All items', 'all', NULL, 'message_center_category', 0, true),
  ('Conversations', 'conversations', NULL, 'message_center_category', 1, true),
  ('Notifications', 'notifications', NULL, 'message_center_category', 2, true)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Form submitted', 'form_submitted', NULL, 'message_center_timeline_kind', 0, true),
  ('Staff note', 'staff_note', NULL, 'message_center_timeline_kind', 1, false),
  ('Message', 'message', NULL, 'message_center_timeline_kind', 2, false),
  ('MAG assigned', 'mag_assigned', NULL, 'message_center_timeline_kind', 3, false)
ON CONFLICT (scope, slug) DO NOTHING;

INSERT INTO website_cms_template_dev.customizer (label, slug, color, scope, display_order, is_core)
VALUES
  ('Support', 'support', NULL, 'message_center_thread_type', 0, true),
  ('Task / ticket', 'task_ticket', NULL, 'message_center_thread_type', 1, true),
  ('Blog comment', 'blog_comment', NULL, 'message_center_thread_type', 2, true),
  ('MAG group', 'mag_group', NULL, 'message_center_thread_type', 3, true),
  ('Direct', 'direct', NULL, 'message_center_thread_type', 4, false),
  ('Group', 'group', NULL, 'message_center_thread_type', 5, false),
  ('Product comment', 'product_comment', NULL, 'message_center_thread_type', 6, false)
ON CONFLICT (scope, slug) DO NOTHING;

-- 5) MAG RPCs — include allow_conversations (return type change requires DROP/CREATE).
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
  allow_conversations boolean,
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
    'SELECT m.id, m.name, m.uid, m.description, m.start_date, m.end_date, m.status, m.parent_id, m.allow_conversations, m.created_at, m.updated_at FROM %I.mags m ORDER BY m.name ASC',
    schema_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mags_dynamic(text) TO anon, authenticated;

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
  allow_conversations boolean,
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
    'SELECT m.id, m.name, m.uid, m.description, m.start_date, m.end_date, m.status, m.parent_id, m.allow_conversations, m.created_at, m.updated_at FROM %I.mags m WHERE m.id = $1',
    schema_name
  ) USING mag_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mag_by_id_dynamic(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
