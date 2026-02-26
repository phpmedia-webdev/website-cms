import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { TenantUsersTableClient } from "./TenantUsersTableClient";

/**
 * Superadmin Tenant Users: master list of all users across tenant sites.
 * Only accessible to superadmin.
 */
export default async function SuperadminTenantUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Users</h1>
        <p className="text-muted-foreground mt-2">
          Master list of all admin and team members across tenant sites. Add users from Dashboard → current site → Related Tenant Users → Add user, or assign existing users to more sites.
        </p>
      </div>

      <TenantUsersTableClient />
    </div>
  );
}
