-- File: 054b_fix_schema_permissions_comprehensive.sql
-- Comprehensive fix for "permission denied for schema website_cms_template_dev".
-- Grants USAGE and table permissions to all relevant roles including service_role.
-- Run in Supabase SQL Editor.

-- 1. Grant USAGE on schema to all API roles
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON SCHEMA website_cms_template_dev TO authenticated;
GRANT USAGE ON SCHEMA website_cms_template_dev TO service_role;

-- 2. Grant sequence usage (for UUID generation, serial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO service_role;

-- 3. Grant table permissions on CRM tables explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_contacts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_notes TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_custom_fields TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_contact_custom_fields TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_contact_mags TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.crm_consents TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.forms TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.mags TO anon, authenticated, service_role;

-- 4. Grant permissions on ALL tables in schema (catches any we missed)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website_cms_template_dev TO anon, authenticated, service_role;

-- 5. Set default privileges for future tables created in this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA website_cms_template_dev
GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role;

-- 6. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Verify: list CRM tables (should show 8 tables)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'website_cms_template_dev' 
AND table_name LIKE 'crm%' OR table_name IN ('forms', 'mags')
ORDER BY table_name;
