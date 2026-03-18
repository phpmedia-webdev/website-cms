-- File: 176_feature_registry_orders.sql
-- Add "orders" feature for Ecommerce Orders page/sidebar (replaces Transactions as main nav item; transactions slug kept for backward compatibility).

SET search_path TO public;

INSERT INTO public.feature_registry (slug, label, description, parent_id, group_slug, display_order, is_core, is_enabled)
SELECT 'orders', 'Orders', 'Ecommerce orders list and detail.', (SELECT id FROM public.feature_registry WHERE slug = 'ecommerce'), 'admin', 47, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.feature_registry WHERE slug = 'orders');
