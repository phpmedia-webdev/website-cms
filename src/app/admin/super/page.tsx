import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { listTenantSites } from "@/lib/supabase/tenant-sites";
import { listRoles } from "@/lib/supabase/feature-registry";
import { getViewAsFromCookies } from "@/lib/admin/view-as";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewAsCard } from "@/components/superadmin/ViewAsCard";

/**
 * Superadmin system area - platform-wide utilities.
 * Only accessible to users with superadmin role.
 */
export default async function SuperadminPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  const [sites, roles] = await Promise.all([listTenantSites(), listRoles()]);
  const cookieStore = await cookies();
  const viewAs = getViewAsFromCookies(cookieStore);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Superadmin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Platform-wide utilities and cross-tenant management tools
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ViewAsCard sites={sites} roles={roles} initialViewAs={viewAs} />
        <Card>
          <CardHeader>
            <CardTitle>Tenant Management</CardTitle>
            <CardDescription>
              View and manage client schemas and deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tenant/schema lookup and management tools will be available here.
              This will integrate with the archive/restore system in a future phase.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnostics</CardTitle>
            <CardDescription>
              View authentication metadata and current tenant context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Current User:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">User Type:</span> {user.metadata.type}
              </div>
              <div>
                <span className="font-medium">Role:</span> {user.metadata.role || "N/A"}
              </div>
              <div>
                <span className="font-medium">Tenant ID:</span> {user.metadata.tenant_id || "N/A (Superadmin)"}
              </div>
              <div>
                <span className="font-medium">Allowed Schemas:</span>{" "}
                {user.metadata.allowed_schemas?.join(", ") || "All (*)"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archive & Restore</CardTitle>
            <CardDescription>
              Archive and restore client projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Archive/restore tooling shortcuts will be available here.
              This feature will be implemented in Phase 6.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
