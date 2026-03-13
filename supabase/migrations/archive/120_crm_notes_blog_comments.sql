-- File: 120_crm_notes_blog_comments.sql
-- Add blog comments to activity stream: content_id, status; allow contact_id null for note_type = 'blog_comment'.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Add columns for blog comments
ALTER TABLE website_cms_template_dev.crm_notes
  ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES website_cms_template_dev.content(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT;

COMMENT ON COLUMN website_cms_template_dev.crm_notes.content_id IS 'Set when note_type = blog_comment (post id).';
COMMENT ON COLUMN website_cms_template_dev.crm_notes.status IS 'For blog_comment: pending, approved, rejected. Null for other note types.';

-- Allow contact_id to be null for blog comments (commenter identified by author_id)
ALTER TABLE website_cms_template_dev.crm_notes
  ALTER COLUMN contact_id DROP NOT NULL;

-- Index for fetching approved comments by post
CREATE INDEX IF NOT EXISTS idx_crm_notes_content_id_status
  ON website_cms_template_dev.crm_notes(content_id, status)
  WHERE content_id IS NOT NULL;

-- Optional: constraint so blog_comment has status in allowed values (comment out if you prefer app-level only)
-- ALTER TABLE website_cms_template_dev.crm_notes
--   ADD CONSTRAINT chk_blog_comment_status
--   CHECK (note_type IS DISTINCT FROM 'blog_comment' OR status IN ('pending', 'approved', 'rejected'));
