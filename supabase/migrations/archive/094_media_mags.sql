-- File: 094_media_mags.sql
-- Media assignable to memberships (MAGs) via junction table. Same pattern as gallery_mags.
-- Protection uses this table; mag-tag on media remains optional for filtering only.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.media_mags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES website_cms_template_dev.media(id) ON DELETE CASCADE,
  mag_id UUID NOT NULL REFERENCES website_cms_template_dev.mags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, mag_id)
);

CREATE INDEX IF NOT EXISTS idx_media_mags_media_id ON website_cms_template_dev.media_mags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_mags_mag_id ON website_cms_template_dev.media_mags(mag_id);

ALTER TABLE website_cms_template_dev.media_mags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to media_mags"
  ON website_cms_template_dev.media_mags
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read media_mags"
  ON website_cms_template_dev.media_mags
  FOR SELECT TO anon
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.media_mags TO anon, authenticated, service_role;

COMMENT ON TABLE website_cms_template_dev.media_mags IS 'Membership (MAG) assignments for media. Media with one or more rows is restricted to users who have at least one of those MAGs.';

NOTIFY pgrst, 'reload config';
