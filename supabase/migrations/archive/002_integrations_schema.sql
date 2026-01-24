-- Integrations schema migration
-- Creates table for third-party integration configuration
-- Note: This migration should be run in the context of a specific client schema
-- However, integrations are platform-wide, so this could also live in the public schema
-- For now, we'll add it to each client schema for consistency

-- Integrations table (third-party script configuration)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'google_analytics', 'visitor_tracking', 'simple_commenter'
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}', -- Vendor-specific configuration (measurement_id, vendor_uid, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_integrations_name ON integrations(name);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default integration entries (disabled by default)
INSERT INTO integrations (name, enabled, config) VALUES
  ('google_analytics', false, '{"measurement_id": ""}'),
  ('visitor_tracking', false, '{"websiteId": ""}'),
  ('simple_commenter', false, '{"domain": ""}')
ON CONFLICT (name) DO NOTHING;
