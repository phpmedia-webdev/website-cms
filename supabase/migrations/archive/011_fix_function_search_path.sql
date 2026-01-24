-- Fix function search_path security warning
-- Functions should have SET search_path to prevent search_path injection attacks

-- Fix update_updated_at_column function in custom schema
CREATE OR REPLACE FUNCTION website_cms_template_dev.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Note: The warnings about public schema functions (update_auth_user_invites_updated_at, etc.)
-- are from Supabase's own functions and cannot be modified. These are safe to ignore.

-- Note: The RLS policy warnings about "always true" are acceptable for this architecture:
-- - Each client has an isolated schema (data is already separated)
-- - Service role operations bypass RLS (admin operations work)
-- - Authenticated users need full access to their schema's data
-- - Schema-level isolation provides the security boundary
