-- File: 171_feature_registry_ecommerce.sql
-- Add Ecommerce feature registry rows so gating matches the sidebar.

SET search_path TO public;

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'social', 'Social', 'Social posting and channels.', (SELECT id FROM public.feature_registry WHERE slug = 'marketing'), 'crm', 31, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'social');

UPDATE public.feature_registry
SET display_order = 32,
    parent_id = (SELECT id FROM public.feature_registry WHERE slug = 'marketing')
WHERE slug = 'lists';

INSERT INTO public.feature_registry (slug, label, description, group_slug, display_order, is_core, is_enabled)
VALUES
  ('ecommerce', 'Ecommerce', 'Ecommerce dashboard and sections.', 'admin', 45, true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'products', 'Products', 'Ecommerce products.', (SELECT id FROM public.feature_registry WHERE slug = 'ecommerce'), 'admin', 46, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'products');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'transactions', 'Transactions', 'Ecommerce transactions.', (SELECT id FROM public.feature_registry WHERE slug = 'ecommerce'), 'admin', 47, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'transactions');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'invoices', 'Invoices', 'Ecommerce invoices.', (SELECT id FROM public.feature_registry WHERE slug = 'ecommerce'), 'admin', 48, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'invoices');

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'subscriptions', 'Subscriptions', 'Ecommerce subscriptions.', (SELECT id FROM public.feature_registry WHERE slug = 'ecommerce'), 'admin', 49, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'subscriptions');
