-- File: 107_content_types_remove_page_add_faq.sql
-- Add FAQ as a default, non-deletable content type for accordion-style Q&A content.
-- Page is not deleted here (content rows may reference it); the app hides Page in Content list, Add New modal, and Settings > Content Types.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Add FAQ as a core content type (cannot be deleted in Settings > Content Types)
INSERT INTO website_cms_template_dev.content_types (slug, label, description, is_core, display_order)
VALUES
  ('faq', 'FAQ', 'Structured Q&A for accordion and agent training.', true, 5)
ON CONFLICT (slug) DO NOTHING;
