-- File: 137_product_subscription_fields.sql
-- Step 30: Product model for subscriptions — is_recurring, billing_interval, stripe_price_id.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS billing_interval TEXT;

ALTER TABLE website_cms_template_dev.product
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

COMMENT ON COLUMN website_cms_template_dev.product.is_recurring IS 'When true, product is a subscription (recurring billing).';
COMMENT ON COLUMN website_cms_template_dev.product.billing_interval IS 'Recurring interval: month or year. Required when is_recurring is true.';
COMMENT ON COLUMN website_cms_template_dev.product.stripe_price_id IS 'Stripe Price ID for recurring billing (subscription products). Set when recurring Price is created via Sync.';

CREATE INDEX IF NOT EXISTS idx_product_stripe_price_id ON website_cms_template_dev.product(stripe_price_id) WHERE stripe_price_id IS NOT NULL;
