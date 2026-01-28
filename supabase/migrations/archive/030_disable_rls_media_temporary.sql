-- Media Library - TEMPORARY: Disable RLS for testing
-- Once we verify the media library works, we'll re-enable RLS with proper policies

ALTER TABLE website_cms_template_dev.media DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.media_variants DISABLE ROW LEVEL SECURITY;
