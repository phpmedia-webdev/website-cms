import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { RolesReadOnly } from "@/components/superadmin/RolesReadOnly";

/** Roles from PHP-Auth must be fresh; never cache this page. */
export const dynamic = "force-dynamic";

/**
 * Superadmin Roles: read-only list from PHP-Auth (M5).
 * Roles are created and managed in the PHP-Auth app; shown here for reference and used in user assignment.
 */
export default async function SuperadminRolesPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles</h1>
        <p className="text-muted-foreground mt-2">
          Roles are managed in the PHP-Auth app and shown here for reference. Use them when assigning users in Users or Settings → Users. Permissions and features per role are configured in PHP-Auth.
        </p>
      </div>

      <RolesReadOnly />
    </div>
  );
}
