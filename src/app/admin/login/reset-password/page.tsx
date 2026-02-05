"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  validatePassword,
  normalizePassword,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

const supabase = getSupabaseClient();

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  // After redirect from email link, Supabase may set session from URL hash shortly after load
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted && session) {
        setSessionReady(true);
        return;
      }
      // Give client a moment to process hash (e.g. recovery redirect)
      await new Promise((r) => setTimeout(r, 300));
      const {
        data: { session: session2 },
      } = await supabase.auth.getSession();
      if (mounted) setSessionReady(!!session2);
    };
    check();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const result = validatePassword(newPassword);
    if (!result.valid) {
      setError(result.error ?? "Invalid password.");
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizePassword(newPassword);
      const { error: updateError } = await supabase.auth.updateUser({ password: normalized });
      if (updateError) {
        setError(updateError.message ?? "Failed to set password.");
        setLoading(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace("/admin/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (sessionReady === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionReady === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid or expired link</CardTitle>
            <CardDescription>
              This reset link may have expired or already been used. Request a new link from the
              sign-in page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/login/forgot">
              <Button className="w-full">Request new reset link</Button>
            </Link>
            <p className="text-center text-sm text-muted-foreground mt-4">
              <Link href="/admin/login" className="underline hover:text-foreground">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Choose a new password. Use at least {PASSWORD_MIN_LENGTH} characters; avoid common or
            easily guessed passwords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new_password" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Set password"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/admin/login" className="underline hover:text-foreground">
                Back to sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
