-- File: 061_form_fields_table.sql
-- Form–field association: link forms to both core (standard contact) and custom fields.
-- Enables form-by-name lookup on public pages with ordered field list for form design.
-- Run after 060. Replace schema name with your client schema when running in SQL Editor.

SET search_path TO website_cms_template_dev, public;

-- form_fields: which fields belong to a form, in order (core = standard contact columns; custom = crm_custom_fields)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES website_cms_template_dev.forms(id) ON DELETE CASCADE,
  field_source TEXT NOT NULL CHECK (field_source IN ('core', 'custom')),
  core_field_key TEXT,
  custom_field_id UUID REFERENCES website_cms_template_dev.crm_custom_fields(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT form_fields_source_check CHECK (
    (field_source = 'core' AND core_field_key IS NOT NULL AND custom_field_id IS NULL)
    OR (field_source = 'custom' AND custom_field_id IS NOT NULL AND core_field_key IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON website_cms_template_dev.form_fields(form_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_fields_form_core ON website_cms_template_dev.form_fields(form_id, core_field_key) WHERE field_source = 'core';
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_fields_form_custom ON website_cms_template_dev.form_fields(form_id, custom_field_id) WHERE field_source = 'custom';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.form_fields TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
