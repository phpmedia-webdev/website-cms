import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { IntegrationsManager } from "@/components/superadmin/IntegrationsManager";

/**
 * Superadmin integrations management page.
 * Only accessible to users with superadmin role.
 * Requires 2FA (aal2) - will be enforced when 2FA is implemented.
 */
export default async function IntegrationsPage() {
  const user = await getCurrentUser();

  // Redirect if not superadmin
  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  // TODO: Add 2FA check (aal2) when 2FA is implemented
  // if (user.metadata.role === "superadmin" && aal !== "aal2") {
  //   redirect("/admin/mfa/challenge");
  // }

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
