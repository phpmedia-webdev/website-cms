import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { IntegrationsManager } from "@/components/superadmin/IntegrationsManager";

/**
 * Superadmin integrations management page.
 * Only accessible to users with superadmin role.
 * 2FA (aal2) is enforced by middleware for /admin/super routes.
 */
export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Third-Party Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Configure analytics, tracking, and communication tools for all public pages
        </p>
      </div>

      <IntegrationsManager />
    </div>
  );
}
