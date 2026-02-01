-- File: 060_fix_forms_fields_column.sql
-- Fix forms table: remove NOT NULL constraint from 'fields' column.
-- The original migration (000) created forms with 'fields JSONB NOT NULL' for visual form builder.
-- The new CRM model uses forms as registry entries (name, slug, auto_assign_tags, auto_assign_mag_ids).
-- Custom fields are separate (crm_custom_fields table) and apply globally to contacts.

SET search_path TO website_cms_template_dev, public;

-- Make 'fields' column nullable (it's legacy from old form builder design)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'website_cms_template_dev' 
    AND table_name = 'forms' 
    AND column_name = 'fields'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE website_cms_template_dev.forms 
    ALTER COLUMN fields DROP NOT NULL;
  END IF;
END $$;

-- Set default value for 'fields' column if it doesn't have one
DO $$
BEGIN
  ALTER TABLE website_cms_template_dev.forms 
  ALTER COLUMN fields SET DEFAULT '[]'::jsonb;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if already has default or column doesn't exist
  NULL;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
