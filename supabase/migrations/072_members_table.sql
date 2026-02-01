-- File: 072_members_table.sql
-- Create members table: qualified contacts (MAG + auth) for member portal access.
-- Member = contact elevated via purchase, admin grant, or signup code. user_id nullable until they register.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL UNIQUE REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_contact_id ON website_cms_template_dev.members(contact_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON website_cms_template_dev.members(user_id);

COMMENT ON TABLE website_cms_template_dev.members IS 'Qualified contacts with member portal access. Existence of row = member. user_id nullable until they register.';

-- RLS: authenticated full access (admin, API); anon may need INSERT for form/code flows (handled by service role in API)
ALTER TABLE website_cms_template_dev.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to members"
  ON website_cms_template_dev.members FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.members TO anon, authenticated;

NOTIFY pgrst, 'reload config';
