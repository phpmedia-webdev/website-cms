import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { RolesManager } from "@/components/superadmin/RolesManager";

/**
 * Superadmin Roles: configure which features each role can access.
 * Only accessible to superadmin.
 */
export default async function SuperadminRolesPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles &amp; Features</h1>
        <p className="text-muted-foreground mt-2">
          Assign features to each role. Effective access for a user is the intersection of their role’s features and the tenant’s enabled features.
        </p>
      </div>

      <RolesManager />
    </div>
  );
}
