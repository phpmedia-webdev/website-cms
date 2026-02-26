"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const supabase = getSupabaseClient();

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [diagnose, setDiagnose] = useState<{ success: boolean; status: number; reason: string; roleSlug?: string } | null>(null);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const resetSuccess = searchParams.get("reset") === "success";
  const reasonNoCentralRole = searchParams.get("reason") === "no_central_role";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/admin/login");
    } finally {
      setSigningOut(false);
    }
  };

  const handleCheckWhy = async () => {
    setDiagnoseLoading(true);
    setDiagnose(null);
    try {
      const res = await fetch("/api/auth/validate-user-diagnose", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setDiagnose({
        success: json.success === true,
        status: json.status ?? 0,
        reason: json.reason ?? "Unknown",
        roleSlug: json.roleSlug,
      });
    } finally {
      setDiagnoseLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      if (!authData.user || !authData.session) {
        setError("Authentication failed - no session created");
        setLoading(false);
        return;
      }

      // Validate user has proper metadata
      const metadata = authData.user.user_metadata;
      if (!metadata || !metadata.type) {
        setError("User account missing required metadata. Please contact administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Check if user is admin type (superadmin or admin)
      if (metadata.type !== "superadmin" && metadata.type !== "admin") {
        setError("Access denied: Admin access required");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Verify session was set before redirecting
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        setError("Session error. Please try again.");
        setLoading(false);
        return;
      }

      const redirect = searchParams.get("redirect") || "/admin/dashboard";

      // Only superadmin must have 2FA; tenant admins have optional 2FA
      const isSuperadmin = metadata.type === "superadmin" && metadata.role === "superadmin";
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const hasFactors = factorsData?.all && factorsData.all.length > 0;

      if (isSuperadmin && !hasFactors) {
        router.push("/admin/mfa/enroll");
        return;
      }

      // Wait for the Supabase client to persist the session to cookies before navigating.
      // Otherwise the next request (middleware) can receive the old or no session and redirect back to login.
      await new Promise((r) => setTimeout(r, 500));
      router.push(redirect);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the CMS</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {resetSuccess && (
              <div className="text-sm text-green-600 dark:text-green-400">
                Password updated. You can sign in with your new password.
              </div>
            )}
            {reasonNoCentralRole && (
              <div className="text-sm text-amber-600 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <p>You’re signed in, but your access couldn’t be verified with the central auth service. Check that your account is in this app’s organization in PHP-Auth (same org as AUTH_ORG_ID), that AUTH_BASE_URL is reachable from this server, and try again. You can sign out and retry after your admin adds you to the org.</p>
                <p className="text-muted-foreground">Operators: see <code className="text-xs bg-muted px-1 rounded">docs/reference/validate-user-troubleshooting.md</code> for the full checklist, curl test, and PHP-Auth audit log steps.</p>
                <div>
                  <button
                    type="button"
                    onClick={handleCheckWhy}
                    disabled={diagnoseLoading}
                    className="text-xs underline hover:no-underline disabled:opacity-50"
                  >
                    {diagnoseLoading ? "Checking…" : "Check why (diagnose)"}
                  </button>
                  {diagnose && (
                    <div className="mt-2 text-xs rounded p-2 bg-background/80 border border-amber-200 dark:border-amber-800">
                      <p className="font-medium">HTTP {diagnose.status}</p>
                      <p className="text-muted-foreground mt-1">{diagnose.reason}</p>
                      {diagnose.roleSlug && <p className="mt-1 text-green-600 dark:text-green-400">Role: {diagnose.roleSlug}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/admin/login/forgot" className="underline hover:text-foreground">
                Forgot password?
              </Link>
              <Link href="/admin/login/recover" className="underline hover:text-foreground">
                Recover MFA (superadmin)
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="underline hover:text-foreground disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
