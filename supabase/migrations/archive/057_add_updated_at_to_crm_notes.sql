-- File: 057_add_updated_at_to_crm_notes.sql
-- Add updated_at column to crm_notes for tracking edits.
-- Run after 056b.

ALTER TABLE website_cms_template_dev.crm_notes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
