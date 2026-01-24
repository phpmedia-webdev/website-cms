-- Enable Row Level Security (RLS) on all tables in the custom schema
-- This satisfies Supabase security best practices for exposed schemas
-- 
-- Note: Service role operations bypass RLS, but authenticated users will use these policies
-- Each client schema should have RLS enabled with appropriate policies

-- Enable RLS on all tables
ALTER TABLE website_cms_template_dev.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- These policies allow full access to authenticated users (admins and members)
-- Service role operations bypass RLS, so admin operations via service role still work

-- Media policies
CREATE POLICY "Allow authenticated users full access to media"
  ON website_cms_template_dev.media
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Posts policies
CREATE POLICY "Allow authenticated users full access to posts"
  ON website_cms_template_dev.posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Galleries policies
CREATE POLICY "Allow authenticated users full access to galleries"
  ON website_cms_template_dev.galleries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Gallery items policies
CREATE POLICY "Allow authenticated users full access to gallery_items"
  ON website_cms_template_dev.gallery_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Forms policies
CREATE POLICY "Allow authenticated users full access to forms"
  ON website_cms_template_dev.forms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Form submissions policies
CREATE POLICY "Allow authenticated users full access to form_submissions"
  ON website_cms_template_dev.form_submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Settings policies
CREATE POLICY "Allow authenticated users full access to settings"
  ON website_cms_template_dev.settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Integrations policies
CREATE POLICY "Allow authenticated users full access to integrations"
  ON website_cms_template_dev.integrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public read access for published content (optional - for public API access)
-- Uncomment these if you want anonymous users to read published posts/galleries

-- CREATE POLICY "Allow public read access to published posts"
--   ON website_cms_template_dev.posts
--   FOR SELECT
--   TO anon
--   USING (status = 'published');

-- CREATE POLICY "Allow public read access to galleries"
--   ON website_cms_template_dev.galleries
--   FOR SELECT
--   TO anon
--   USING (true);

-- Note: For multi-tenant security, you could add tenant_id checks:
-- USING ((SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid()) = 'website_cms_template_dev')
-- But since each schema is isolated, the current policies are sufficient.
