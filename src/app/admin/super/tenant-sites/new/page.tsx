import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { AddTenantSiteForm } from "./AddTenantSiteForm";

/**
 * Superadmin: add new tenant site.
 */
export default async function NewTenantSitePage() {
  const user = await getCurrentUser();
  if (!user || !isSuperadmin(user)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/super/tenant-sites"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Tenant Sites
        </Link>
        <h1 className="text-3xl font-bold mt-2">Add Tenant Site</h1>
        <p className="text-muted-foreground mt-1">
          Register a new tenant/site. Schema name must match the Supabase schema for this deployment.
        </p>
      </div>

      <AddTenantSiteForm />
    </div>
  );
}
