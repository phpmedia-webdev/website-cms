import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";

/**
 * D6: No tenant site list/picker. Redirect to Superadmin Dashboard.
 * New site creation can be added to Dashboard when needed (e.g. when current site is null).
 */
export default async function NewTenantSitePage() {
  const user = await getCurrentUser();
  if (!user || !isSuperadmin(user)) redirect("/admin/dashboard");
  redirect("/admin/super");
}
