-- File: 101_calendar_resource_types_allow_custom.sql
-- Allow resources.resource_type to be any value; calendar resource types are now
-- managed in Settings > Customizer > Calendar (stored in settings key calendar.resource_types).
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

-- Drop the fixed CHECK so resource_type can store any slug from the Customizer list
ALTER TABLE website_cms_template_dev.resources
  DROP CONSTRAINT IF EXISTS resources_resource_type_check;

COMMENT ON COLUMN website_cms_template_dev.resources.resource_type IS 'Slug from Settings > Customizer > Calendar resource types (e.g. room, equipment, video).';

NOTIFY pgrst, 'reload config';
