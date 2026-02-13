"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Shield, CheckCircle2, XCircle, Copy, Loader2 } from "lucide-react";

const supabase = getSupabaseClient();

interface TOTPEnrollment {
  qr_code: string;
  secret: string;
  uri: string;
  factorId?: string; // Factor ID from enrollment response
}

export default function MFAEnroll() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "enroll" | "verify" | "success" | "error">("loading");
  const [enrollment, setEnrollment] = useState<TOTPEnrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [friendlyName, setFriendlyName] = useState("Authenticator App");
  const [existingFactors, setExistingFactors] = useState<any[]>([]);

  // Check for existing factors and start enrollment on mount
  useEffect(() => {
    checkExistingFactors();
  }, []);

  const checkExistingFactors = async () => {
    try {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error("Error checking existing factors:", factorsError);
        // Continue with enrollment attempt anyway
        startEnrollment();
        return;
      }

      const factors = data?.all || [];
      setExistingFactors(factors);

      // Unverified factors block enrollment — user must remove them first (or we remove via button)
      const unverifiedFactors = factors.filter((f: any) => f.status === "unverified");
      if (unverifiedFactors.length > 0) {
        setError(`You have ${unverifiedFactors.length} unverified factor(s) that need to be removed before enrolling a new one. Please go to Security to remove them, or click the button below to remove them automatically.`);
        setExistingFactors(unverifiedFactors);
        setStep("error");
        setLoading(false);
        return;
      }

      // User may already have verified factors (adding another) — proceed to enrollment with unique name
      // Get user email for better naming
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "";
      const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Website CMS";
      
      // Generate a unique friendly name
      const existingNames = factors.map((f: any) => f.friendly_name || "").filter(Boolean);
      let baseName = userEmail ? `${siteName} - ${userEmail}` : siteName;
      let newName = baseName;
      let counter = 1;
      while (existingNames.includes(newName)) {
        newName = `${baseName} ${counter}`;
        counter++;
      }
      setFriendlyName(newName);

      // Start enrollment with unique name
      startEnrollment(newName);
    } catch (err: any) {
      console.error("Error checking factors:", err);
      // Continue with enrollment attempt
      startEnrollment();
    }
  };

  const startEnrollment = async (customName?: string) => {
    setLoading(true);
    setError("");

    try {
      // First, check for existing factors to ensure unique friendly name
      const { data: factorsData, error: listError } = await supabase.auth.mfa.listFactors();
      const allExistingFactors = factorsData?.all || [];
      const existingNames = allExistingFactors.map((f: any) => f.friendly_name || "").filter(Boolean);

      // Get current user email for better naming
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "Account";
      const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Website CMS";
      
      // Create a friendly name that will appear in authenticator apps
      // Format: "Site Name - user@email.com" or just "Site Name" if no email
      let baseName = customName || (userEmail ? `${siteName} - ${userEmail}` : siteName);
      
      // Ensure the name is unique by appending a number if needed
      let nameToUse = baseName;
      let counter = 1;
      while (existingNames.includes(nameToUse)) {
        nameToUse = `${baseName} ${counter}`;
        counter++;
      }
      
      // Start TOTP enrollment with issuer parameter
      // The issuer appears as the service name in Google Authenticator (e.g., "Website CMS")
      // The friendlyName appears as the account identifier (e.g., "Website CMS - user@email.com")
      // Supabase returns: { id, type, friendly_name, totp: { qr_code, secret, uri } }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: nameToUse,
        issuer: siteName, // This will appear as the service name in Google Authenticator
      });

      if (enrollError) {
        console.error("MFA Enrollment Error:", enrollError);
        // Provide more helpful error messages
        if (enrollError.message?.includes("MFA is not enabled")) {
          setError("Two-factor authentication is not enabled in your Supabase project. Please enable it in the Supabase Dashboard under Authentication → MFA settings.");
        } else if (enrollError.message?.includes("factor already exists") || enrollError.message?.includes("friendly name")) {
          // Try with a different name
          const newName = `${nameToUse} ${Date.now().toString().slice(-4)}`;
          setFriendlyName(newName);
          setError(`A factor with that name already exists. Trying with name: "${newName}"`);
          // Retry with new name
          setTimeout(() => startEnrollment(newName), 1000);
          return;
        } else {
          setError(enrollError.message || "Failed to start enrollment. Please check the browser console for details.");
        }
        setStep("error");
        setLoading(false);
        return;
      }

      if (!data) {
        console.error("No enrollment data returned from Supabase");
        setError("No enrollment data returned. Please check that MFA is enabled in your Supabase project.");
        setStep("error");
        setLoading(false);
        return;
      }

      // Supabase returns: { id, type, friendly_name, totp: { qr_code, secret, uri } }
      // The QR code and secret are nested in the totp object!
      const totpData = data.totp || {};

      // Store enrollment data including factor ID for verification
      if (!data.id) {
        console.error("Enrollment response missing factor ID:", data);
        setError("Enrollment response missing factor ID. Please check the browser console for details.");
        setStep("error");
        setLoading(false);
        return;
      }

      // Check if we have the TOTP data with QR code and secret
      if (!totpData.qr_code && !totpData.secret) {
        console.error("Enrollment response missing QR code and secret in totp object:", { data, totpData });
        setError("Enrollment response missing QR code and secret. Please check the browser console for details.");
        setStep("error");
        setLoading(false);
        return;
      }

      setEnrollment({
        qr_code: totpData.qr_code || "",
        secret: totpData.secret || "",
        uri: totpData.uri || "",
        factorId: data.id, // Store factor ID for challenge/verify
      });
      
      
      setStep("enroll");
      setLoading(false);
    } catch (err: any) {
      console.error("Unexpected enrollment error:", err);
      setError(err.message || "Failed to start enrollment. Please check the browser console for details.");
      setStep("error");
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!enrollment || !enrollment.factorId) {
      setError("No enrollment data available");
      setLoading(false);
      return;
    }

    try {
      console.log("Starting verification with:", {
        factorId: enrollment.factorId,
        codeLength: verificationCode.length,
      });

      // Supabase MFA enrollment flow:
      // 1. enroll() returns factor with ID, QR code, secret
      // 2. challenge() with factor ID to get challenge ID
      // 3. verify() with challenge ID and TOTP code
      
      // Step 2: Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });

      if (challengeError) {
        setError(challengeError.message || "Failed to create challenge");
        setLoading(false);
        return;
      }

      if (!challengeData?.id) {
        setError("No challenge ID returned. Please try again.");
        setLoading(false);
        return;
      }

      // Step 3: Verify the code
      // IMPORTANT: verify() requires BOTH factorId and challengeId
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid verification code. Please try again.");
        setLoading(false);
        // Clear code on error
        setVerificationCode("");
        return;
      }

      // Success! Factor is now verified and enrolled
      setStep("success");
      setLoading(false);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = enrollment.secret;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === "loading") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Setting up two-factor authentication...</p>
        </CardContent>
      </Card>
    );
  }

  const removeUnverifiedFactors = async () => {
    setLoading(true);
    setError("");
    
    try {
      const unverifiedFactors = existingFactors.filter((f: any) => f.status === "unverified");
      
      for (const factor of unverifiedFactors) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });
        
        if (unenrollError) {
          console.error(`Error removing factor ${factor.id}:`, unenrollError);
        }
      }
      
      // Reload factors and retry enrollment
      setStep("loading");
      await checkExistingFactors();
    } catch (err: any) {
      setError(err.message || "Failed to remove unverified factors");
      setLoading(false);
    }
  };

  if (step === "error") {
    const hasVerifiedFactors = existingFactors.filter((f: any) => f.status === "verified").length > 0;
    const hasUnverifiedFactors = existingFactors.filter((f: any) => f.status === "unverified").length > 0;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Enrollment Error
          </CardTitle>
          <CardDescription>There was an error setting up two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-destructive">{error}</div>
          <div className="flex gap-2">
            {hasUnverifiedFactors ? (
              <>
                <Button 
                  onClick={removeUnverifiedFactors}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove Unverified Factors & Retry"
                  )}
                </Button>
                <Button 
                  onClick={() => router.push("/admin/settings/security")} 
                  variant="outline"
                  className="flex-1"
                >
                  Go to Security Settings
                </Button>
              </>
            ) : hasVerifiedFactors ? (
              <Button 
                onClick={() => router.push("/admin/settings/security")} 
                className="w-full"
              >
                Go to Security Settings
              </Button>
            ) : (
              <Button onClick={() => {
                setStep("loading");
                checkExistingFactors();
              }} className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Try Again"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "success") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication Enabled</h2>
          <p className="text-muted-foreground mb-4">
            Your account is now protected with two-factor authentication.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Set Up Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app to enable two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        {enrollment?.qr_code ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-border">
              <img
                src={enrollment.qr_code}
                alt="TOTP QR Code"
                className="w-64 h-64"
                onError={(e) => {
                  console.error("QR Code image failed to load:", enrollment.qr_code);
                  console.error("Image error:", e);
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>QR code not available. Please try refreshing the page.</p>
          </div>
        )}

        {/* Manual Entry Secret */}
        {enrollment?.secret && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Or enter this code manually:</label>
            <div className="flex gap-2">
              <Input
                value={enrollment.secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copySecret}
                title="Copy secret"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Verification Step */}
        {step === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Enter verification code
              </label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("enroll")}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || verificationCode.length !== 6} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Initial Enroll Step */}
        {step === "enroll" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              After scanning the QR code, click Continue to verify your authenticator app is working correctly.
            </p>
            <Button
              onClick={() => setStep("verify")}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
