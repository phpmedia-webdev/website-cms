-- File: 073_user_licenses_table.sql
-- Create user_licenses table: per-item ownership for media and courses (iTunes-style "My Library").
-- Access: MAG OR ownership grants access. Used for purchased media, course enrollment.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.user_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES website_cms_template_dev.members(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('media', 'course')),
  content_id UUID NOT NULL,
  granted_via TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_user_licenses_member_id ON website_cms_template_dev.user_licenses(member_id);
CREATE INDEX IF NOT EXISTS idx_user_licenses_content ON website_cms_template_dev.user_licenses(content_type, content_id);

COMMENT ON TABLE website_cms_template_dev.user_licenses IS 'Per-item ownership for media and courses. granted_via: purchase|admin|code|enrollment. expires_at NULL = lifetime.';

-- RLS: authenticated full access (admin grants; member reads own via API with member context)
ALTER TABLE website_cms_template_dev.user_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to user_licenses"
  ON website_cms_template_dev.user_licenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.user_licenses TO anon, authenticated;

NOTIFY pgrst, 'reload config';
