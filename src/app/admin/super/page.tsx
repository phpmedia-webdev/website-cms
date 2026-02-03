import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Superadmin system area - platform-wide utilities.
 * Only accessible to users with superadmin role.
 */
export default async function SuperadminPage() {
  const user = await getCurrentUser();

  // Redirect if not superadmin
  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Superadmin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Platform-wide utilities and cross-tenant management tools
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Manage third-party integrations and head section scripts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure Google Analytics, VisitorTracking.com, and SimpleCommenter.com integrations.
            </p>
            <Link
              href="/admin/super/integrations"
              className="text-sm text-primary hover:underline"
            >
              Go to Integrations Settings →
            </Link>
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
