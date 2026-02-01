-- Integrations RPC functions (per prd-technical: read operations use RPC, not .from())
-- Bypasses PostgREST schema search; functions in public schema query client schema via schema_name.

-- Get all integrations (dynamic schema)
CREATE OR REPLACE FUNCTION public.get_integrations_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  enabled boolean,
  config jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT i.id, i.name, i.enabled, i.config, i.created_at, i.updated_at FROM %I.integrations i ORDER BY i.name ASC',
    schema_name
  );
END;
$$;

-- Get single integration by name (dynamic schema)
CREATE OR REPLACE FUNCTION public.get_integration_by_name_dynamic(schema_name text, name_param text)
RETURNS TABLE(
  id uuid,
  name text,
  enabled boolean,
  config jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT i.id, i.name, i.enabled, i.config, i.created_at, i.updated_at FROM %I.integrations i WHERE i.name = $1 LIMIT 1',
    schema_name
  ) USING name_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_integrations_dynamic(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_integration_by_name_dynamic(text, text) TO anon, authenticated;
