-- File: 154_crm_notes_task_id.sql
-- Phase 19 expansion: add task_id to crm_notes for task threads (support ticket comments, etc.).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Add task_id: note tied to a task (e.g. support ticket thread)
ALTER TABLE website_cms_template_dev.crm_notes
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES website_cms_template_dev.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_notes_task_id ON website_cms_template_dev.crm_notes(task_id) WHERE task_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.crm_notes.task_id IS 'When set, note is part of this task thread (e.g. support ticket). Phase 19 expansion.';

-- Update get_contact_notes_dynamic to return task_id (return type change → drop then create)
SET search_path TO public;

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
  parent_note_id uuid,
  task_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT n.id, n.contact_id, n.body, n.author_id, n.note_type, n.created_at, n.updated_at, n.content_id, n.status, n.recipient_contact_id, n.parent_note_id, n.task_id FROM %I.crm_notes n WHERE n.contact_id = $1 ORDER BY n.created_at DESC',
    schema_name
  ) USING contact_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_notes_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
