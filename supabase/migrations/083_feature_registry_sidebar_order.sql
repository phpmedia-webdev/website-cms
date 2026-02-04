-- File: 083_feature_registry_sidebar_order.sql
-- Reorder feature_registry to match sidebar nav; add sub-features for CRM, Media, Settings.

SET search_path TO public;

-- 1. Update existing rows: parent_id and display_order
UPDATE public.feature_registry SET display_order = 10, parent_id = NULL WHERE slug = 'dashboard';
UPDATE public.feature_registry SET display_order = 20, parent_id = NULL WHERE slug = 'crm';
UPDATE public.feature_registry SET display_order = 21, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm') WHERE slug = 'crm_chat';
UPDATE public.feature_registry SET display_order = 23, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm') WHERE slug = 'forms';
UPDATE public.feature_registry SET display_order = 25, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm') WHERE slug = 'memberships';
UPDATE public.feature_registry SET display_order = 30, parent_id = NULL WHERE slug = 'media';
UPDATE public.feature_registry SET display_order = 32, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'media') WHERE slug = 'galleries';
UPDATE public.feature_registry SET display_order = 40, parent_id = NULL WHERE slug = 'content';
UPDATE public.feature_registry SET display_order = 50, parent_id = NULL WHERE slug = 'settings';
UPDATE public.feature_registry SET display_order = 100, parent_id = NULL WHERE slug = 'superadmin';

-- 2. Insert new CRM sub-features (contacts, marketing, code_generator)
INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'contacts', 'Contacts', 'CRM contacts list and detail.', (SELECT id FROM public.feature_registry WHERE slug = 'crm'), 'crm', 22, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'contacts');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'marketing', 'Marketing', 'Email marketing and lists.', (SELECT id FROM public.feature_registry WHERE slug = 'crm'), 'crm', 24, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'marketing');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'code_generator', 'Code Generator', 'Membership code batches and redemption.', (SELECT id FROM public.feature_registry WHERE slug = 'crm'), 'crm', 26, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'code_generator');

-- 3. Insert Media sub-features (library)
INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'library', 'Library', 'Media library.', (SELECT id FROM public.feature_registry WHERE slug = 'media'), 'admin', 31, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'library');

-- 4. Insert Settings sub-features
INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'general', 'General', 'General site settings.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 51, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'general');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'fonts_colors', 'Fonts & Colors', 'Design system fonts and color palette (one setting for both).', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 52, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'fonts_colors');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'taxonomy', 'Taxonomy', 'Categories and tags.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 53, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'taxonomy');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'content_types', 'Content Types', 'Content type definitions.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 54, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'content_types');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'content_fields', 'Content Fields', 'Content type fields.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 55, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'content_fields');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'settings_crm', 'CRM', 'CRM settings (statuses, etc.).', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 56, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'settings_crm');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'security', 'Security', '2FA and security settings.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 57, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'security');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'api', 'API', 'API keys and settings.', (SELECT id FROM public.feature_registry WHERE slug = 'settings'), 'admin', 58, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'api');
