-- File: 175_taxonomy_category_home_order.sql
-- Categories: home_section_name (single home taxonomy section), display_order (sibling order).
-- Backfill home from suggested_sections / section membership; rebuild category_slugs per section.
-- Run in Supabase SQL Editor.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.taxonomy_terms
  ADD COLUMN IF NOT EXISTS home_section_name TEXT;

ALTER TABLE website_cms_template_dev.taxonomy_terms
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN website_cms_template_dev.taxonomy_terms.home_section_name IS 'For type=category: single taxonomy section this category belongs to. Tags leave NULL.';
COMMENT ON COLUMN website_cms_template_dev.taxonomy_terms.display_order IS 'For categories: sort order among siblings (same parent_id) within home section.';

-- 1) Home from first suggested_sections entry
UPDATE website_cms_template_dev.taxonomy_terms t
SET home_section_name = (t.suggested_sections)[1]
WHERE t.type = 'category'
  AND t.suggested_sections IS NOT NULL
  AND cardinality(t.suggested_sections) >= 1
  AND (t.home_section_name IS NULL OR btrim(t.home_section_name) = '');

-- 2) Home from first section (by section_name) that lists this slug
UPDATE website_cms_template_dev.taxonomy_terms t
SET home_section_name = x.section_name
FROM (
  SELECT DISTINCT ON (t2.id)
    t2.id,
    s.section_name
  FROM website_cms_template_dev.taxonomy_terms t2
  INNER JOIN website_cms_template_dev.section_taxonomy_config s
    ON t2.slug = ANY (COALESCE(s.category_slugs, ARRAY[]::text[]))
  WHERE t2.type = 'category'
    AND (t2.home_section_name IS NULL OR btrim(t2.home_section_name) = '')
  ORDER BY t2.id, s.section_name
) x
WHERE t.id = x.id;

-- 3) Remaining categories without home: assign to lexicographically first section (review in UI if needed)
UPDATE website_cms_template_dev.taxonomy_terms t
SET home_section_name = (
  SELECT s.section_name
  FROM website_cms_template_dev.section_taxonomy_config s
  ORDER BY s.section_name
  LIMIT 1
)
WHERE t.type = 'category'
  AND (t.home_section_name IS NULL OR btrim(t.home_section_name) = '')
  AND EXISTS (SELECT 1 FROM website_cms_template_dev.section_taxonomy_config LIMIT 1);

-- 4) display_order: order by name within (parent_id, home_section_name)
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY COALESCE(parent_id::text, ''), COALESCE(home_section_name, '')
      ORDER BY name
    ) * 10) AS ord
  FROM website_cms_template_dev.taxonomy_terms
  WHERE type = 'category'
)
UPDATE website_cms_template_dev.taxonomy_terms t
SET display_order = r.ord
FROM ranked r
WHERE t.id = r.id;

-- 5) suggested_sections = single home for categories
UPDATE website_cms_template_dev.taxonomy_terms t
SET suggested_sections = ARRAY[t.home_section_name]
WHERE t.type = 'category'
  AND t.home_section_name IS NOT NULL
  AND btrim(t.home_section_name) <> '';

-- 6) Rebuild each section's category_slugs from categories whose home is that section
UPDATE website_cms_template_dev.section_taxonomy_config s
SET category_slugs = COALESCE(
  (
    SELECT ARRAY_AGG(c.slug ORDER BY c.display_order, c.name)
    FROM website_cms_template_dev.taxonomy_terms c
    WHERE c.type = 'category'
      AND c.home_section_name = s.section_name
  ),
  ARRAY[]::text[]
);

-- RPC: include home_section_name, display_order
DROP FUNCTION IF EXISTS public.get_taxonomy_terms_dynamic(text);

CREATE OR REPLACE FUNCTION public.get_taxonomy_terms_dynamic(schema_name text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  type text,
  parent_id uuid,
  description text,
  suggested_sections text[],
  color text,
  is_core boolean,
  home_section_name text,
  display_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_text text;
BEGIN
  query_text := format('
    SELECT
      t.id,
      t.name,
      t.slug,
      t.type,
      t.parent_id,
      t.description,
      t.suggested_sections,
      t.color,
      COALESCE(t.is_core, false),
      t.home_section_name,
      COALESCE(t.display_order, 0),
      t.created_at,
      t.updated_at
    FROM %I.taxonomy_terms t
    ORDER BY t.name ASC
  ', schema_name);

  RETURN QUERY EXECUTE query_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxonomy_terms_dynamic(text) TO anon, authenticated;
