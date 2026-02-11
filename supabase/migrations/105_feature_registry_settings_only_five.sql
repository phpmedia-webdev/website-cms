-- File: 105_feature_registry_settings_only_five.sql
-- Disable legacy settings sub-features so only General, Style, Taxonomy, Customizer, Users
-- appear in the role assignment UI. Run in Supabase SQL Editor after 104.

SET search_path TO public;

-- Disable old settings children (from 083 or similar). Do not delete; role_features may reference them.
UPDATE public.feature_registry
SET is_enabled = false
WHERE slug IN (
  'fonts_colors',
  'content_types',
  'content_fields',
  'settings_crm',
  'security',
  'api'
);
