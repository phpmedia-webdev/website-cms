import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";

/**
 * D6: No tenant site list/picker. Redirect to Superadmin Dashboard.
 * New site creation can be added to Dashboard when needed (e.g. when current site is null).
 */
export default async function NewTenantSitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");
  redirect("/admin/super");
}
