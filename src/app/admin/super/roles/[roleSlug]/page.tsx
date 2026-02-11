import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { RoleFeaturesEditor } from "@/components/superadmin/RolesManager";

type PageProps = { params: Promise<{ roleSlug: string }> };

/**
 * Superadmin role editor: configure features for a single role.
 * Only accessible to superadmin.
 */
export default async function SuperadminRoleEditorPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  const { roleSlug } = await params;

  return (
    <div className="space-y-6">
      <RoleFeaturesEditor roleSlug={roleSlug} />
    </div>
  );
}
