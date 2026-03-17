-- File: 159_get_notes_by_conversation_uid.sql
-- Phase 19: Unified conversation (thread) — get notes by conversation_uid.
-- Same thread model for task threads (conversation_uid = 'task:' || task_id), messages, comment threads.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_notes_by_conversation_uid_dynamic(text, text);

CREATE FUNCTION public.get_notes_by_conversation_uid_dynamic(schema_name text, conversation_uid_param text)
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
  parent_note_id uuid,
  task_id uuid,
  conversation_uid text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT n.id, n.contact_id, n.body, n.author_id, n.note_type, n.created_at, n.updated_at, n.content_id, n.status, n.recipient_contact_id, n.parent_note_id, n.task_id, n.conversation_uid FROM %I.crm_notes n WHERE n.conversation_uid = $1 ORDER BY n.created_at ASC',
    schema_name
  ) USING conversation_uid_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notes_by_conversation_uid_dynamic(text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_notes_by_conversation_uid_dynamic(text, text) IS 'Unified thread: notes for one conversation (task thread conversation_uid = task:taskId, or message thread UID). Phase 19.';

NOTIFY pgrst, 'reload config';
