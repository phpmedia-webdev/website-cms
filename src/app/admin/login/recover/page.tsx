"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Loader2, XCircle } from "lucide-react";

const supabase = getSupabaseClient();

type Step = "email" | "code" | "recovering";

/**
 * MFA recovery for superadmins who lost their device.
 * 1. Enter email → Supabase sends 6-digit OTP (ensure Magic Link template includes {{ .Token }}).
 * 2. Enter OTP → verifyOtp creates session.
 * 3. POST /api/auth/mfa/recover removes all MFA factors (superadmin only).
 * 4. Redirect to enroll to add a new authenticator.
 */
export default function MFARecoverPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (otpError) {
        setError(otpError.message || "Failed to send code");
        setLoading(false);
        return;
      }
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    }
    setLoading(false);
  };

  const verifyAndRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.replace(/\D/g, "").slice(0, 6),
        type: "email",
      });
      if (verifyError) {
        setError(verifyError.message || "Invalid or expired code");
        setLoading(false);
        return;
      }
      if (!data.session) {
        setError("Verification did not create a session. Try again.");
        setLoading(false);
        return;
      }

      setStep("recovering");
      const res = await fetch("/api/auth/mfa/recover", {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((body.error as string) || "Recovery failed");
        setLoading(false);
        return;
      }

      router.push("/admin/mfa/enroll");
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recover MFA access
          </CardTitle>
          <CardDescription>
            For superadmins only. If you lost your authenticator device, we’ll send a one-time code to your email.
            After you enter it, all your MFA factors will be removed so you can add a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="recover-email" className="text-sm font-medium">
                  Superadmin email
                </label>
                <Input
                  id="recover-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send one-time code"
                )}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verifyAndRecover} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Check your inbox for a 6-digit code. Enter it below.
              </p>
              <div className="space-y-2">
                <label htmlFor="recover-code" className="text-sm font-medium">
                  Code
                </label>
                <Input
                  id="recover-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-widest"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("email")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || code.length !== 6}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify and remove MFA"
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === "recovering" && (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Removing MFA factors and redirecting…</p>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground pt-2">
            <Link href="/admin/login" className="underline hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
