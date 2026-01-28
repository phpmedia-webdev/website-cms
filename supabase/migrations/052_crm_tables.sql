-- File: 052_crm_tables.sql
-- CRM tables in client schema (per sessionlog step 1).
-- Contacts, notes log, custom fields, consents, form registry, minimal mags + contact–MAG junction.
-- Contact categories/tags use taxonomy_relationships (content_type = 'crm_contact'); no tags column on contacts.
-- Run after 051b.

SET search_path TO website_cms_template_dev, public;

-- 1. Form registry (referenced by crm_contacts.form_id)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  auto_assign_tags TEXT[],
  auto_assign_mag_ids UUID[],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Minimal mags table (so crm_contact_mags can reference it; expand in MAG migration later)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.mags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  uid TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRM contacts (staple fields only; no notes column, no tags array)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'archived')),
  dnd_status TEXT CHECK (dnd_status IS NULL OR dnd_status IN ('none', 'email', 'phone', 'all')),
  source TEXT,
  form_id UUID REFERENCES website_cms_template_dev.forms(id) ON DELETE SET NULL,
  external_crm_id TEXT,
  external_crm_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON website_cms_template_dev.crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON website_cms_template_dev.crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_at ON website_cms_template_dev.crm_contacts(created_at DESC);

-- 4. Notes log (relational; one row per note per contact)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID,
  note_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_contact_id ON website_cms_template_dev.crm_notes(contact_id);

-- 5. Custom field definitions (tenant-specific)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Custom field values per contact
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_contact_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, custom_field_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_custom_fields_contact_id ON website_cms_template_dev.crm_contact_custom_fields(contact_id);

-- 7. Contact–MAG junction
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_contact_mags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  mag_id UUID NOT NULL REFERENCES website_cms_template_dev.mags(id) ON DELETE CASCADE,
  assigned_via TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, mag_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_mags_contact_id ON website_cms_template_dev.crm_contact_mags(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_mags_mag_id ON website_cms_template_dev.crm_contact_mags(mag_id);

-- 8. Consents (simplified: contact_id, consent_type, granted/withdrawn)
CREATE TABLE IF NOT EXISTS website_cms_template_dev.crm_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consented BOOLEAN NOT NULL,
  ip_address INET,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_consents_contact_id ON website_cms_template_dev.crm_consents(contact_id);

-- Grants (client schema tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.forms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.mags TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.crm_contacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.crm_notes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.crm_custom_fields TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.crm_contact_custom_fields TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.crm_contact_mags TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.crm_consents TO anon, authenticated;
