-- File: 063_add_message_to_crm_contacts.sql
-- Add staple "Message" column to crm_contacts (multi-line text from form submission or admin quick notes).
-- Run after 062. Replace schema name with your client schema when running in SQL Editor.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.crm_contacts
ADD COLUMN IF NOT EXISTS message TEXT;

NOTIFY pgrst, 'reload schema';
