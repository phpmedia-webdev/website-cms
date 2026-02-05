"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

const supabase = getSupabaseClient();

function MemberLoginContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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

      if (userType === "superadmin" || userType === "admin") {
        window.location.replace("/admin/dashboard");
        return;
      }

      if (userType === "member") {
        window.location.replace(redirect);
        return;
      }

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.error ?? "Password does not meet requirements.");
      setLoading(false);
      return;
    }

    try {
      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`
        : undefined;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { type: "member" },
          emailRedirectTo: redirectTo,
        },
      });

      if (authError) {
        setError(authError.message || "Sign up failed.");
        setLoading(false);
        return;
      }

      if (authData.session) {
        setSuccess("Account created. Redirecting…");
        // Ensure new member is in CRM with status "New" (for memberships)
        try {
          await fetch("/api/automations/on-member-signup", {
            method: "POST",
            credentials: "include",
          });
        } catch {
          // Non-blocking: CRM sync will also run on email confirm callback if needed
        }
        window.location.replace(redirect);
        return;
      }

      setSuccess("Check your email to confirm your account. Then sign in above.");
      setMode("signin");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === "signup" ? handleSignUp : handleSignIn;

  const handleResendConfirmation = async () => {
    const emailToResend = email.trim().toLowerCase();
    if (!emailToResend) {
      setResendMessage("Enter your email above first.");
      return;
    }
    setResendMessage(null);
    setResendLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: emailToResend,
      });
      if (resendError) {
        setResendMessage(resendError.message || "Resend failed.");
        return;
      }
      setResendMessage("Confirmation email sent. Check your inbox and spam.");
    } catch {
      setResendMessage("Could not resend. Try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "signup" ? "Create account" : "Sign In"}</CardTitle>
          <CardDescription>
            {mode === "signup"
              ? "Sign up to access member-only content"
              : "Sign in to access member-only content"}
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
                minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  At least {PASSWORD_MIN_LENGTH} characters. Avoid common passwords.
                </p>
              )}
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-600 dark:text-green-400">{success}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? mode === "signup"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign In"}
            </Button>
          </form>
          {mode === "signin" && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Didn&apos;t receive the confirmation email?{" "}
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="underline hover:text-foreground font-medium disabled:opacity-50"
              >
                {resendLoading ? "Sending…" : "Resend"}
              </button>
              {resendMessage && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  {resendMessage}
                </span>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setSuccess("");
                    setResendMessage(null);
                  }}
                  className="underline hover:text-foreground font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setSuccess("");
                  }}
                  className="underline hover:text-foreground font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemberLoginPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 max-w-md text-center text-muted-foreground">Loading...</div>}>
      <MemberLoginContent />
    </Suspense>
  );
}
