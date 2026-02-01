-- File: 071_galleries_status_and_access.sql
-- Add status, access_level, required_mag_id, visibility_mode, restricted_message to galleries.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

-- status: draft (hidden from public) | published
ALTER TABLE website_cms_template_dev.galleries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'website_cms_template_dev' AND table_name = 'galleries' AND constraint_name = 'galleries_status_check'
  ) THEN
    ALTER TABLE website_cms_template_dev.galleries
      ADD CONSTRAINT galleries_status_check CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- access_level: public | members | mag (for membership protection)
ALTER TABLE website_cms_template_dev.galleries
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'public';

-- required_mag_id: when access_level = 'mag', user must have this MAG
ALTER TABLE website_cms_template_dev.galleries
  ADD COLUMN IF NOT EXISTS required_mag_id UUID REFERENCES website_cms_template_dev.mags(id) ON DELETE SET NULL;

-- visibility_mode: hidden | message (when access denied)
ALTER TABLE website_cms_template_dev.galleries
  ADD COLUMN IF NOT EXISTS visibility_mode TEXT DEFAULT 'hidden';

-- restricted_message: optional override when access denied
ALTER TABLE website_cms_template_dev.galleries
  ADD COLUMN IF NOT EXISTS restricted_message TEXT;

-- Backfill: existing galleries (created before this migration) get status = 'published'
UPDATE website_cms_template_dev.galleries
SET status = 'published';

NOTIFY pgrst, 'reload config';
