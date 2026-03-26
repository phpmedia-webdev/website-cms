-- ============================================================
-- MANUAL SQL - YOU MUST RUN THIS
-- Copy this file into Supabase SQL Editor and run it manually.
-- If skipped, older tasks may miss the required creator follower
-- row and assignment visibility can be inconsistent.
-- ============================================================
-- File: 210_tasks_creator_follower_backfill.sql

SET search_path TO website_cms_template_dev, public;

DO $$
DECLARE
  inserted_count integer := 0;
  missing_user_creator_count integer := 0;
BEGIN
  -- Backfill: ensure every task with creator_id has a matching
  -- task_followers creator row for that user.
  WITH inserted AS (
    INSERT INTO website_cms_template_dev.task_followers (
      task_id,
      user_id,
      contact_id,
      role
    )
    SELECT
      t.id,
      t.creator_id,
      NULL,
      'creator'
    FROM website_cms_template_dev.tasks t
    LEFT JOIN website_cms_template_dev.task_followers tf
      ON tf.task_id = t.id
     AND tf.role = 'creator'
     AND tf.user_id = t.creator_id
    WHERE t.creator_id IS NOT NULL
      AND tf.id IS NULL
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count FROM inserted;

  SELECT count(*)
    INTO missing_user_creator_count
  FROM website_cms_template_dev.tasks t
  WHERE t.creator_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM website_cms_template_dev.task_followers tf
      WHERE tf.task_id = t.id
        AND tf.role = 'creator'
        AND tf.user_id = t.creator_id
    );

  RAISE NOTICE 'Backfill inserted creator follower rows: %', inserted_count;
  RAISE NOTICE 'Remaining tasks with creator_id but no matching creator follower: %',
    missing_user_creator_count;
END $$;
