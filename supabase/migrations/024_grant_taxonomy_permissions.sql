-- Grant permissions for taxonomy tables to Supabase API roles
-- This allows PostgREST to access taxonomy tables in the client schema
-- IMPORTANT: Replace 'website_cms_template_dev' with your actual client schema name
-- NOTE: This migration is now handled by 025_migrate_taxonomy_to_client_schema.sql
-- This file is kept for reference but permissions are granted in migration 025

-- Set search_path to the client schema
SET search_path TO website_cms_template_dev, public;

-- Grant permissions on client schema tables
GRANT USAGE ON SCHEMA website_cms_template_dev TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.taxonomy_terms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.taxonomy_relationships TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.section_taxonomy_config TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon, authenticated;
