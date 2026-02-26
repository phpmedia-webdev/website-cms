import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getTenantSiteById } from "@/lib/supabase/tenant-sites";
import { TenantSiteSettingsClient } from "./TenantSiteSettingsClient";
import type { TenantSite } from "@/types/tenant-sites";

/**
 * Superadmin Tenant Site Settings: tabbed page (API, etc.). Site-specific.
 */
export default async function TenantSiteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const { id } = await params;
  const site = await getTenantSiteById(id);
  if (!site) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/super/tenant-sites/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {site.name}
        </Link>
        <h1 className="text-3xl font-bold mt-2">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Site-specific settings for {site.name}
        </p>
      </div>

      <TenantSiteSettingsClient site={site} />
    </div>
  );
}
