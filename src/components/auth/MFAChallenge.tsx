"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

const VERIFY_API = "/api/auth/mfa/verify";

/** Create MFA challenge via API so challenge and verify use same server IP (Supabase requirement). */
async function createChallengeViaApi(
  factorId: string
): Promise<{ challengeId: string | null; error?: string }> {
  const res = await fetch("/api/auth/mfa/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ factorId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { challengeId: null, error: (data.error as string) || res.statusText };
  }
  return { challengeId: (data.challengeId as string) ?? null, error: undefined };
}

export default function MFAChallenge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [factors, setFactors] = useState<any[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [refreshingChallenge, setRefreshingChallenge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";
  const verifyAction = `${VERIFY_API}?redirect=${encodeURIComponent(redirectTo)}`;

  // Load enrolled factors on mount
  useEffect(() => {
    loadFactors();
  }, []);

  // Show error when redirected back from verify API or middleware (AAL not seen)
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "invalid") setError("Invalid code. Check the 6 digits and try again, or click \"Get new challenge\" first.");
    if (err === "missing") setError("Missing code or session. Please try again.");
    if (err === "expired") setError("Challenge expired. Click \"Get new challenge\" below, then enter your current code.");
    if (err === "server") setError("Something went wrong. Please try again or contact support.");
    if (err === "session") setError("Your verification wasn't recognized. Please enter your code again.");
  }, [searchParams]);

  const loadFactors = async () => {
    setLoadingFactors(true);
    try {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError(factorsError.message);
        setLoadingFactors(false);
        return;
      }

      const enrolledFactors = (data?.all || []).filter(
        (f: any) => f.status === "verified"
      );

      if (enrolledFactors.length === 0) {
        // No factors, redirect to enrollment
        router.push("/admin/mfa/enroll");
        return;
      }

      setFactors(enrolledFactors);
      // Auto-select first factor and create challenge
      if (enrolledFactors.length > 0) {
        const firstFactor = enrolledFactors[0];
        setSelectedFactorId(firstFactor.id);
        await createChallenge(firstFactor.id);
      }
      setLoadingFactors(false);
    } catch (err: any) {
      setError(err.message || "Failed to load factors");
      setLoadingFactors(false);
    }
  };

  const createChallenge = async (factorId: string) => {
    try {
      const { challengeId: id, error: challengeError } = await createChallengeViaApi(factorId);

      if (challengeError) {
        setError(challengeError);
        return;
      }

      if (!id) {
        setError("No challenge ID returned");
        return;
      }

      setChallengeId(id);
      // Don't clear error here — we may have just landed from verify API with error=invalid
    } catch (err: any) {
      setError(err.message || "Failed to create challenge");
    }
  };

  const handleFactorChange = async (factorId: string) => {
    setSelectedFactorId(factorId);
    setCode("");
    setError(""); // Clear error when user switches factor (fresh attempt)
    await createChallenge(factorId);
  };

  const handleRefreshChallenge = async () => {
    if (!selectedFactorId) return;
    setRefreshingChallenge(true);
    setCode("");
    setError("");
    await createChallenge(selectedFactorId);
    setRefreshingChallenge(false);
  };

  if (loadingFactors) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading authenticator factors...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication Required
        </CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Factor Selection (if multiple factors) */}
        {factors.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select authenticator:</label>
            <select
              value={selectedFactorId || ""}
              onChange={(e) => handleFactorChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {factors.map((factor) => (
                <option key={factor.id} value={factor.id}>
                  {factor.friendly_name || "Authenticator App"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Server-side verify: form POST so the API sets AAL2 session cookies on the redirect (browser then has cookies the server reads). */}
        <form
          className="space-y-4"
          action={verifyAction}
          method="post"
          onSubmit={() => setSubmitting(true)}
        >
          <input type="hidden" name="factorId" value={selectedFactorId ?? ""} />
          <input type="hidden" name="challengeId" value={challengeId ?? ""} />
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              minLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              required
              autoFocus
              disabled={!challengeId}
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app. Codes change every 30 seconds; if this page has been open a while, click &quot;Get new challenge&quot; first.{" "}
              <button
                type="button"
                onClick={handleRefreshChallenge}
                disabled={refreshingChallenge || !selectedFactorId}
                className="underline hover:text-foreground disabled:opacity-50"
              >
                {refreshingChallenge ? "Refreshing…" : "Get new challenge"}
              </button>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={code.length !== 6 || !challengeId || !selectedFactorId || submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Enter the code quickly — codes expire every 30 seconds</p>
          <p>• Make sure your device time is synchronized</p>
          <p>• If you&apos;re having trouble, try refreshing the page</p>
          <p className="pt-2">
            <Link href="/admin/login/recover" className="underline hover:text-foreground">
              Lost your device? Recover MFA (superadmin)
            </Link>
          </p>
          <p className="pt-1">
            <Link href="/admin/dashboard" className="underline hover:text-foreground">
              Back to Dashboard
            </Link>
            {" · "}
            <Link href="/" className="underline hover:text-foreground">
              Home
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
