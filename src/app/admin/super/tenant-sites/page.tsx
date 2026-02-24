import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";

/**
 * D6: Tenant site list removed from nav. Current site is from schema only.
 * Redirect to Superadmin Dashboard.
 */
export default async function SuperadminTenantSitesPage() {
  const user = await getCurrentUser();
  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }
  redirect("/admin/super");
}
