import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getClientSchema } from "@/lib/supabase/schema";
import { getRolesForAssignmentFromPhpAuth } from "@/lib/php-auth/fetch-roles";
import { getViewAsFromCookies } from "@/lib/admin/view-as";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { ViewAsCard } from "@/components/superadmin/ViewAsCard";

/**
 * Superadmin Dashboard (D6). Current site from schema only; no site picker.
 * Only accessible to users with superadmin role (central role when PHP-Auth configured).
 */
export default async function SuperadminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const schema = getClientSchema();
  const [roles, currentSite] = await Promise.all([
    getRolesForAssignmentFromPhpAuth(),
    getTenantSiteBySchema(schema),
  ]);
  const cookieStore = await cookies();
  const viewAs = getViewAsFromCookies(cookieStore);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Current deployment and platform utilities. One site per deployment.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Site Status</CardTitle>
            <CardDescription>
              This deployment’s tenant site (from schema)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentSite ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-muted-foreground">Site Name:</span> {currentSite.name}</p>
                <p><span className="font-medium text-muted-foreground">Database Schema:</span> {currentSite.schema_name}</p>
                <p><span className="font-medium text-muted-foreground">URL:</span> {currentSite.deployment_url || "—"}</p>
                <p><span className="font-medium text-muted-foreground">Status:</span> {currentSite.status}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/admin/super/site-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Site Settings
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No site registered for schema <code className="rounded bg-muted px-1">{schema}</code>. Register this deployment in the database to manage features and settings.
              </p>
            )}
          </CardContent>
        </Card>
        <ViewAsCard currentSite={currentSite} roles={roles} initialViewAs={viewAs} />

        <Card>
          <CardHeader>
            <CardTitle>Diagnostics</CardTitle>
            <CardDescription>
              Effective role used for access (central when PHP-Auth configured); metadata for context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Current User:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">Role (effective):</span> {role ?? "N/A"}
              </div>
              <div>
                <span className="font-medium">User Type:</span>{" "}
                {role !== null
                  ? isSuperadminFromRole(role)
                    ? "superadmin"
                    : isAdminRole(role)
                      ? "admin"
                      : role
                  : user.metadata.type ?? "N/A"}
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
