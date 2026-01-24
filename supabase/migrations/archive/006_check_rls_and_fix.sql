-- Check if RLS is enabled on settings table
-- If RLS is enabled without policies, queries will fail

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'website_cms_template_dev' 
  AND tablename = 'settings';

-- Check if RLS is actually enabled
SELECT 
  relname as table_name,
  relrowsecurity as "RLS Enabled",
  relforcerowsecurity as "RLS Forced"
FROM pg_class
WHERE relname = 'settings'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'website_cms_template_dev');

-- If RLS is enabled, disable it for settings table (since we're using service role)
-- Settings table should be accessible via service role which bypasses RLS anyway
ALTER TABLE website_cms_template_dev.settings DISABLE ROW LEVEL SECURITY;

-- Or create policies if you want to keep RLS enabled
-- Allow service role (bypasses RLS anyway) and authenticated users
-- CREATE POLICY "allow_all_on_settings" ON website_cms_template_dev.settings
--   FOR ALL
--   TO authenticated, anon
--   USING (true)
--   WITH CHECK (true);
