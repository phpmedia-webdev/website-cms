-- File: 149_task_followers_table.sql
-- Phase 19: Task assignments — junction task_followers (task_id, user/contact, role).
-- Roles: creator | responsible | follower. Team can assign GPUM as follower; GPUM cannot self-assign as follower.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

CREATE TABLE IF NOT EXISTS website_cms_template_dev.task_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES website_cms_template_dev.tasks(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'responsible', 'follower')),
  user_id UUID,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_followers_assignee_check CHECK (
    (user_id IS NOT NULL AND contact_id IS NULL) OR (user_id IS NULL AND contact_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_followers_task_role_user
  ON website_cms_template_dev.task_followers(task_id, role, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_followers_task_role_contact
  ON website_cms_template_dev.task_followers(task_id, role, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_followers_task_id ON website_cms_template_dev.task_followers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_followers_user_id ON website_cms_template_dev.task_followers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_followers_contact_id ON website_cms_template_dev.task_followers(contact_id) WHERE contact_id IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.task_followers IS 'Task assignments: creator, responsible, follower. Used for my-tasks visibility; GPUM cannot self-assign as follower.';

ALTER TABLE website_cms_template_dev.task_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access task_followers"
  ON website_cms_template_dev.task_followers FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.task_followers TO service_role;
