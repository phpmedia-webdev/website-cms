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
  const resetSuccess = searchParams.get("reset") === "success";

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

      // Middleware will redirect to MFA challenge if aal2 is required and not yet satisfied
      window.location.replace(redirect);
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
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2">
              <Link href="/admin/login/forgot" className="underline hover:text-foreground">
                Forgot password?
              </Link>
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
