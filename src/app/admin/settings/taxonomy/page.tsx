import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { TaxonomySettings } from "@/components/settings/TaxonomySettings";

export default async function TaxonomySettingsPage() {
  const role = await getRoleForCurrentUser();
  const isSuperadmin = isSuperadminFromRole(role);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Taxonomy</h1>
        <p className="text-muted-foreground mt-2">
          Manage Taxonomy sections. Assign categories and tags to sections for organizing content
        </p>
      </div>
      <TaxonomySettings isSuperadmin={isSuperadmin} />
    </div>
  );
}
