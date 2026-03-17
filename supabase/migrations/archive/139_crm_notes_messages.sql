-- File: 139_crm_notes_messages.sql
-- Steps 36/41: Message type and threading. recipient_contact_id (null = to/from support); parent_note_id for replies.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.crm_notes
  ADD COLUMN IF NOT EXISTS recipient_contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL;

ALTER TABLE website_cms_template_dev.crm_notes
  ADD COLUMN IF NOT EXISTS parent_note_id UUID REFERENCES website_cms_template_dev.crm_notes(id) ON DELETE SET NULL;

COMMENT ON COLUMN website_cms_template_dev.crm_notes.recipient_contact_id IS 'For note_type=message: null = to/from support; set for client-to-client (future).';
COMMENT ON COLUMN website_cms_template_dev.crm_notes.parent_note_id IS 'Links reply to parent message for threading.';

CREATE INDEX IF NOT EXISTS idx_crm_notes_recipient_contact_id ON website_cms_template_dev.crm_notes(recipient_contact_id) WHERE recipient_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_notes_parent_note_id ON website_cms_template_dev.crm_notes(parent_note_id) WHERE parent_note_id IS NOT NULL;

-- Update get_contact_notes_dynamic to return new columns (and content_id, status for blog_comment).
DROP FUNCTION IF EXISTS public.get_contact_notes_dynamic(text, uuid);

CREATE FUNCTION public.get_contact_notes_dynamic(schema_name text, contact_id_param uuid)
RETURNS TABLE(
  id uuid,
  contact_id uuid,
  body text,
  author_id uuid,
  note_type text,
  created_at timestamptz,
  updated_at timestamptz,
  content_id uuid,
  status text,
  recipient_contact_id uuid,
  parent_note_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT n.id, n.contact_id, n.body, n.author_id, n.note_type, n.created_at, n.updated_at, n.content_id, n.status, n.recipient_contact_id, n.parent_note_id FROM %I.crm_notes n WHERE n.contact_id = $1 ORDER BY n.created_at DESC',
    schema_name
  ) USING contact_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_notes_dynamic(text, uuid) TO anon, authenticated, service_role;
