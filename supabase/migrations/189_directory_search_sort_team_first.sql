-- File: 189_directory_search_sort_team_first.sql
-- Directory RPC: order results team_member first, then crm_contact; within each group by display_label.
-- Replaces get_directory_search_dynamic body from 188. Run in Supabase SQL Editor after 188 (per project).

SET search_path TO public;

DROP FUNCTION IF EXISTS public.get_directory_search_dynamic(text, uuid, text, integer);

CREATE OR REPLACE FUNCTION public.get_directory_search_dynamic(
  schema_name text,
  tenant_site_id uuid,
  search_query text,
  result_limit integer
)
RETURNS TABLE(
  source_type text,
  source_id uuid,
  display_label text,
  subtitle text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
  lim int := GREATEST(1, LEAST(COALESCE(result_limit, 500), 5000));
  needle text := lower(trim(COALESCE(search_query, '')));
BEGIN
  q := format($sql$
    SELECT * FROM (
      SELECT
        x.source_type,
        x.source_id,
        x.display_label,
        x.subtitle
      FROM (
        SELECT
          'crm_contact'::text AS source_type,
          c.id AS source_id,
          COALESCE(
            NULLIF(trim(c.full_name), ''),
            NULLIF(trim(both ' ' FROM concat_ws(' ', c.first_name, c.last_name)), ''),
            c.email,
            'Contact'
          )::text AS display_label,
          COALESCE(c.email, '')::text AS subtitle
        FROM %I.crm_contacts c
        WHERE c.deleted_at IS NULL
          AND ($2 = ''
            OR strpos(
              lower(concat_ws(' ',
                coalesce(c.full_name, ''),
                coalesce(c.first_name, ''),
                coalesce(c.last_name, ''),
                coalesce(c.email, ''),
                coalesce(c.phone, '')
              )),
              $2
            ) > 0
          )
        UNION ALL
        SELECT
          'team_member'::text AS source_type,
          tu.user_id AS source_id,
          COALESCE(
            NULLIF(trim(p.display_name), ''),
            NULLIF(trim(tu.display_name), ''),
            tu.email,
            'Team member'
          )::text AS display_label,
          COALESCE(tu.email, '')::text AS subtitle
        FROM public.tenant_user_assignments tua
        INNER JOIN public.tenant_users tu ON tu.id = tua.admin_id
        LEFT JOIN public.profiles p ON p.user_id = tu.user_id
        WHERE ($1 IS NOT NULL AND tua.tenant_id = $1)
          AND COALESCE(tu.status, 'active') = 'active'
          AND ($2 = ''
            OR strpos(
              lower(concat_ws(' ',
                coalesce(p.display_name, ''),
                coalesce(tu.display_name, ''),
                coalesce(tu.email, '')
              )),
              $2
            ) > 0
          )
      ) x
      ORDER BY
        CASE WHEN x.source_type = 'team_member'::text THEN 0 ELSE 1 END,
        x.display_label ASC NULLS LAST,
        x.source_id ASC
      LIMIT $3
    ) z
  $sql$, schema_name);

  RETURN QUERY EXECUTE q USING tenant_site_id, needle, lim;
END;
$$;

COMMENT ON FUNCTION public.get_directory_search_dynamic(text, uuid, text, integer) IS
  'Directory picker: crm_contact + team_member for tenant schema/site. Sort: team_member first, then crm_contact; then display_label, source_id.';

GRANT EXECUTE ON FUNCTION public.get_directory_search_dynamic(text, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_directory_search_dynamic(text, uuid, text, integer) TO service_role;
