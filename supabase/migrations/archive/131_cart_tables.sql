-- File: 131_cart_tables.sql
-- Phase 09 Ecommerce Step 13a: Cart session and items (tenant schema).
-- Cart identified by session_id (stored in cookie); optional user_id when logged in for future merge/persistence.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_user_id ON website_cms_template_dev.cart_sessions(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_session_id UUID NOT NULL REFERENCES website_cms_template_dev.cart_sessions(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES website_cms_template_dev.content(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_session_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_session_id ON website_cms_template_dev.cart_items(cart_session_id);

ALTER TABLE website_cms_template_dev.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.cart_items ENABLE ROW LEVEL SECURITY;

-- Cart access only via service role (API uses server-side session cookie to identify cart).
CREATE POLICY "Service role full access cart_sessions"
  ON website_cms_template_dev.cart_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access cart_items"
  ON website_cms_template_dev.cart_items FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.cart_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.cart_items TO service_role;
