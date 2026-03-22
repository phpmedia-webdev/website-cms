-- File: 192_blog_comment_thread_unique.sql
-- One conversation thread per CMS content (post) for blog comments (Phase 18C).
-- Run in Supabase SQL Editor after 191. Replace schema name if needed.

SET search_path TO website_cms_template_dev, public;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_threads_blog_comment_content
  ON website_cms_template_dev.conversation_threads (subject_type, subject_id)
  WHERE thread_type = 'blog_comment'::text
    AND subject_type = 'content'::text
    AND subject_id IS NOT NULL;

COMMENT ON INDEX website_cms_template_dev.uq_conversation_threads_blog_comment_content IS
  'Ensures a single blog_comment thread per content row (post).';

NOTIFY pgrst, 'reload schema';
