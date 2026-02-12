"use client";

import { useState, useEffect } from "react";
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

/** Verify MFA via API so the server sets AAL2 session cookies on the response before we redirect. */
async function verifyMfaViaApi(
  factorId: string,
  challengeId: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ factorId, challengeId, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data.error as string) || res.statusText };
  }
  return { ok: true };
}

export default function MFAChallenge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loadingFactors, setLoadingFactors] = useState(true);

  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";

  // Load enrolled factors on mount
  useEffect(() => {
    loadFactors();
  }, []);

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
      const { data, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        setError(challengeError.message || "Failed to create challenge");
        return;
      }

      if (!data?.id) {
        setError("No challenge ID returned");
        return;
      }

      setChallengeId(data.id);
      setError(""); // Clear any previous errors
    } catch (err: any) {
      setError(err.message || "Failed to create challenge");
    }
  };

  const handleFactorChange = async (factorId: string) => {
    setSelectedFactorId(factorId);
    setCode(""); // Clear code when switching factors
    await createChallenge(factorId);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!challengeId) {
      setError("No challenge available. Please refresh the page.");
      setLoading(false);
      return;
    }

    if (!selectedFactorId) {
      setError("No factor selected. Please refresh the page.");
      setLoading(false);
      return;
    }

    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      setLoading(false);
      return;
    }

    try {
      // Verify via API so the server sets AAL2 session cookies on the response; then redirect.
      // This avoids the client-side verify race where cookies weren't persisted before redirect on Vercel.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Verification timed out. Please try again.")), 20000)
      );
      const result = await Promise.race([
        verifyMfaViaApi(selectedFactorId, challengeId, code),
        timeoutPromise,
      ]);

      if (!result.ok) {
        setError(result.error || "Invalid verification code. Please try again.");
        setLoading(false);
        setCode("");
        return;
      }

      // Success; response already set session cookies. Full page redirect so middleware sees them.
      window.location.replace(redirectTo);
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
      setLoading(false);
      setCode("");
    }
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

        {/* Code Input */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              required
              autoFocus
              disabled={!challengeId}
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
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
            disabled={loading || code.length !== 6 || !challengeId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Make sure your device time is synchronized</p>
          <p>• Codes expire after 30 seconds</p>
          <p>• If you&apos;re having trouble, try refreshing the page</p>
        </div>
      </CardContent>
    </Card>
  );
}
