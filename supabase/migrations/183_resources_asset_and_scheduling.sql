-- File: 183_resources_asset_and_scheduling.sql
-- Asset/resource readiness for lightweight inventory + scheduling.
-- Adds schedulability flags, asset lifecycle fields, and USD-only accounting fields.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Schedulability flags
ALTER TABLE website_cms_template_dev.resources
  ADD COLUMN IF NOT EXISTS is_schedulable_calendar BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_schedulable_tasks BOOLEAN NOT NULL DEFAULT false;

-- Asset lifecycle + inventory fields
ALTER TABLE website_cms_template_dev.resources
  ADD COLUMN IF NOT EXISTS asset_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_expires DATE,
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Financial fields (v1): USD-only, for depreciation/accounting reporting
ALTER TABLE website_cms_template_dev.resources
  ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS replacement_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE website_cms_template_dev.resources
SET currency = 'USD'
WHERE currency IS NULL OR btrim(currency) = '';

ALTER TABLE website_cms_template_dev.resources
  ALTER COLUMN currency SET DEFAULT 'USD',
  ALTER COLUMN currency SET NOT NULL;

-- Idempotent constraint refresh
ALTER TABLE website_cms_template_dev.resources
  DROP CONSTRAINT IF EXISTS resources_asset_status_check,
  DROP CONSTRAINT IF EXISTS resources_currency_usd_check,
  DROP CONSTRAINT IF EXISTS resources_purchase_cost_nonnegative_check,
  DROP CONSTRAINT IF EXISTS resources_replacement_cost_nonnegative_check;

ALTER TABLE website_cms_template_dev.resources
  ADD CONSTRAINT resources_asset_status_check
    CHECK (asset_status IN ('active', 'maintenance', 'retired')),
  ADD CONSTRAINT resources_currency_usd_check
    CHECK (currency = 'USD'),
  ADD CONSTRAINT resources_purchase_cost_nonnegative_check
    CHECK (purchase_cost IS NULL OR purchase_cost >= 0),
  ADD CONSTRAINT resources_replacement_cost_nonnegative_check
    CHECK (replacement_cost IS NULL OR replacement_cost >= 0);

-- Indexes for picker/admin filtering
CREATE INDEX IF NOT EXISTS idx_resources_schedulable_calendar
  ON website_cms_template_dev.resources(is_schedulable_calendar);

CREATE INDEX IF NOT EXISTS idx_resources_schedulable_tasks
  ON website_cms_template_dev.resources(is_schedulable_tasks);

CREATE INDEX IF NOT EXISTS idx_resources_archived_at
  ON website_cms_template_dev.resources(archived_at);

COMMENT ON COLUMN website_cms_template_dev.resources.asset_status IS
  'Operational lifecycle state: active, maintenance, retired.';

COMMENT ON COLUMN website_cms_template_dev.resources.archived_at IS
  'Soft-archive timestamp for audit retention. Retired/archived resources are not deleted.';

COMMENT ON COLUMN website_cms_template_dev.resources.is_schedulable_calendar IS
  'When true, resource can be selected in calendar/event resource pickers.';

COMMENT ON COLUMN website_cms_template_dev.resources.is_schedulable_tasks IS
  'When true, resource can be selected in task resource pickers.';

COMMENT ON COLUMN website_cms_template_dev.resources.currency IS
  'USD-only in v1 for this tenant and tenant clients.';

NOTIFY pgrst, 'reload schema';
