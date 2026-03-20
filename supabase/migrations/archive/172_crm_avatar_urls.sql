-- File: 172_crm_avatar_urls.sql
-- Add avatar_url fields for CRM contacts and organizations so admin forms and project lists can show avatars.
-- CRM tables live in the tenant schema (same as 162, 170, etc.), not public.
-- If your fork uses a different schema name, replace website_cms_template_dev below.

ALTER TABLE website_cms_template_dev.crm_contacts
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE website_cms_template_dev.organizations
  ADD COLUMN IF NOT EXISTS avatar_url text;
