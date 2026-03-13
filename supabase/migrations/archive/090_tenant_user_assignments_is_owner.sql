-- File: 090_tenant_user_assignments_is_owner.sql
-- Owner flag: only superadmin may set is_owner. Owners cannot be removed by tenant admins; only superadmin can remove an Owner or change Owner status.

ALTER TABLE public.tenant_user_assignments
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenant_user_assignments.is_owner IS 'True only for tenant site owners. Only superadmin may set or clear. Owners can remove non-Owner admins; only superadmin can remove an Owner.';
