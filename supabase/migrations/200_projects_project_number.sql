-- File: 200_projects_project_number.sql
--
-- MANUAL SQL — YOU MUST RUN THIS
-- Copy this entire file → Supabase Dashboard → SQL Editor → Run (per tenant schema).
-- Replace website_cms_template_dev with your client schema if different.
--
-- What it does:
--   Human-readable project reference PROJ-YYYY-NNNNN (5-digit counter; resets Jan 1 UTC),
--   same pattern as migration 194 for TASK- / INV- (number_sequences + year-aware counter).
--   Adds projects.project_number, BEFORE INSERT trigger, backfill by created_at, NOT NULL.
--   Extends get_projects_dynamic / get_project_by_id_dynamic to return project_number.
--
-- If skipped: app expects project_number from RPC — UI falls back to truncated UUID until you run this.

SET search_path TO website_cms_template_dev, public;

-- 1. Sequence row (tenant number_sequences.name must be UNIQUE)
INSERT INTO website_cms_template_dev.number_sequences (name, format_template, sequence_length, start_number, last_value, sequence_year)
VALUES (
  'project',
  'PROJ-YYYY-NNNNN',
  5,
  1,
  0,
  EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'UTC'))::integer
)
ON CONFLICT (name) DO UPDATE SET
  format_template = EXCLUDED.format_template,
  sequence_length = EXCLUDED.sequence_length;

-- 2. Column (nullable until backfill)
ALTER TABLE website_cms_template_dev.projects
  ADD COLUMN IF NOT EXISTS project_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_number_unique
  ON website_cms_template_dev.projects(project_number)
  WHERE project_number IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.projects.project_number IS
  'Display/reference id (PROJ-YYYY-NNNNN). Counter resets Jan 1 UTC each year. FKs use projects.id (uuid).';

-- 3. Assign on INSERT (skip if client supplied non-null project_number for imports)
CREATE OR REPLACE FUNCTION website_cms_template_dev.projects_assign_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
  y INTEGER;
  proj_ts TIMESTAMPTZ;
BEGIN
  IF NEW.project_number IS NOT NULL AND btrim(NEW.project_number) <> '' THEN
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
  WHERE name = 'project'
  RETURNING format_template, sequence_length, last_value, sequence_year INTO rec;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'number_sequences row project not found';
  END IF;
  proj_ts := COALESCE(NEW.created_at, NOW());
  fmt := rec.format_template;
  fmt := replace(fmt, 'YYYY', rec.sequence_year::text);
  fmt := replace(fmt, 'MM', to_char(proj_ts AT TIME ZONE 'UTC', 'MM'));
  fmt := replace(fmt, 'DD', to_char(proj_ts AT TIME ZONE 'UTC', 'DD'));
  num_str := lpad(rec.last_value::text, rec.sequence_length, '0');
  fmt := regexp_replace(fmt, 'N+', num_str);
  NEW.project_number := fmt;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION website_cms_template_dev.projects_assign_project_number() IS
  'Assign PROJ-YYYY-NNNNN; NNNNN resets each UTC calendar year. YYYY/MM/DD tokens use issue time (UTC).';

DROP TRIGGER IF EXISTS projects_before_insert_project_number ON website_cms_template_dev.projects;
CREATE TRIGGER projects_before_insert_project_number
  BEFORE INSERT ON website_cms_template_dev.projects
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.projects_assign_project_number();

-- 4. Backfill existing projects (chronological; counter respects UTC year per row)
DO $$
DECLARE
  r RECORD;
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
  y INTEGER;
  proj_ts TIMESTAMPTZ;
BEGIN
  FOR r IN
    SELECT id, created_at
    FROM website_cms_template_dev.projects
    WHERE project_number IS NULL OR btrim(project_number) = ''
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    proj_ts := COALESCE(r.created_at, NOW());
    y := EXTRACT(YEAR FROM (proj_ts AT TIME ZONE 'UTC'))::integer;
    UPDATE website_cms_template_dev.number_sequences
    SET
      last_value = CASE
        WHEN COALESCE(sequence_year, -1) <> y THEN start_number
        ELSE last_value + 1
      END,
      sequence_year = y,
      updated_at = NOW()
    WHERE name = 'project'
    RETURNING format_template, sequence_length, last_value, sequence_year INTO rec;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'number_sequences row project not found';
    END IF;
    fmt := rec.format_template;
    fmt := replace(fmt, 'YYYY', rec.sequence_year::text);
    fmt := replace(fmt, 'MM', to_char(proj_ts AT TIME ZONE 'UTC', 'MM'));
    fmt := replace(fmt, 'DD', to_char(proj_ts AT TIME ZONE 'UTC', 'DD'));
    num_str := lpad(rec.last_value::text, rec.sequence_length, '0');
    fmt := regexp_replace(fmt, 'N+', num_str);
    UPDATE website_cms_template_dev.projects SET project_number = fmt WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE website_cms_template_dev.projects
  ALTER COLUMN project_number SET NOT NULL;

-- 5. RPCs — include project_number (match app Project type)
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_projects_dynamic(text, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_project_by_id_dynamic(text, uuid);

CREATE OR REPLACE FUNCTION public.get_projects_dynamic(
  schema_name text,
  status_term_id_filter uuid DEFAULT NULL,
  required_mag_id_filter uuid DEFAULT NULL,
  include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  project_number text,
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
  start_date date,
  due_date date,
  completed_date date,
  proposed_time integer,
  end_date_extended boolean,
  potential_sales numeric,
  required_mag_id uuid,
  contact_id uuid,
  client_organization_id uuid,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid
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
    'SELECT p.id, p.project_number, p.name, p.description, p.status_term_id, p.project_type_term_id, p.start_date, p.due_date,
            p.completed_date, p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p
     WHERE 1=1
       AND ($1::uuid IS NULL OR p.status_term_id = $1)
       AND ($2::uuid IS NULL OR p.required_mag_id = $2)
       AND ($3::boolean IS TRUE OR p.archived_at IS NULL)
     ORDER BY p.created_at DESC',
    schema_name
  );
  RETURN QUERY EXECUTE q USING status_term_id_filter, required_mag_id_filter, include_archived;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_by_id_dynamic(
  schema_name text,
  project_id_param uuid
)
RETURNS TABLE(
  id uuid,
  project_number text,
  name text,
  description text,
  status_term_id uuid,
  project_type_term_id uuid,
  start_date date,
  due_date date,
  completed_date date,
  proposed_time integer,
  end_date_extended boolean,
  potential_sales numeric,
  required_mag_id uuid,
  contact_id uuid,
  client_organization_id uuid,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid
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
    'SELECT p.id, p.project_number, p.name, p.description, p.status_term_id, p.project_type_term_id, p.start_date, p.due_date,
            p.completed_date, p.proposed_time, p.end_date_extended, p.potential_sales, p.required_mag_id, p.contact_id, p.client_organization_id, p.archived_at,
            p.created_at, p.updated_at, p.created_by
     FROM %I.projects p WHERE p.id = $1',
    schema_name
  );
  RETURN QUERY EXECUTE q USING project_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_projects_dynamic(text, uuid, uuid, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_by_id_dynamic(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
