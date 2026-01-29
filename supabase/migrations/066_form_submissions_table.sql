-- File: 066_form_submissions_table.sql
-- Creates form_submissions table (or alters existing one): one row per submission, links to form and optional contact.
-- contact_id is set after matching or creating a contact. payload stores the raw submission (JSONB).
-- If the table already exists (e.g. from an older migration with data/status/notes), we add the new columns.
-- Run in Supabase SQL Editor after 065.

SET search_path TO website_cms_template_dev, public;

-- Create table if it doesn't exist (full new schema)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES website_cms_template_dev.forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'
);

-- If table already existed with old schema (no contact_id), add new columns and backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'website_cms_template_dev' AND table_name = 'form_submissions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'website_cms_template_dev' AND table_name = 'form_submissions' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE website_cms_template_dev.form_submissions
      ADD COLUMN contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
      ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN payload JSONB NOT NULL DEFAULT '{}';
    -- Backfill payload from old "data" column if present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'website_cms_template_dev' AND table_name = 'form_submissions' AND column_name = 'data') THEN
      UPDATE website_cms_template_dev.form_submissions SET payload = COALESCE(data, '{}'::jsonb);
    END IF;
    -- Use created_at as submitted_at for existing rows if present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'website_cms_template_dev' AND table_name = 'form_submissions' AND column_name = 'created_at') THEN
      UPDATE website_cms_template_dev.form_submissions SET submitted_at = created_at WHERE created_at IS NOT NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON website_cms_template_dev.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON website_cms_template_dev.form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON website_cms_template_dev.form_submissions(submitted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.form_submissions TO anon, authenticated;
