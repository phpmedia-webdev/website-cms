-- File: 132_orders_tables.sql
-- Phase 09 Ecommerce Step 14: Orders and order_items (tenant schema).
-- Orders store customer_email, optional contact_id/user_id, status, totals, Stripe session id, billing/shipping snapshot, optional coupon/discount.
-- Order items store product ref (content_id), name snapshot, quantity, unit_price, line_total, shippable flag.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_checkout_session_id TEXT,
  billing_snapshot JSONB,
  shipping_snapshot JSONB,
  coupon_code TEXT,
  coupon_batch_id UUID REFERENCES website_cms_template_dev.membership_code_batches(id) ON DELETE SET NULL,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON website_cms_template_dev.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_contact_id ON website_cms_template_dev.orders(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON website_cms_template_dev.orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON website_cms_template_dev.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id ON website_cms_template_dev.orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON website_cms_template_dev.orders(created_at DESC);

CREATE TABLE IF NOT EXISTS website_cms_template_dev.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES website_cms_template_dev.orders(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES website_cms_template_dev.content(id) ON DELETE RESTRICT,
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL,
  shippable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON website_cms_template_dev.order_items(order_id);

ALTER TABLE website_cms_template_dev.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.order_items ENABLE ROW LEVEL SECURITY;

-- Access via service role only (API/server). Admin and customer order views will use API or RLS policies later.
CREATE POLICY "Service role full access orders"
  ON website_cms_template_dev.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access order_items"
  ON website_cms_template_dev.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.order_items TO service_role;
