import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getRolesWithDetailsFromPhpAuth, buildFeatureOrPermissionTree } from "@/lib/php-auth/fetch-roles";
import { RoleDetailView } from "@/components/superadmin/RoleDetailView";
import { ChevronLeft } from "lucide-react";

type PageProps = { params: Promise<{ roleSlug: string }> };

/** Role data from PHP-Auth must be fresh; never cache this page. */
export const dynamic = "force-dynamic";

/**
 * Superadmin role detail: read-only view with Permissions and Features tabs.
 * Actual role modifications are done only in the PHP-Auth app.
 */
export default async function SuperadminRoleDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const { roleSlug } = await params;
  const roles = await getRolesWithDetailsFromPhpAuth();
  const role = roles.find((r) => r.slug === roleSlug);

  if (!role) {
    redirect("/admin/super/roles");
  }

  const featuresTree = buildFeatureOrPermissionTree(role.features);
  const permissionsTree = buildFeatureOrPermissionTree(role.permissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/super/roles"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Roles
        </Link>
        <h1 className="text-2xl font-bold truncate">Role: {role.label}</h1>
      </div>

      <RoleDetailView
        role={{
          id: role.id,
          name: role.name,
          slug: role.slug,
          label: role.label,
          featuresTree,
          permissionsTree,
        }}
      />
    </div>
  );
}
