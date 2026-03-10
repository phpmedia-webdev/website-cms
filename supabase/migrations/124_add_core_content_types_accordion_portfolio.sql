-- File: 124_add_core_content_types_accordion_portfolio.sql
-- Add Accordion and Portfolio as core content types (cannot be deleted in Settings > Content Types).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.content_types (slug, label, description, is_core, display_order)
VALUES
  ('accordion', 'Accordion', 'Collapsible Q&A or expandable sections.', true, 6),
  ('portfolio', 'Portfolio', 'Project or work samples; gallery-style or list.', true, 7)
ON CONFLICT (slug) DO NOTHING;
