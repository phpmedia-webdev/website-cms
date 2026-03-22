-- File: 193_tasks_task_number.sql
-- Human-readable task reference: TASK-YYYY-NNNNN (5-digit zero-padded counter).
-- Uses tenant number_sequences row name = 'task'. Requires number_sequences table (e.g. archive 142_invoices_and_number_sequences.sql).
-- After 194: NNNNN resets each UTC calendar year; run 194_number_sequences_calendar_year_reset.sql for that behavior.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev if your tenant schema differs.

SET search_path TO website_cms_template_dev, public;

-- 1. Sequence row (hardwired template; not tenant-editable until a future Settings UI)
INSERT INTO website_cms_template_dev.number_sequences (name, format_template, sequence_length, start_number, last_value)
VALUES ('task', 'TASK-YYYY-NNNNN', 5, 1, 0)
ON CONFLICT (name) DO UPDATE SET
  format_template = EXCLUDED.format_template,
  sequence_length = EXCLUDED.sequence_length;

-- 2. Column (nullable until backfill)
ALTER TABLE website_cms_template_dev.tasks
  ADD COLUMN IF NOT EXISTS task_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_task_number_unique
  ON website_cms_template_dev.tasks(task_number)
  WHERE task_number IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.tasks.task_number IS 'Display/reference id (TASK-YYYY-NNNNN). Immutable after insert. FKs should use tasks.id (uuid).';

-- 3. Assign on INSERT (skip if client supplied non-null task_number for future imports)
CREATE OR REPLACE FUNCTION website_cms_template_dev.tasks_assign_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
BEGIN
  IF NEW.task_number IS NOT NULL AND btrim(NEW.task_number) <> '' THEN
    RETURN NEW;
  END IF;
  UPDATE website_cms_template_dev.number_sequences
  SET last_value = last_value + 1,
      updated_at = NOW()
  WHERE name = 'task'
  RETURNING format_template, sequence_length, last_value INTO rec;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'number_sequences row task not found';
  END IF;
  fmt := rec.format_template;
  fmt := replace(fmt, 'YYYY', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY'));
  fmt := replace(fmt, 'MM', lpad(to_char(NOW() AT TIME ZONE 'UTC', 'MM'), 2, '0'));
  fmt := replace(fmt, 'DD', lpad(to_char(NOW() AT TIME ZONE 'UTC', 'DD'), 2, '0'));
  num_str := lpad(rec.last_value::TEXT, rec.sequence_length, '0');
  fmt := regexp_replace(fmt, 'N+', num_str);
  NEW.task_number := fmt;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_before_insert_task_number ON website_cms_template_dev.tasks;
CREATE TRIGGER tasks_before_insert_task_number
  BEFORE INSERT ON website_cms_template_dev.tasks
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.tasks_assign_task_number();

-- 4. Backfill existing tasks (chronological; year token from task created_at)
DO $$
DECLARE
  r RECORD;
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
BEGIN
  FOR r IN
    SELECT id, created_at
    FROM website_cms_template_dev.tasks
    WHERE task_number IS NULL OR btrim(task_number) = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE website_cms_template_dev.number_sequences
    SET last_value = last_value + 1,
        updated_at = NOW()
    WHERE name = 'task'
    RETURNING format_template, sequence_length, last_value INTO rec;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'number_sequences row task not found';
    END IF;
    fmt := rec.format_template;
    fmt := replace(fmt, 'YYYY', to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY'));
    fmt := replace(fmt, 'MM', lpad(to_char(r.created_at AT TIME ZONE 'UTC', 'MM'), 2, '0'));
    fmt := replace(fmt, 'DD', lpad(to_char(r.created_at AT TIME ZONE 'UTC', 'DD'), 2, '0'));
    num_str := lpad(rec.last_value::TEXT, rec.sequence_length, '0');
    fmt := regexp_replace(fmt, 'N+', num_str);
    UPDATE website_cms_template_dev.tasks SET task_number = fmt WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE website_cms_template_dev.tasks
  ALTER COLUMN task_number SET NOT NULL;

-- 5. RPCs: return task_number
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_tasks_dynamic(text, uuid[], text[], text[], text[], uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.get_task_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_tasks_dynamic(
  schema_name text,
  project_ids uuid[] DEFAULT NULL,
  status_slugs text[] DEFAULT NULL,
  type_slugs text[] DEFAULT NULL,
  phase_slugs text[] DEFAULT NULL,
  assignee_user_ids uuid[] DEFAULT NULL,
  assignee_contact_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  task_number text,
  title text,
  description text,
  task_status_slug text,
  task_type_slug text,
  task_phase_slug text,
  priority_term_id uuid,
  proposed_time integer,
  actual_time integer,
  due_date date,
  start_date date,
  creator_id uuid,
  responsible_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format(
    'SELECT t.id, t.project_id, t.task_number, t.title, t.description, t.task_status_slug, t.task_type_slug, t.task_phase_slug,
            t.priority_term_id, t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t
     WHERE
       ($1 IS NULL OR cardinality($1) = 0 OR t.project_id = ANY($1))
       AND ($2 IS NULL OR cardinality($2) = 0 OR lower(trim(t.task_status_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($2::text[]) AS s
           ))
       AND ($3 IS NULL OR cardinality($3) = 0 OR lower(trim(t.task_type_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($3::text[]) AS s
           ))
       AND ($4 IS NULL OR cardinality($4) = 0 OR lower(trim(t.task_phase_slug)) = ANY(
             SELECT lower(trim(s)) FROM unnest($4::text[]) AS s
           ))
       AND (
         (
           ($5 IS NULL OR cardinality($5) = 0)
           AND ($6 IS NULL OR cardinality($6) = 0)
         )
         OR
         (
           ($5 IS NOT NULL AND cardinality($5) > 0 AND (
             t.responsible_id = ANY($5)
             OR t.creator_id = ANY($5)
             OR EXISTS (
               SELECT 1 FROM %I.task_followers tf
               WHERE tf.task_id = t.id AND tf.user_id = ANY($5)
             )
           ))
           OR
           ($6 IS NOT NULL AND cardinality($6) > 0 AND EXISTS (
             SELECT 1 FROM %I.task_followers tf
             WHERE tf.task_id = t.id AND tf.contact_id = ANY($6)
           ))
         )
       )
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC',
    schema_name, schema_name, schema_name
  );
  RETURN QUERY EXECUTE q
    USING project_ids, status_slugs, type_slugs, phase_slugs, assignee_user_ids, assignee_contact_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tasks_dynamic(text, uuid[], text[], text[], text[], uuid[], uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_task_by_id_dynamic(
  schema_name text,
  task_id_param uuid
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  task_number text,
  title text,
  description text,
  task_status_slug text,
  task_type_slug text,
  task_phase_slug text,
  priority_term_id uuid,
  proposed_time integer,
  actual_time integer,
  due_date date,
  start_date date,
  creator_id uuid,
  responsible_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format(
    'SELECT t.id, t.project_id, t.task_number, t.title, t.description, t.task_status_slug, t.task_type_slug, t.task_phase_slug,
            t.priority_term_id, t.proposed_time, t.actual_time, t.due_date, t.start_date, t.creator_id, t.responsible_id,
            t.created_at, t.updated_at
     FROM %I.tasks t WHERE t.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_task_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
