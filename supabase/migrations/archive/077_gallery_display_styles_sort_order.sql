-- File: 077_gallery_display_styles_sort_order.sql
-- Add sort_order to gallery_display_styles. 'custom' uses gallery_items.position.
-- Run in Supabase SQL Editor. Schema: website_cms_template_dev (or your client schema).

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.gallery_display_styles
  ADD COLUMN IF NOT EXISTS sort_order TEXT NOT NULL DEFAULT 'as_added'
  CHECK (sort_order IN ('as_added', 'name_asc', 'name_desc', 'date_newest', 'date_oldest', 'custom'));

NOTIFY pgrst, 'reload config';
