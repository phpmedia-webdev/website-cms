-- File: 068_extend_mags_and_contact_mags.sql
-- Step 1–2: Extend mags with start_date, end_date, status (active|draft); extend crm_contact_mags with starts_at, expires_at, status (Pending|Active|Paused|Cancelled|Expired).
-- Draft MAGs = hidden from all users; assignable in admin. Run after 067. Replace schema name with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. MAG table: start_date, end_date (nullable = lifetime), status (active | draft)
ALTER TABLE website_cms_template_dev.mags
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Constrain status; allow only active/draft (existing rows get default 'active')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'website_cms_template_dev' AND table_name = 'mags' AND constraint_name = 'mags_status_check'
  ) THEN
    ALTER TABLE website_cms_template_dev.mags
      ADD CONSTRAINT mags_status_check CHECK (status IN ('active', 'draft'));
  END IF;
END $$;

-- 2. Contact–MAG junction: starts_at, expires_at (nullable = lifetime), status (Pending|Active|Paused|Cancelled|Expired)
ALTER TABLE website_cms_template_dev.crm_contact_mags
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_contact_mags' AND constraint_name = 'crm_contact_mags_status_check'
  ) THEN
    ALTER TABLE website_cms_template_dev.crm_contact_mags
      ADD CONSTRAINT crm_contact_mags_status_check CHECK (status IN ('Pending', 'Active', 'Paused', 'Cancelled', 'Expired'));
  END IF;
END $$;

-- Backfill: existing contact_mags get starts_at = assigned_at if starts_at is null (handled by DEFAULT NOW() for new rows; existing rows may have null)
UPDATE website_cms_template_dev.crm_contact_mags
SET starts_at = COALESCE(starts_at, assigned_at),
    status = COALESCE(status, 'Active')
WHERE starts_at IS NULL OR status IS NULL;

NOTIFY pgrst, 'reload config';
