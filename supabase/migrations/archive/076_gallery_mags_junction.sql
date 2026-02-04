-- File: 076_gallery_mags_junction.sql
-- Multi-MAG protection for galleries via junction table.
-- Access = user has ANY assigned MAG. Replaces singular required_mag_id.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

-- 1. Junction table: gallery_mags
CREATE TABLE IF NOT EXISTS website_cms_template_dev.gallery_mags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES website_cms_template_dev.galleries(id) ON DELETE CASCADE,
  mag_id UUID NOT NULL REFERENCES website_cms_template_dev.mags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, mag_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_mags_gallery_id ON website_cms_template_dev.gallery_mags(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_mags_mag_id ON website_cms_template_dev.gallery_mags(mag_id);

-- 2. RLS
ALTER TABLE website_cms_template_dev.gallery_mags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to gallery_mags"
  ON website_cms_template_dev.gallery_mags
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read gallery_mags"
  ON website_cms_template_dev.gallery_mags
  FOR SELECT TO anon
  USING (true);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.gallery_mags TO anon, authenticated, service_role;

-- 4. Migrate existing required_mag_id to junction (if any galleries have it set)
INSERT INTO website_cms_template_dev.gallery_mags (gallery_id, mag_id)
SELECT id, required_mag_id FROM website_cms_template_dev.galleries
WHERE required_mag_id IS NOT NULL
ON CONFLICT (gallery_id, mag_id) DO NOTHING;

NOTIFY pgrst, 'reload config';
