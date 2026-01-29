-- File: 067_enable_rls_security_fix.sql
-- Supabase security linter: enable RLS on all exposed tables and fix "policy exists RLS disabled".
-- 1) media/media_variants: policies already exist; enable RLS only.
-- 2) Client schema (website_cms_template_dev): enable RLS + create policies (authenticated full; taxonomy + media get anon read).
-- 3) Public schema: enable RLS + create policies on taxonomy tables if they exist.
-- Run in Supabase SQL Editor after 066. Replace website_cms_template_dev with your client schema if different.

-- =============================================================================
-- 1. MEDIA (client schema): policies exist from archive 027; RLS was disabled in 030. Re-enable RLS only.
-- =============================================================================
ALTER TABLE website_cms_template_dev.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.media_variants ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. CLIENT SCHEMA: CRM, taxonomy, forms, marketing – enable RLS + create policies
-- Authenticated = full access (admin). Taxonomy + media already have anon read via existing policies.
-- =============================================================================

-- CRM
ALTER TABLE website_cms_template_dev.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_contacts"
  ON website_cms_template_dev.crm_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.crm_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_notes"
  ON website_cms_template_dev.crm_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.crm_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_custom_fields"
  ON website_cms_template_dev.crm_custom_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.crm_contact_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_contact_custom_fields"
  ON website_cms_template_dev.crm_contact_custom_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.crm_contact_mags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_contact_mags"
  ON website_cms_template_dev.crm_contact_mags FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.crm_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_consents"
  ON website_cms_template_dev.crm_consents FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.mags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to mags"
  ON website_cms_template_dev.mags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Forms
ALTER TABLE website_cms_template_dev.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to form_fields"
  ON website_cms_template_dev.form_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Marketing
ALTER TABLE website_cms_template_dev.marketing_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to marketing_lists"
  ON website_cms_template_dev.marketing_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE website_cms_template_dev.crm_contact_marketing_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to crm_contact_marketing_lists"
  ON website_cms_template_dev.crm_contact_marketing_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Taxonomy (client schema): authenticated full + anon read (public site may read categories/tags)
ALTER TABLE website_cms_template_dev.taxonomy_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to taxonomy_terms"
  ON website_cms_template_dev.taxonomy_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to taxonomy_terms"
  ON website_cms_template_dev.taxonomy_terms FOR SELECT TO anon USING (true);

ALTER TABLE website_cms_template_dev.taxonomy_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to taxonomy_relationships"
  ON website_cms_template_dev.taxonomy_relationships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to taxonomy_relationships"
  ON website_cms_template_dev.taxonomy_relationships FOR SELECT TO anon USING (true);

ALTER TABLE website_cms_template_dev.section_taxonomy_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to section_taxonomy_config"
  ON website_cms_template_dev.section_taxonomy_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to section_taxonomy_config"
  ON website_cms_template_dev.section_taxonomy_config FOR SELECT TO anon USING (true);

-- =============================================================================
-- 3. PUBLIC SCHEMA: taxonomy tables (if they exist – e.g. older deployments)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'taxonomy_terms') THEN
    ALTER TABLE public.taxonomy_terms ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'taxonomy_terms' AND policyname = 'Allow authenticated full access to taxonomy_terms') THEN
      EXECUTE 'CREATE POLICY "Allow authenticated full access to taxonomy_terms" ON public.taxonomy_terms FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'taxonomy_terms' AND policyname = 'Allow public read access to taxonomy_terms') THEN
      EXECUTE 'CREATE POLICY "Allow public read access to taxonomy_terms" ON public.taxonomy_terms FOR SELECT TO anon USING (true)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'taxonomy_relationships') THEN
    ALTER TABLE public.taxonomy_relationships ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'taxonomy_relationships' AND policyname = 'Allow authenticated full access to taxonomy_relationships') THEN
      EXECUTE 'CREATE POLICY "Allow authenticated full access to taxonomy_relationships" ON public.taxonomy_relationships FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'taxonomy_relationships' AND policyname = 'Allow public read access to taxonomy_relationships') THEN
      EXECUTE 'CREATE POLICY "Allow public read access to taxonomy_relationships" ON public.taxonomy_relationships FOR SELECT TO anon USING (true)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'section_taxonomy_config') THEN
    ALTER TABLE public.section_taxonomy_config ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'section_taxonomy_config' AND policyname = 'Allow authenticated full access to section_taxonomy_config') THEN
      EXECUTE 'CREATE POLICY "Allow authenticated full access to section_taxonomy_config" ON public.section_taxonomy_config FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'section_taxonomy_config' AND policyname = 'Allow public read access to section_taxonomy_config') THEN
      EXECUTE 'CREATE POLICY "Allow public read access to section_taxonomy_config" ON public.section_taxonomy_config FOR SELECT TO anon USING (true)';
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload config';
