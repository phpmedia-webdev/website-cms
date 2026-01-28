-- Flexible version: Grant permissions for taxonomy tables
-- This version tries to grant permissions on tables in common schema locations
-- Run 024b_find_taxonomy_schema.sql first to identify your schema, then use the specific version (024)

-- Option 1: If tables are in public schema
DO $$
BEGIN
  -- Check if tables exist in public schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'taxonomy_terms') THEN
    RAISE NOTICE 'Granting permissions on public schema...';
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.taxonomy_terms TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.taxonomy_relationships TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.section_taxonomy_config TO anon, authenticated;
    RAISE NOTICE 'Permissions granted on public schema';
  END IF;
END $$;

-- Option 2: If tables are in website_cms_template_dev schema
DO $$
BEGIN
  -- Check if tables exist in website_cms_template_dev schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'website_cms_template_dev' AND table_name = 'taxonomy_terms') THEN
    RAISE NOTICE 'Granting permissions on website_cms_template_dev schema...';
    GRANT USAGE ON SCHEMA website_cms_template_dev TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.taxonomy_terms TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.taxonomy_relationships TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.section_taxonomy_config TO anon, authenticated;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA website_cms_template_dev TO anon, authenticated;
    RAISE NOTICE 'Permissions granted on website_cms_template_dev schema';
  END IF;
END $$;

-- Note: If your schema is different, run 024b_find_taxonomy_schema.sql to find it,
-- then update 024_grant_taxonomy_permissions.sql with your schema name and run that instead.
