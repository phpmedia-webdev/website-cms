-- File: 104_feature_registry_settings_children.sql
-- Settings sub-items to match sidebar: General, Style, Taxonomy, Customizer, Users.
-- My Profile is not a feature (always visible to logged-in users). Run in Supabase SQL Editor.

SET search_path TO public;

-- Settings children (display_order 71-75); parent = settings
INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'general', 'General', 'General site settings.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 71, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'general');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'style', 'Style', 'Design system fonts and colors.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 72, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'style');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'taxonomy', 'Taxonomy', 'Categories and tags.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 73, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'taxonomy');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'customizer', 'Customizer', 'Content types and customizer.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 74, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'customizer');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'users', 'Users', 'Team and user management.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 75, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'users');

-- Ensure existing settings children have correct parent and order (e.g. from 083)
UPDATE public.feature_registry SET parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'settings'), display_order = 71 WHERE slug = 'general';
UPDATE public.feature_registry SET parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'settings'), display_order = 72 WHERE slug = 'style';
UPDATE public.feature_registry SET parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'settings'), display_order = 73 WHERE slug = 'taxonomy';
UPDATE public.feature_registry SET parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'settings'), display_order = 74 WHERE slug = 'customizer';
UPDATE public.feature_registry SET parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'settings'), display_order = 75 WHERE slug = 'users';
