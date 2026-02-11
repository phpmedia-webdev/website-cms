-- File: 103_feature_registry_sidebar_match.sql
-- Align feature_registry with sidebar: order and hierarchy 1:1.
-- Run in Supabase SQL Editor. Adds missing features and sets display_order/parent_id.

SET search_path TO public;

-- Helper: get feature id by slug (for parent_id references)
-- We use subqueries below.

-- 1. Ensure CRM is top-level and has correct display_order
UPDATE public.feature_registry SET display_order = 20, parent_id = NULL WHERE slug = 'crm';

-- 2. Insert OmniChat (after Dashboard)
INSERT INTO public.feature_registry (slug, label, description, group_slug, display_order, is_core, is_enabled)
SELECT 'omnichat', 'OmniChat', 'Embedded chat for CRM.', 'crm', 15, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'omnichat');

-- 3. CRM children: Contacts, Forms, Form Submissions, Memberships, Code Generator
INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'contacts', 'Contacts', 'CRM contacts.', (SELECT id FROM public.feature_registry WHERE slug = 'crm'), 'crm', 21, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'contacts');

UPDATE public.feature_registry SET display_order = 22, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm') WHERE slug = 'forms';

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'form_submissions', 'Form Submissions', 'Form submission inbox.', (SELECT id FROM public.feature_registry WHERE slug = 'crm'), 'crm', 23, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'form_submissions');

UPDATE public.feature_registry SET display_order = 24, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm') WHERE slug = 'memberships';

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'code_generator', 'Code Generator', 'Membership code batches.', (SELECT id FROM public.feature_registry WHERE slug = 'crm'), 'crm', 25, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'code_generator');

-- Remove crm_chat if present (replaced by omnichat); or leave and set order
UPDATE public.feature_registry SET display_order = 19, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'crm') WHERE slug = 'crm_chat';

-- 4. Marketing (top-level) and Lists
INSERT INTO public.feature_registry (slug, label, description, group_slug, display_order, is_core, is_enabled)
SELECT 'marketing', 'Marketing', 'Marketing and lists landing.', 'crm', 30, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'marketing');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'lists', 'Lists', 'Email lists.', (SELECT id FROM public.feature_registry WHERE slug = 'marketing'), 'crm', 31, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'lists');

-- Marketing is top-level (sidebar section); ensure not under CRM
UPDATE public.feature_registry SET parent_id = NULL, display_order = 30 WHERE slug = 'marketing';

-- 5. Calendar (top-level) and Calendar + Resources
INSERT INTO public.feature_registry (slug, label, description, group_slug, display_order, is_core, is_enabled)
SELECT 'calendar', 'Calendar', 'Calendar and events section.', 'admin', 40, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'calendar');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'events', 'Calendar', 'Events calendar.', (SELECT id FROM public.feature_registry WHERE slug = 'calendar'), 'admin', 41, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'events');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'resources', 'Resources', 'Calendar resources.', (SELECT id FROM public.feature_registry WHERE slug = 'calendar'), 'admin', 42, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'resources');

-- 6. Media section: ensure Media is parent, Library (media) and Galleries as children
-- If "library" does not exist, add it; media row becomes section or we add media_section
UPDATE public.feature_registry SET display_order = 50, parent_id = NULL WHERE slug = 'media';
UPDATE public.feature_registry SET display_order = 52, parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'media') WHERE slug = 'galleries';

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'library', 'Library', 'Media library.', (SELECT id FROM public.feature_registry WHERE slug = 'media'), 'admin', 51, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'library');

-- 7. Content, Settings
UPDATE public.feature_registry SET display_order = 60, parent_id = NULL WHERE slug = 'content';
UPDATE public.feature_registry SET display_order = 70, parent_id = NULL WHERE slug = 'settings';

-- 8. Support (top-level) and children
INSERT INTO public.feature_registry (slug, label, description, group_slug, display_order, is_core, is_enabled)
SELECT 'support', 'Support', 'Support and help.', 'admin', 80, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'support');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'quick_support', 'Quick Support', 'Quick support.', (SELECT id FROM public.feature_registry WHERE slug = 'support'), 'admin', 81, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'quick_support');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'knowledge_base', 'Knowledge Base', 'Knowledge base.', (SELECT id FROM public.feature_registry WHERE slug = 'support'), 'admin', 82, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'knowledge_base');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'workhub', 'WorkHub', 'Collaboration platform link.', (SELECT id FROM public.feature_registry WHERE slug = 'support'), 'admin', 83, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'workhub');

-- 9. Dashboard and Superadmin
UPDATE public.feature_registry SET display_order = 10, parent_id = NULL WHERE slug = 'dashboard';
UPDATE public.feature_registry SET display_order = 100, parent_id = NULL WHERE slug = 'superadmin';
