-- Drop posts table; use universal content table only.
-- No data migration. Run after 046.

SET search_path TO website_cms_template_dev, public;

DROP TABLE IF EXISTS website_cms_template_dev.posts CASCADE;
