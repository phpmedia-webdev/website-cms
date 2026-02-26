import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, getEffectiveFeatureSlugsForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { canAccessFeature } from "@/lib/admin/route-features";
import { hasEnrolledFactors } from "@/lib/auth/mfa";
import { ProfileSettingsContent } from "@/components/settings/ProfileSettingsContent";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  const role = await getRoleForCurrentUser();
  const userIsSuperadmin = isSuperadminFromRole(role);
  const effectiveSlugs = await getEffectiveFeatureSlugsForCurrentUser();
  const hasCrmAccess =
    effectiveSlugs === "all" || canAccessFeature(effectiveSlugs, "crm");
  const enrolledFactors = await hasEnrolledFactors();
  return (
    <ProfileSettingsContent
      isSuperadmin={userIsSuperadmin}
      hasCrmAccess={hasCrmAccess}
      hasEnrolledFactors={enrolledFactors}
    />
  );
}
