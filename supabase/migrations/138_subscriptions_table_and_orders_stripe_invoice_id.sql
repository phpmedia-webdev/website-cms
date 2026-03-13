-- File: 138_subscriptions_table_and_orders_stripe_invoice_id.sql
-- Step 33: Subscriptions table for Stripe subscription state; stripe_invoice_id on orders for idempotent invoice.paid.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Subscriptions: one row per Stripe subscription (created/updated from webhooks).
CREATE TABLE IF NOT EXISTS website_cms_template_dev.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  user_id UUID,
  content_id UUID REFERENCES website_cms_template_dev.content(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON website_cms_template_dev.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON website_cms_template_dev.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contact_id ON website_cms_template_dev.subscriptions(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON website_cms_template_dev.subscriptions(status);

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON website_cms_template_dev.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON website_cms_template_dev.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_subscriptions_updated_at();

ALTER TABLE website_cms_template_dev.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access subscriptions"
  ON website_cms_template_dev.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.subscriptions TO service_role;

-- Orders: add stripe_invoice_id for idempotent invoice.paid (subscription first payment + renewals).
ALTER TABLE website_cms_template_dev.orders
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_invoice_id ON website_cms_template_dev.orders(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.orders.stripe_invoice_id IS 'Stripe Invoice ID when order created from invoice.paid (subscription); idempotency key.';
