-- File: 191_conversation_threads_and_messages.sql
-- Phase 18C — Store B: threaded async messages (support, task comments, DMs, MAG group room, etc.).
-- See prd-technical §18C.3 / §18C.4. Run in SQL Editor after 190. Replace schema name if needed.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_type TEXT NOT NULL,
  mag_id UUID REFERENCES website_cms_template_dev.mags(id) ON DELETE SET NULL,
  subject_type TEXT,
  subject_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversation_threads_thread_type_check
    CHECK (thread_type = ANY (ARRAY[
      'support'::text,
      'task_ticket'::text,
      'blog_comment'::text,
      'product_comment'::text,
      'direct'::text,
      'mag_group'::text,
      'group'::text
    ]))
);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_mag_id
  ON website_cms_template_dev.conversation_threads(mag_id)
  WHERE mag_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_threads_subject
  ON website_cms_template_dev.conversation_threads(subject_type, subject_id)
  WHERE subject_id IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.conversation_threads IS
  'Phase 18C: thread head (type, optional MAG room, optional subject e.g. task id).';

CREATE TABLE IF NOT EXISTS website_cms_template_dev.thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES website_cms_template_dev.conversation_threads(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  parent_message_id UUID REFERENCES website_cms_template_dev.thread_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created
  ON website_cms_template_dev.thread_messages(thread_id, created_at DESC);

COMMENT ON TABLE website_cms_template_dev.thread_messages IS
  'Phase 18C: append-only messages; author is staff user and/or CRM contact (e.g. GPUM).';

CREATE TABLE IF NOT EXISTS website_cms_template_dev.thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES website_cms_template_dev.conversation_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT thread_participants_actor_check
    CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_thread_participants_thread_user
  ON website_cms_template_dev.thread_participants(thread_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_thread_participants_thread_contact
  ON website_cms_template_dev.thread_participants(thread_id, contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_thread_participants_thread
  ON website_cms_template_dev.thread_participants(thread_id);

COMMENT ON TABLE website_cms_template_dev.thread_participants IS
  'Phase 18C: DMs/small groups. MAG group rooms may omit rows; access from crm_contact_mags per §18C.4.';

ALTER TABLE website_cms_template_dev.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cms_template_dev.thread_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_threads_authenticated_all ON website_cms_template_dev.conversation_threads;
CREATE POLICY conversation_threads_authenticated_all
  ON website_cms_template_dev.conversation_threads FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS thread_messages_authenticated_all ON website_cms_template_dev.thread_messages;
CREATE POLICY thread_messages_authenticated_all
  ON website_cms_template_dev.thread_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS thread_participants_authenticated_all ON website_cms_template_dev.thread_participants;
CREATE POLICY thread_participants_authenticated_all
  ON website_cms_template_dev.thread_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.conversation_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.conversation_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.thread_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.thread_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.thread_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.thread_participants TO service_role;

NOTIFY pgrst, 'reload schema';
