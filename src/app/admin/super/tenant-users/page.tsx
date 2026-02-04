import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { TenantUsersTableClient } from "./TenantUsersTableClient";

/**
 * Superadmin Tenant Users: master list of all users across tenant sites.
 * Only accessible to superadmin.
 */
export default async function SuperadminTenantUsersPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Users</h1>
        <p className="text-muted-foreground mt-2">
          Master list of all admin and team members across tenant sites. Add users from Tenant Sites → [Site] → Add user, or assign existing users to more sites.
        </p>
      </div>

      <TenantUsersTableClient />
    </div>
  );
}
