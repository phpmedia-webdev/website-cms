-- File: 058_update_notes_rpc_add_updated_at.sql
-- Update get_contact_notes_dynamic RPC to include updated_at column.
-- Run after 057.

-- Must drop first to change return type
DROP FUNCTION IF EXISTS public.get_contact_notes_dynamic(text, uuid);

CREATE FUNCTION public.get_contact_notes_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  contact_id uuid,
  body text,
  author_id uuid,
  note_type text,
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
    'SELECT n.id, n.contact_id, n.body, n.author_id, n.note_type, n.created_at, n.updated_at FROM %I.crm_notes n WHERE n.contact_id = $1 ORDER BY n.created_at DESC',
    schema_name
  ) USING contact_id_param;
END;
$$;

-- Ensure permissions remain
GRANT EXECUTE ON FUNCTION public.get_contact_notes_dynamic(text, uuid) TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
