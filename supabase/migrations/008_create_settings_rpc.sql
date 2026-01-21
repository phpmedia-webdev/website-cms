-- Create RPC functions in public schema to query settings from custom schema
-- This bypasses PostgREST's schema search issues
-- Functions are in public schema so PostgREST can find them, but they query the custom schema
-- 
-- NOTE: These functions use a schema parameter to support multiple client schemas
-- For each new client schema, you need to either:
-- 1. Create schema-specific versions of these functions, OR
-- 2. Use the dynamic version that accepts schema_name parameter (see below)

-- Option 1: Schema-specific function (create one per client schema)
-- Replace 'website_cms_template_dev' with your client schema name
CREATE OR REPLACE FUNCTION public.get_settings(keys text[])
RETURNS TABLE(key text, value jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
  SELECT s.key, s.value
  FROM website_cms_template_dev.settings s
  WHERE s.key = ANY(keys);
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_settings(text[]) TO anon, authenticated;

-- Also create a function to get a single setting
CREATE OR REPLACE FUNCTION public.get_setting(setting_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
  SELECT value
  FROM website_cms_template_dev.settings
  WHERE key = setting_key
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_setting(text) TO anon, authenticated;

-- Function to set/update a setting
CREATE OR REPLACE FUNCTION public.set_setting(setting_key text, setting_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  INSERT INTO website_cms_template_dev.settings (key, value)
  VALUES (setting_key, setting_value)
  ON CONFLICT (key) DO UPDATE SET value = setting_value, updated_at = NOW();
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_setting(text, jsonb) TO anon, authenticated;
