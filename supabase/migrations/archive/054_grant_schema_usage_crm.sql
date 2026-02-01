-- File: 054_grant_schema_usage_crm.sql
-- Fix "permission denied for schema website_cms_template_dev" when inserting/updating CRM tables.
-- Grants USAGE on the client schema so anon and authenticated can write to crm_contacts, etc.
-- Run in Supabase SQL Editor. Safe to run if already granted (no-op).

GRANT USAGE ON SCHEMA website_cms_template_dev TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon, authenticated;
