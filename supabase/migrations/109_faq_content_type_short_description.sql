-- File: 109_faq_content_type_short_description.sql
-- Shorten FAQ content type description so Add New modal blocks don't overflow.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

UPDATE website_cms_template_dev.content_types
SET description = 'Structured Q&A for accordion and agent training.'
WHERE slug = 'faq';
