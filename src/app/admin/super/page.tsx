import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { listTenantSites, getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getClientSchema } from "@/lib/supabase/schema";
import { getRolesForAssignmentFromPhpAuth } from "@/lib/php-auth/fetch-roles";
import { getViewAsFromCookies } from "@/lib/admin/view-as";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewAsCard } from "@/components/superadmin/ViewAsCard";

/**
 * Superadmin Dashboard (D6). Current site from schema only; no site picker.
 * Only accessible to users with superadmin role.
 */
export default async function SuperadminPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  const schema = getClientSchema();
  const [sites, roles, currentSite] = await Promise.all([
    listTenantSites(),
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
            <CardTitle>Current site</CardTitle>
            <CardDescription>
              This deployment’s tenant site (from schema)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentSite ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-muted-foreground">Name:</span> {currentSite.name}</p>
                <p><span className="font-medium text-muted-foreground">Schema:</span> {currentSite.schema_name}</p>
                <p><span className="font-medium text-muted-foreground">URL:</span> {currentSite.deployment_url || "—"}</p>
                <p><span className="font-medium text-muted-foreground">Status:</span> {currentSite.status}</p>
                <Link
                  href={`/admin/super/tenant-sites/${currentSite.id}`}
                  className="inline-block mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Site settings & gating →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No site registered for schema <code className="rounded bg-muted px-1">{schema}</code>. Register this deployment in the database to manage features and settings.
              </p>
            )}
          </CardContent>
        </Card>
        <ViewAsCard sites={sites} roles={roles} initialViewAs={viewAs} />

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
