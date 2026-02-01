"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const supabase = getSupabaseClient();

export default function MemberLoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const type = (session.user.user_metadata as { type?: string })?.type;
        if (type === "member") {
          window.location.replace(redirect);
        } else if (type === "superadmin" || type === "admin") {
          window.location.replace("/admin/dashboard");
        }
      }
    });
  }, [redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
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
        setError("Authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      const metadata = authData.user.user_metadata as { type?: string } | undefined;
      const userType = metadata?.type;

      // Admin users go to admin area
      if (userType === "superadmin" || userType === "admin") {
        window.location.replace("/admin/dashboard");
        return;
      }

      // Member users
      if (userType === "member") {
        window.location.replace(redirect);
        return;
      }

      // No type or unknown: sign out and show error
      if (!userType) {
        setError("Account is not set up for member access. Please contact support.");
        await supabase.auth.signOut();
      } else {
        setError("This login is for members only. Admins should use the admin login.");
        await supabase.auth.signOut();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to access member-only content
          </CardDescription>
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
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Need an account?{" "}
            <Link href="/" className="underline hover:text-foreground">
              Contact us
            </Link>{" "}
            to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
