-- File: 065_drop_crm_contacts_status_check.sql
-- Drop CHECK on crm_contacts.status so status can be any value from the managed picklist (Settings > CRM).
-- Run after 064. Replace schema name with your client schema when running in SQL Editor.

SET search_path TO website_cms_template_dev, public;

-- PostgreSQL names inline CHECK constraints {table}_{column}_check
ALTER TABLE website_cms_template_dev.crm_contacts
DROP CONSTRAINT IF EXISTS crm_contacts_status_check;

NOTIFY pgrst, 'reload schema';
