-- File: 059_add_missing_forms_columns.sql
-- Add missing columns to forms table if they don't exist.
-- The forms table was created in archived migration 000 with different columns.
-- This migration adds auto_assign_tags and auto_assign_mag_ids to match migration 052.

SET search_path TO website_cms_template_dev, public;

-- Add auto_assign_tags column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'website_cms_template_dev' 
    AND table_name = 'forms' 
    AND column_name = 'auto_assign_tags'
  ) THEN
    ALTER TABLE website_cms_template_dev.forms 
    ADD COLUMN auto_assign_tags TEXT[];
  END IF;
END $$;

-- Add auto_assign_mag_ids column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'website_cms_template_dev' 
    AND table_name = 'forms' 
    AND column_name = 'auto_assign_mag_ids'
  ) THEN
    ALTER TABLE website_cms_template_dev.forms 
    ADD COLUMN auto_assign_mag_ids UUID[];
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
