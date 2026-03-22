-- File: 194_number_sequences_calendar_year_reset.sql
-- Calendar year (UTC) reset for invoice/order and task display numbers: INV-YYYY-NNNNN, TASK-YYYY-NNNNN.
-- When UTC year changes (Jan 1 UTC), last_value resets to start_number (default 1) for that sequence row.
-- No cron: check runs inside get_next_invoice_order_number() and tasks_assign_task_number() on each issue.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev if your tenant schema differs.

SET search_path TO website_cms_template_dev, public;

-- 1. Track which calendar year (UTC) last_value belongs to
ALTER TABLE website_cms_template_dev.number_sequences
  ADD COLUMN IF NOT EXISTS sequence_year INTEGER;

COMMENT ON COLUMN website_cms_template_dev.number_sequences.sequence_year IS 'UTC calendar year for which last_value is the current counter; on year change, counter resets to start_number.';

-- 2. Initialize: assume existing last_value is for "current" UTC year so next issue does not jump until Jan 1 UTC
UPDATE website_cms_template_dev.number_sequences
SET sequence_year = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'UTC'))::integer
WHERE sequence_year IS NULL;

-- 3. Normalize templates (5-digit segment)
UPDATE website_cms_template_dev.number_sequences
SET format_template = 'INV-YYYY-NNNNN', sequence_length = 5
WHERE name = 'invoice_order';

UPDATE website_cms_template_dev.number_sequences
SET format_template = 'TASK-YYYY-NNNNN', sequence_length = 5
WHERE name = 'task';

INSERT INTO website_cms_template_dev.number_sequences (name, format_template, sequence_length, start_number, last_value, sequence_year)
VALUES (
  'task',
  'TASK-YYYY-NNNNN',
  5,
  1,
  0,
  EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'UTC'))::integer
)
ON CONFLICT (name) DO NOTHING;

-- 4. Invoice / order number (shared row invoice_order)
CREATE OR REPLACE FUNCTION website_cms_template_dev.get_next_invoice_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
  y INTEGER;
BEGIN
  y := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'UTC'))::integer;
  UPDATE website_cms_template_dev.number_sequences
  SET
    last_value = CASE
      WHEN COALESCE(sequence_year, -1) <> y THEN start_number
      ELSE last_value + 1
    END,
    sequence_year = y,
    updated_at = NOW()
  WHERE name = 'invoice_order'
  RETURNING format_template, sequence_length, last_value, sequence_year INTO rec;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'number_sequences row invoice_order not found';
  END IF;
  fmt := rec.format_template;
  fmt := replace(fmt, 'YYYY', rec.sequence_year::text);
  fmt := replace(fmt, 'MM', to_char(NOW() AT TIME ZONE 'UTC', 'MM'));
  fmt := replace(fmt, 'DD', to_char(NOW() AT TIME ZONE 'UTC', 'DD'));
  num_str := lpad(rec.last_value::text, rec.sequence_length, '0');
  fmt := regexp_replace(fmt, 'N+', num_str);
  RETURN fmt;
END;
$$;

GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_next_invoice_order_number() TO service_role;

COMMENT ON FUNCTION website_cms_template_dev.get_next_invoice_order_number() IS
  'Next invoice/order display number; NNNNN resets each UTC calendar year (Jan 1 UTC). Template INV-YYYY-NNNNN.';

-- 5. Task number trigger
CREATE OR REPLACE FUNCTION website_cms_template_dev.tasks_assign_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
  y INTEGER;
  task_ts TIMESTAMPTZ;
BEGIN
  IF NEW.task_number IS NOT NULL AND btrim(NEW.task_number) <> '' THEN
    RETURN NEW;
  END IF;
  y := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'UTC'))::integer;
  UPDATE website_cms_template_dev.number_sequences
  SET
    last_value = CASE
      WHEN COALESCE(sequence_year, -1) <> y THEN start_number
      ELSE last_value + 1
    END,
    sequence_year = y,
    updated_at = NOW()
  WHERE name = 'task'
  RETURNING format_template, sequence_length, last_value, sequence_year INTO rec;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'number_sequences row task not found';
  END IF;
  task_ts := COALESCE(NEW.created_at, NOW());
  fmt := rec.format_template;
  fmt := replace(fmt, 'YYYY', rec.sequence_year::text);
  fmt := replace(fmt, 'MM', to_char(task_ts AT TIME ZONE 'UTC', 'MM'));
  fmt := replace(fmt, 'DD', to_char(task_ts AT TIME ZONE 'UTC', 'DD'));
  num_str := lpad(rec.last_value::text, rec.sequence_length, '0');
  fmt := regexp_replace(fmt, 'N+', num_str);
  NEW.task_number := fmt;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION website_cms_template_dev.tasks_assign_task_number() IS
  'Assign TASK-YYYY-NNNNN; NNNNN resets each UTC calendar year. YYYY/MM/DD tokens use issue time (UTC).';

COMMENT ON COLUMN website_cms_template_dev.tasks.task_number IS
  'Display/reference id (TASK-YYYY-NNNNN). Counter resets Jan 1 UTC each year. FKs use tasks.id (uuid).';

COMMENT ON COLUMN website_cms_template_dev.orders.order_number IS
  'Display number from shared invoice sequence; INV-YYYY-NNNNN; NNNNN resets Jan 1 UTC each year.';

NOTIFY pgrst, 'reload schema';
