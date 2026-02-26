import { redirect } from "next/navigation";
import { getCurrentUser, getAALFromSession } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { isPhpAuthConfigured } from "@/lib/php-auth/config";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { isDevModeBypassEnabled } from "@/lib/auth/mfa";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Superadmin auth check: verify session, MFA (AAL2), and PHP-Auth role.
 * Use this to confirm login + MFA + central auth without logging out.
 * Green "Good to go" when all checks pass.
 */
export default async function VerifySessionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const checks: { label: string; ok: boolean; detail?: string }[] = [];

  // 1. Session
  checks.push({ label: "Session", ok: !!user, detail: user ? user.email : undefined });

  // 2. MFA (AAL2) — read from JWT so it reflects actual level after MFA verify
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
  let phpAuthRole: string | null = null;
  const phpAuthConfigured = isPhpAuthConfigured();
  if (phpAuthConfigured) {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verify session</h1>
        <p className="text-muted-foreground mt-2">
          Confirms your session, MFA, and (when configured) central auth role. Use this to test auth without logging out.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold">Auth checks</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              {c.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div>
                <span className="font-medium">{c.label}</span>
                {c.detail != null && (
                  <span className="text-muted-foreground ml-2">{c.detail}</span>
                )}
              </div>
            </div>
          ))}

          {allOk ? (
            <div className="flex items-center gap-3 pt-4 border-t">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <p className="text-xl font-semibold text-green-700 dark:text-green-400">Good to go</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-4 border-t">
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
              <p className="text-xl font-semibold text-destructive">One or more checks failed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!phpAuthConfigured && (
        <p className="text-sm text-muted-foreground">
          PHP-Auth is not configured (AUTH_* env vars). Only session and MFA are checked.
        </p>
      )}

      {devBypass2FA && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          <strong>2FA bypass is on</strong> (NEXT_PUBLIC_DEV_BYPASS_2FA). Middleware is not requiring MFA, so you can access superadmin without completing the challenge. Turn it off to enforce MFA.
        </p>
      )}
    </div>
  );
}
