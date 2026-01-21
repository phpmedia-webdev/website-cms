-- Alternative: Dynamic RPC functions that accept schema name as parameter
-- This allows one set of functions to work with multiple schemas
-- Use this approach if you want to avoid creating functions per schema

-- Dynamic get_settings function
CREATE OR REPLACE FUNCTION public.get_settings_dynamic(schema_name text, keys text[])
RETURNS TABLE(key text, value jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_text text;
BEGIN
  -- Build dynamic query with schema name
  query_text := format('
    SELECT s.key, s.value
    FROM %I.settings s
    WHERE s.key = ANY($1)
  ', schema_name);
  
  -- Execute dynamic query
  RETURN QUERY EXECUTE query_text USING keys;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_settings_dynamic(text, text[]) TO anon, authenticated;

-- Dynamic get_setting function
CREATE OR REPLACE FUNCTION public.get_setting_dynamic(schema_name text, setting_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_text text;
  result jsonb;
BEGIN
  query_text := format('
    SELECT value
    FROM %I.settings
    WHERE key = $1
    LIMIT 1
  ', schema_name);
  
  EXECUTE query_text INTO result USING setting_key;
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_setting_dynamic(text, text) TO anon, authenticated;

-- Dynamic set_setting function
CREATE OR REPLACE FUNCTION public.set_setting_dynamic(schema_name text, setting_key text, setting_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_text text;
BEGIN
  query_text := format('
    INSERT INTO %I.settings (key, value)
    VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  ', schema_name);
  
  EXECUTE query_text USING setting_key, setting_value;
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_setting_dynamic(text, text, jsonb) TO anon, authenticated;

-- Note: If using dynamic functions, update src/lib/supabase/settings.ts to pass schema_name parameter
