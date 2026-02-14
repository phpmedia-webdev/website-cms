-- File: 112_content_total_chars_rpc.sql
-- Adds RPC to return total character count of content.body (for dashboard metric).
-- Run in Supabase SQL Editor.

SET search_path TO public;

-- get_content_total_chars_dynamic(schema_name) returns sum of length(body::text) for content in that schema.
CREATE OR REPLACE FUNCTION public.get_content_total_chars_dynamic(schema_name text)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BIGINT;
  q text;
BEGIN
  q := format(
    'SELECT COALESCE(SUM(LENGTH(body::text)), 0)::BIGINT FROM %I.content',
    schema_name
  );
  EXECUTE q INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_total_chars_dynamic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_total_chars_dynamic(text) TO service_role;
