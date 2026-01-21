"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Check MFA requirements
      const redirect = searchParams.get("redirect") || "/admin/dashboard";
      
      // Check if user has enrolled factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      const hasFactors = factorsData?.all && factorsData.all.length > 0;
      
      // Check if user role requires 2FA
      const requires2FA = metadata.type === "superadmin" || 
                         (metadata.type === "admin" && redirect.includes("/admin/settings"));
      
      // If 2FA is required but no factors enrolled, redirect to enrollment
      if (requires2FA && !hasFactors) {
        router.push("/admin/mfa/enroll");
        return;
      }
      
      // If factors are enrolled, check current AAL
      // Middleware will handle redirecting to challenge if aal2 is required
      // For now, just redirect to intended destination
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
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
