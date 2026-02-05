import { redirect } from "next/navigation";
import { getTeamManagementContext } from "@/lib/auth/resolve-role";
import { SettingsUsersContent } from "@/components/settings/SettingsUsersContent";

/**
 * Settings → Users: team management for the current tenant site.
 * Only tenant admins (or superadmin) can access; others are redirected.
 */
export default async function SettingsUsersPage() {
  const context = await getTeamManagementContext();
  if (!context.canManage) {
    redirect("/admin/settings");
  }
  return (
    <SettingsUsersContent
      isOwner={context.isOwner}
      isSuperadmin={context.isSuperadmin}
    />
  );
}
