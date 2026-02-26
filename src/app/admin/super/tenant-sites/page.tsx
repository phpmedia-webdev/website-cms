import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";

/**
 * D6: Tenant site list removed from nav. Current site is from schema only.
 * Redirect to Superadmin Dashboard.
 */
export default async function SuperadminTenantSitesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");
  redirect("/admin/super");
}
