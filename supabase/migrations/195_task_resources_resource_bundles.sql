-- File: 195_task_resources_resource_bundles.sql
-- Task–resource junction (parity with event_resources), reusable resource Bundles (definitions + items),
-- optional bundle_instance_id on event/task assignments for rolled-up UI (same UUID = one bundle apply).
-- Replaces public RPC return shapes for get_event_resources_dynamic / get_events_resources_bulk (adds bundle_instance_id).
-- Adds get_task_resources_dynamic, get_resource_bundles_dynamic, get_resource_bundle_items_dynamic.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev if your tenant schema differs.

SET search_path TO website_cms_template_dev, public;

-- ---------------------------------------------------------------------------
-- 1. event_resources — optional bundle instance (nullable = single-resource assign)
-- ---------------------------------------------------------------------------
ALTER TABLE website_cms_template_dev.event_resources
  ADD COLUMN IF NOT EXISTS bundle_instance_id UUID;

COMMENT ON COLUMN website_cms_template_dev.event_resources.bundle_instance_id IS
  'When set, rows sharing this UUID were added in one bundle apply; NULL = assigned individually.';

CREATE INDEX IF NOT EXISTS idx_event_resources_bundle_instance_id
  ON website_cms_template_dev.event_resources(bundle_instance_id)
  WHERE bundle_instance_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. task_resources — junction (mirror event_resources)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_cms_template_dev.task_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES website_cms_template_dev.tasks(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES website_cms_template_dev.resources(id) ON DELETE CASCADE,
  bundle_instance_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_task_resources_task_id
  ON website_cms_template_dev.task_resources(task_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_resource_id
  ON website_cms_template_dev.task_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_bundle_instance_id
  ON website_cms_template_dev.task_resources(bundle_instance_id)
  WHERE bundle_instance_id IS NOT NULL;

COMMENT ON TABLE website_cms_template_dev.task_resources IS
  'Resources assigned to a task; bundle_instance_id groups rows from one bundle apply.';

COMMENT ON COLUMN website_cms_template_dev.task_resources.bundle_instance_id IS
  'When set, rows sharing this UUID were added in one bundle apply; NULL = assigned individually.';

ALTER TABLE website_cms_template_dev.task_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to task_resources" ON website_cms_template_dev.task_resources;
CREATE POLICY "Allow authenticated full access to task_resources"
  ON website_cms_template_dev.task_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.task_resources TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. resource_bundles — reusable definitions (UI: Bundle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_cms_template_dev.resource_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_bundles_name
  ON website_cms_template_dev.resource_bundles(name);

COMMENT ON TABLE website_cms_template_dev.resource_bundles IS
  'Named bundle of resources; items in resource_bundle_items. Editing a bundle does not change past event/task assignments.';

ALTER TABLE website_cms_template_dev.resource_bundles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to resource_bundles" ON website_cms_template_dev.resource_bundles;
CREATE POLICY "Allow authenticated full access to resource_bundles"
  ON website_cms_template_dev.resource_bundles FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.resource_bundles TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. resource_bundle_items — members of a bundle (sort_order for picker display)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_cms_template_dev.resource_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES website_cms_template_dev.resource_bundles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES website_cms_template_dev.resources(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_bundle_items_bundle_id
  ON website_cms_template_dev.resource_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_resource_bundle_items_resource_id
  ON website_cms_template_dev.resource_bundle_items(resource_id);

ALTER TABLE website_cms_template_dev.resource_bundle_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to resource_bundle_items" ON website_cms_template_dev.resource_bundle_items;
CREATE POLICY "Allow authenticated full access to resource_bundle_items"
  ON website_cms_template_dev.resource_bundle_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.resource_bundle_items TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Public RPCs — event resource reads (add bundle_instance_id)
-- ---------------------------------------------------------------------------
SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_event_resources_dynamic(text, uuid);
CREATE FUNCTION public.get_event_resources_dynamic(schema_name text, event_id_param uuid)
RETURNS TABLE(
  event_id uuid,
  resource_id uuid,
  bundle_instance_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT er.event_id, er.resource_id, er.bundle_instance_id
    FROM %I.event_resources er
    WHERE er.event_id = $1
    ORDER BY er.created_at ASC, er.resource_id ASC
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_id_param;
END;
$$;

DROP FUNCTION IF EXISTS public.get_events_resources_bulk(text, uuid[]);
CREATE FUNCTION public.get_events_resources_bulk(schema_name text, event_ids_param uuid[])
RETURNS TABLE(
  event_id uuid,
  resource_id uuid,
  bundle_instance_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF event_ids_param IS NULL OR array_length(event_ids_param, 1) IS NULL THEN
    RETURN;
  END IF;
  q := format('
    SELECT er.event_id, er.resource_id, er.bundle_instance_id
    FROM %I.event_resources er
    WHERE er.event_id = ANY($1)
    ORDER BY er.event_id ASC, er.created_at ASC, er.resource_id ASC
  ', schema_name);
  RETURN QUERY EXECUTE q USING event_ids_param;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Public RPCs — task resources + bundles
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_task_resources_dynamic(text, uuid);
CREATE FUNCTION public.get_task_resources_dynamic(schema_name text, task_id_param uuid)
RETURNS TABLE(
  task_id uuid,
  resource_id uuid,
  bundle_instance_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT tr.task_id, tr.resource_id, tr.bundle_instance_id
    FROM %I.task_resources tr
    WHERE tr.task_id = $1
    ORDER BY tr.created_at ASC, tr.resource_id ASC
  ', schema_name);
  RETURN QUERY EXECUTE q USING task_id_param;
END;
$$;

DROP FUNCTION IF EXISTS public.get_resource_bundles_dynamic(text);
CREATE FUNCTION public.get_resource_bundles_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
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
  q := format('
    SELECT b.id, b.name, b.description, b.created_at, b.updated_at
    FROM %I.resource_bundles b
    ORDER BY b.name ASC
  ', schema_name);
  RETURN QUERY EXECUTE q;
END;
$$;

DROP FUNCTION IF EXISTS public.get_resource_bundle_items_dynamic(text, uuid);
CREATE FUNCTION public.get_resource_bundle_items_dynamic(schema_name text, bundle_id_param uuid)
RETURNS TABLE(
  bundle_id uuid,
  resource_id uuid,
  sort_order int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := format('
    SELECT bi.bundle_id, bi.resource_id, bi.sort_order
    FROM %I.resource_bundle_items bi
    WHERE bi.bundle_id = $1
    ORDER BY bi.sort_order ASC, bi.resource_id ASC
  ', schema_name);
  RETURN QUERY EXECUTE q USING bundle_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_resources_dynamic(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_events_resources_bulk(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_resources_dynamic(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resource_bundles_dynamic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resource_bundle_items_dynamic(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
