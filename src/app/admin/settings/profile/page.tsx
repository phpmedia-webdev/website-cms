import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getEffectiveFeatureSlugsForCurrentUser } from "@/lib/auth/resolve-role";
import { canAccessFeature } from "@/lib/admin/route-features";
import { hasEnrolledFactors } from "@/lib/auth/mfa";
import { ProfileSettingsContent } from "@/components/settings/ProfileSettingsContent";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  const userIsSuperadmin = user ? isSuperadmin(user) : false;
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
