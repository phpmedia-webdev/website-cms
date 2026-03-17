-- File: 140_orders_woocommerce_order_id.sql
-- Step 47: WooCommerce import — store WooCommerce order ID for idempotency.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.orders
  ADD COLUMN IF NOT EXISTS woocommerce_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_woocommerce_order_id
  ON website_cms_template_dev.orders(woocommerce_order_id)
  WHERE woocommerce_order_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.orders.woocommerce_order_id IS 'WooCommerce order ID when order imported from WooCommerce; idempotency key. Not shown in tenant admin order UI (superadmin-only visibility per design).';
