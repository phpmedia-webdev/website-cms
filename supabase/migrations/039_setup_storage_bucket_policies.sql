-- Media Library - Setup Storage Bucket Policies
-- Configures RLS policies for storage bucket to allow authenticated users to upload files
-- Bucket: client-website_cms_template_dev (template). For other schemas, replace bucket_name below.

DO $$
DECLARE
  bucket_name TEXT := 'client-website_cms_template_dev';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = bucket_name) THEN
    RAISE EXCEPTION 'Bucket % does not exist. Create it first in Dashboard → Storage.', bucket_name;
  END IF;

  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  EXECUTE format(
    'CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
    bucket_name
  );

  DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
  EXECUTE format(
    'CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
    bucket_name, bucket_name
  );

  DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
  EXECUTE format(
    'CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
    bucket_name
  );

  DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
  EXECUTE format(
    'CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT TO public USING (bucket_id = %L)',
    bucket_name
  );

  RAISE NOTICE 'Storage policies configured for bucket: %', bucket_name;
END $$;

-- Alternative: If the above doesn't work, use Supabase Dashboard method:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click on your bucket (client-website_cms_template_dev)
-- 3. Go to "Policies" tab
-- 4. Add these policies:
--
-- Policy 1: "Allow authenticated uploads"
--   - Policy name: Allow authenticated uploads
--   - Allowed operation: INSERT
--   - Target roles: authenticated
--   - USING expression: true
--   - WITH CHECK expression: true
--
-- Policy 2: "Allow authenticated updates"
--   - Policy name: Allow authenticated updates
--   - Allowed operation: UPDATE
--   - Target roles: authenticated
--   - USING expression: true
--   - WITH CHECK expression: true
--
-- Policy 3: "Allow authenticated deletes"
--   - Policy name: Allow authenticated deletes
--   - Allowed operation: DELETE
--   - Target roles: authenticated
--   - USING expression: true
--
-- Policy 4: "Allow public reads" (if bucket is public, this may already exist)
--   - Policy name: Allow public reads
--   - Allowed operation: SELECT
--   - Target roles: anon, authenticated
--   - USING expression: true
