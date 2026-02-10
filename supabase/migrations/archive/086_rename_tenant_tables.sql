-- File: 086_rename_tenant_tables.sql
-- Rename client_tenants -> tenant_sites, client_admins -> tenant_users, client_admin_tenants -> tenant_user_assignments.
-- Run after 082, 084, 085. FKs in tenant_features and tenant_user_assignments follow the renamed tables automatically.

SET search_path TO public;

ALTER TABLE public.client_tenants RENAME TO tenant_sites;
ALTER TABLE public.client_admins RENAME TO tenant_users;
ALTER TABLE public.client_admin_tenants RENAME TO tenant_user_assignments;

COMMENT ON TABLE public.tenant_sites IS 'Superadmin: registry of tenant/site deployments (schema, URL, description).';
COMMENT ON TABLE public.tenant_users IS 'Tenant user identity; user_id links to auth.users. One row per person with tenant access.';
COMMENT ON TABLE public.tenant_user_assignments IS 'Assigns tenant users to tenant sites with a role (admin, editor, creator, viewer).';
