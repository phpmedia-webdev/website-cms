import { redirect } from "next/navigation";
import { getCurrentUser, getAALFromSession } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { isPhpAuthConfigured } from "@/lib/php-auth/config";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { isDevModeBypassEnabled } from "@/lib/auth/mfa";
import { AuthTestClient } from "./AuthTestClient";

export const dynamic = "force-dynamic";

/**
 * Superadmin auth: Verify Session (tab 1) + API tests and Activity (tabs 2–3).
 * Verify session runs server-side; API tests and activity are client-side.
 */
export default async function AuthTestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const checks: { label: string; ok: boolean; detail?: string }[] = [];

  // 1. Session
  checks.push({ label: "Session", ok: !!user, detail: user ? user.email : undefined });

  // 2. MFA (AAL2)
  let aal: "aal1" | "aal2" | null = null;
  try {
    const supabase = await createServerSupabaseClientSSR();
    const { data: { session } } = await supabase.auth.getSession();
    aal = getAALFromSession(session as { access_token?: string; aal?: string } | null);
  } catch {
    aal = null;
  }
  const devBypass2FA = isDevModeBypassEnabled();
  const mfaOk = aal === "aal2";
  const mfaDetail =
    mfaOk
      ? "Verified"
      : devBypass2FA
        ? "Not verified (2FA bypass is on — middleware is not requiring MFA)"
        : aal === "aal1"
          ? "Not verified"
          : "Unknown";
  checks.push({ label: "MFA (AAL2)", ok: mfaOk, detail: mfaDetail });

  // 3. PHP-Auth role (when configured)
  const phpAuthConfigured = isPhpAuthConfigured();
  if (phpAuthConfigured) {
    let phpAuthRole: string | null = null;
    try {
      phpAuthRole = await getRoleForCurrentUser();
    } catch {
      phpAuthRole = null;
    }
    checks.push({
      label: "PHP-Auth role",
      ok: !!phpAuthRole,
      detail: phpAuthRole ?? "No role (validate-user failed or user not in org)",
    });
  }

  const allOk = checks.every((c) => c.ok);

  return (
    <AuthTestClient
      verifySession={{
        checks,
        allOk,
        phpAuthConfigured,
        devBypass2FA,
      }}
    />
  );
}
