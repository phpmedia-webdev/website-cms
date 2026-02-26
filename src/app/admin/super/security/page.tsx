import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import MFAManagement from "@/components/auth/MFAManagement";

/**
 * Superadmin Security — manage authenticator (TOTP) MFA.
 * Only accessible to superadmin; tenant team users use My Profile for optional 2FA/OTP.
 */
export default async function SuperadminSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="text-muted-foreground mt-2">
          Manage your two-factor authentication (authenticator app). Required for superadmin access.
          You can remove and replace your authenticator here (e.g. after switching devices).
        </p>
      </div>
      <MFAManagement allowRemoveLastFactor={false} />
    </div>
  );
}
