-- File: 167_project_roles_taxonomy_section.sql
-- Project members plan: add Project Roles as core taxonomy section for member role picker (e.g. Designer, Developer, Stakeholder).
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- 1. Add Project Roles section (staple; not deletable)
INSERT INTO website_cms_template_dev.section_taxonomy_config (
  section_name,
  display_name,
  content_type,
  category_slugs,
  tag_slugs,
  is_staple
)
VALUES ('project_roles', 'Project roles', 'project_roles', NULL, NULL, true)
ON CONFLICT (section_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  content_type = EXCLUDED.content_type,
  is_staple = true,
  updated_at = NOW();

-- 2. Seed default role terms (category type; suggested_sections = project_roles)
INSERT INTO website_cms_template_dev.taxonomy_terms (name, slug, type, suggested_sections)
VALUES
  ('Project lead', 'project-lead', 'category', ARRAY['project_roles']),
  ('Contributor', 'contributor', 'category', ARRAY['project_roles']),
  ('Stakeholder', 'stakeholder', 'category', ARRAY['project_roles']),
  ('Designer', 'designer', 'category', ARRAY['project_roles']),
  ('Developer', 'developer', 'category', ARRAY['project_roles'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  suggested_sections = CASE
    WHEN NOT ('project_roles' = ANY(COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[])))
    THEN COALESCE(taxonomy_terms.suggested_sections, ARRAY[]::text[]) || ARRAY['project_roles']::text[]
    ELSE taxonomy_terms.suggested_sections
  END,
  updated_at = NOW();
