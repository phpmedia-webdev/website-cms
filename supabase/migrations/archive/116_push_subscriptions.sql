-- File: 116_push_subscriptions.sql
-- Push subscription storage for PWA (admin status app). One row per user per endpoint; tenant-scoped.
-- Run in Supabase SQL Editor. Creates table in tenant schema (template: website_cms_template_dev).

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON website_cms_template_dev.push_subscriptions(user_id);

COMMENT ON TABLE website_cms_template_dev.push_subscriptions IS 'Web Push subscriptions for admin PWA (/status). Used to send push when notifications are enabled for actions (e.g. form submitted).';

ALTER TABLE website_cms_template_dev.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- No policies: app uses service role to insert/select/delete. Anon/authenticated have no direct access.
