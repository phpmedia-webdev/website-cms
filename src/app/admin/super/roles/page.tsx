import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { RolesList } from "@/components/superadmin/RolesList";

/**
 * Superadmin Roles: list roles; click a role to edit its features.
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
          Select a role to assign features. Effective access for a user is the intersection of their role’s features and the tenant’s enabled features.
        </p>
      </div>

      <RolesList />
    </div>
  );
}
