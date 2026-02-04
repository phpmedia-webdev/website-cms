import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { listTenantSites } from "@/lib/supabase/tenant-sites";

/**
 * Superadmin Tenant Sites: list tenant/site registry.
 * Only accessible to superadmin.
 */
export default async function SuperadminTenantSitesPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  const sites = await listTenantSites();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Sites</h1>
          <p className="text-muted-foreground mt-2">
            Registry of tenant web apps: schema, URL, and description. Use for administering the ecosystem from any site.
          </p>
        </div>
        <Link
          href="/admin/super/tenant-sites/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90"
        >
          Add Tenant Site
        </Link>
      </div>

      <div className="rounded-md border">
        {sites.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            No tenant sites yet.{" "}
            <Link href="/admin/super/tenant-sites/new" className="text-primary hover:underline">
              Add your first tenant site
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Schema</th>
                <th className="text-left px-4 py-2 font-medium">URL</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Mode</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/super/tenant-sites/${t.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{t.schema_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {t.deployment_url || "—"}
                  </td>
                  <td className="px-4 py-2">{t.status}</td>
                  <td className="px-4 py-2">{t.site_mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
