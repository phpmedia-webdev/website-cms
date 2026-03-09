-- File: 118_signup_code_actions.sql
-- Signup pipeline: code → action mapping. Tenant-scoped; admin manages which actions run per signup code.
-- Run in Supabase SQL Editor. Replace schema name if your tenant uses a different schema.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.signup_code_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_code TEXT,
  action_type TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  config JSONB,
  redirect_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_code_actions_signup_code
  ON website_cms_template_dev.signup_code_actions(signup_code);

CREATE INDEX IF NOT EXISTS idx_signup_code_actions_lookup
  ON website_cms_template_dev.signup_code_actions(COALESCE(signup_code, ''), sort_order);

COMMENT ON TABLE website_cms_template_dev.signup_code_actions IS 'Signup pipeline: for each signup code (or NULL = default), which action_type to run and in what order. Subroutines live in code; this table is admin-managed.';

ALTER TABLE website_cms_template_dev.signup_code_actions ENABLE ROW LEVEL SECURITY;

-- Policies: only service role / authenticated admin should manage. For now, app uses service role for reads.
-- Add policies if anon/authenticated need constrained access later.

-- Default row: signups without a code run ensure_crm only (CRM + member row are also run always in code).
-- Default row: signups without a code run ensure_crm (CRM + member row are also run always in code).
INSERT INTO website_cms_template_dev.signup_code_actions (signup_code, action_type, sort_order, config, redirect_path)
SELECT NULL, 'ensure_crm', 0, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM website_cms_template_dev.signup_code_actions WHERE signup_code IS NULL AND action_type = 'ensure_crm' LIMIT 1);
